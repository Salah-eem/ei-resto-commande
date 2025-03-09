import { Controller, Post, Body, BadRequestException, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ✅ Paiement via Stripe
  @Post('stripe')
  async createStripePayment(@Body() body: any) {
    const { userId, cartItems, totalPrice } = body;
    if (!userId || !cartItems || !totalPrice) {
      throw new BadRequestException('Informations de paiement invalides');
    }
    return this.paymentService.processStripePayment(userId, cartItems, totalPrice);
  }

   // ✅ Webhook Stripe pour confirmer le paiement
   @Post('stripe/webhook')
   async stripeWebhook(@Req() req, @Res() res) {
     const sig = req.headers['stripe-signature'];
     const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
     
     if (!endpointSecret) {
       throw new Error('Stripe webhook secret is not defined');
     }
 
     try {
       const event = this.paymentService.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
       await this.paymentService.handleStripeWebhook(event);
       res.json({ received: true });
     } catch (err) {
       console.error('❌ Erreur Webhook:', err);
       res.status(400).send(`Webhook Error: ${err.message}`);
     }
   }

  // ✅ Paiement via PayPal
  @Post('paypal')
  async createPayPalPayment(@Body() body: any) {
    const { userId, cartItems, totalPrice } = body;
    if (!userId || !cartItems || !totalPrice) {
      throw new BadRequestException('Informations de paiement invalides');
    }
    return this.paymentService.processPayPalPayment(userId, cartItems, totalPrice);
  }

  // ✅ Capture du paiement PayPal
  @Post('paypal/capture')
  async capturePayPal(@Body() body) {
    const { orderId, userId } = body;
    return this.paymentService.capturePayPalPayment(orderId, userId);
  }

  @Post("cash")
  async processCashPayment(@Body() body: any) {
    const { userId, cartItems, totalAmount, orderType } = body;
    return this.paymentService.processCashPayment(userId, cartItems, totalAmount, orderType);
  } 

}
