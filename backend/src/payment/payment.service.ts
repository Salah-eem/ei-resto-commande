import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from 'src/schemas/cart.schema';
import {
  Order,
  OrderDocument,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from 'src/schemas/order.schema';
import { OrderService } from 'src/order/order.service';
import { CreateOrderDto } from 'src/order/dto/create-order.dto';
import { AddressDto } from 'src/address/dto/address.dto';
import { CustomerDto } from 'src/order/dto/create-order-by-employee.dto';
import { RestaurantService } from 'src/restaurant/restaurant.service';

@Injectable()
export class PaymentService {
  stripe: Stripe;
  private readonly STRIPE_SECRET_KEY = this.config.get('STRIPE_SECRET_KEY');
  readonly STRIPE_WEBHOOK_SECRET = this.config.get('STRIPE_WEBHOOK_SECRET');

  private readonly PAYPAL_CLIENT_ID = this.config.get('PAYPAL_CLIENT_ID');
  private readonly PAYPAL_SECRET = this.config.get('PAYPAL_SECRET');
  private readonly PAYPAL_MODE = this.config.get('PAYPAL_MODE');

  constructor(
    private config: ConfigService,
    private orderService: OrderService,
    private restaurantService: RestaurantService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) {
    this.stripe = new Stripe(this.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  // Créer un paiement Stripe
  async processStripePayment(
    userId: string,
    customer: CustomerDto,
    cartItems: any[],
    totalAmount: number,
    orderType: string,
    address: AddressDto,
  ) {
    const deliveryFee =
      orderType == OrderType.DELIVERY
        ? this.restaurantService.getRestaurant()!.deliveryFee
        : 0;
    // 1️⃣ Transforme vos items en line_items Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      cartItems.map((item) => ({
        price_data: {
          currency: 'eur',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));

    // 2️⃣ Si livraison, on ajoute les frais comme un item à part
    if (orderType === 'delivery' && deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Delivery Fee' },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    // 3️⃣ On crée la session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      metadata: {
        userId,
        orderType,
        customer: JSON.stringify(customer),
        address: JSON.stringify(address),
        deliveryFee: deliveryFee.toString(), // si besoin dans webhook
      },
      success_url: `http://localhost:3000/order-confirmation?success=true`,
      cancel_url: `http://localhost:3000/cart?canceled=true`,
    });

    return { sessionId: session.id };
  }

  // Gérer le Webhook Stripe après paiement
  async handleStripeWebhook(
    event: Stripe.Event,
    customer: CustomerDto,
    orderType: string,
    address: AddressDto,
  ) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata && session.metadata.userId) {
        const orderTypeEnum =
          orderType === 'delivery' ? OrderType.DELIVERY : OrderType.PICKUP;

        const createOrderDto: CreateOrderDto = {
          userId: session.metadata.userId,
          customer,
          orderType: orderTypeEnum,
          paymentMethod: PaymentMethod.CARD,
          paymentStatus: PaymentStatus.COMPLETED,
          deliveryAddress: address,
        };

        await this.orderService.createOrder(createOrderDto);
        await this.clearCart(session.metadata.userId);
      }
    }
  }

  // Capturer un paiement PayPal
  async processPayPalPayment(
    userId: string,
    cartItems: any[],
    totalAmount: number,
    orderType: string,
  ) {
    const auth = Buffer.from(
      `${this.PAYPAL_CLIENT_ID}:${this.PAYPAL_SECRET}`,
    ).toString('base64');

    // Obtenir un token PayPal
    const { data: tokenData } = await axios.post(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      'grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } },
    );
    const accessToken = tokenData.access_token;

    // Créer une commande PayPal
    const { data: orderData } = await axios.post(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [
          { amount: { currency_code: 'EUR', value: totalAmount.toFixed(2) } },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      approvalUrl: orderData.links.find((link) => link.rel === 'approve').href,
      orderType,
    };
  }

  // Capturer le paiement PayPal après confirmation
  async capturePayPalPayment(
    orderId: string,
    userId: string,
    customer: CustomerDto,
    orderType: string,
    address: AddressDto,
  ) {
    const auth = Buffer.from(
      `${this.PAYPAL_CLIENT_ID}:${this.PAYPAL_SECRET}`,
    ).toString('base64');

    const { data } = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (data.status === 'COMPLETED') {
      console.log('PayPal payment succeeded:', data);

      const orderTypeEnum =
        orderType === 'delivery' ? OrderType.DELIVERY : OrderType.PICKUP;

      const createOrderDto: CreateOrderDto = {
        userId,
        customer,
        orderType: orderTypeEnum,
        paymentMethod: PaymentMethod.PAYPAL,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: address,
      };

      await this.orderService.createOrder(createOrderDto);
      await this.clearCart(userId);

      return { success: true };
    } else {
      throw new BadRequestException('Erreur de paiement PayPal');
    }
  }

  // Mettre à jour la commande après paiement
  async updateOrderStatus(
    orderId: string,
    paymentStatus: string,
  ): Promise<Order> {
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      orderId,
      { paymentStatus },
      { new: true },
    );

    if (!updatedOrder) {
      throw new Error(`Order ${orderId} not found`);
    }

    return updatedOrder;
  }

  async processCashPayment(
    userId: string,
    customer: CustomerDto,
    orderType: string,
    address?: AddressDto,
  ) {
    const orderTypeEnum =
      orderType === 'delivery' ? OrderType.DELIVERY : OrderType.PICKUP;

    const createOrderDto: CreateOrderDto = {
      userId,
      customer,
      orderType: orderTypeEnum,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PENDING,
      deliveryAddress: address,
    };

    const newOrder = await this.orderService.createOrder(createOrderDto);
    await this.clearCart(userId); // Vider le panier après la commande

    return { success: true, orderId: newOrder._id };
  }

  // ✅ Vider le panier après paiement
  async clearCart(userId: string) {
    await this.cartModel.findOneAndUpdate({ userId }, { items: [] });
  }
}
