import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from 'src/schemas/cart.schema';
import { Order, OrderDocument } from 'src/schemas/order.schema';

@Injectable()
export class PaymentService {
  stripe: Stripe;
  private readonly STRIPE_SECRET_KEY = this.config.get('STRIPE_SECRET_KEY');
  private readonly PAYPAL_CLIENT_ID = this.config.get('PAYPAL_CLIENT_ID');
  private readonly PAYPAL_SECRET = this.config.get('PAYPAL_SECRET');
  private readonly STRIPE_WEBHOOK_SECRET = this.config.get('STRIPE_WEBHOOK_SECRET');

  constructor(
    private config: ConfigService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) {
    this.stripe = new Stripe(this.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
  }

  // ✅ Créer un paiement Stripe
  async processStripePayment(userId: string, cartItems: any[], totalPrice: number) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: cartItems.map((item) => ({
        price_data: {
          currency: 'eur',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      metadata: { userId },
      success_url: `http://localhost:3000/order-confirmation?success=true`,
      cancel_url: `http://localhost:3000/cart?canceled=true`,
    });

    return { sessionId: session.id };
  }

  // ✅ Gérer le Webhook Stripe après paiement
  async handleStripeWebhook(event: Stripe.Event) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('✅ Paiement confirmé pour la session:', session.id);

      // 🔄 Mettre à jour la commande en base de données
      await this.updateOrderStatus(session.id, 'paid');

      // 🧹 Nettoyer le panier après paiement
      if (session.metadata && session.metadata.userId) {
        await this.clearCart(session.metadata.userId);
      }
    }
  }

  // ✅ Capturer un paiement PayPal
  async processPayPalPayment(userId: string, cartItems: any[], totalPrice: number) {
    const auth = Buffer.from(`${this.PAYPAL_CLIENT_ID}:${this.PAYPAL_SECRET}`).toString('base64');

    // 1️⃣ Obtenir un token PayPal
    const { data: tokenData } = await axios.post(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      'grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } },
    );
    const accessToken = tokenData.access_token;

    // 2️⃣ Créer une commande PayPal
    const { data: orderData } = await axios.post(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'EUR', value: totalPrice.toFixed(2) } }],
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );

    return { approvalUrl: orderData.links.find((link) => link.rel === 'approve').href };
  }

  // ✅ Capturer le paiement PayPal après confirmation
  async capturePayPalPayment(orderId: string, userId: string) {
    const auth = Buffer.from(`${this.PAYPAL_CLIENT_ID}:${this.PAYPAL_SECRET}`).toString('base64');

    const { data } = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } },
    );

    if (data.status === 'COMPLETED') {
      console.log('✅ Paiement PayPal réussi:', data);
      await this.updateOrderStatus(orderId, 'paid');
      await this.clearCart(userId);
      return { success: true };
    } else {
      throw new BadRequestException('Erreur de paiement PayPal');
    }
  }

  // ✅ Mettre à jour la commande après paiement
  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    console.log(`🔄 Mise à jour de la commande ${orderId} avec le statut: ${status}`);

    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true },
    );

    if (!updatedOrder) {
      throw new Error(`❌ Commande ${orderId} non trouvée`);
    }

    return updatedOrder;
  }

  // ✅ Vider le panier après paiement
  async clearCart(userId: string): Promise<void> {
    console.log(`🧹 Suppression du panier de l'utilisateur ${userId}`);

    await this.cartModel.findOneAndUpdate(
      { userId },
      { items: [] }, // On vide simplement le tableau des articles
      { new: true },
    );
  }
}
