import { Controller, Post, Body, BadRequestException, Req, Res, RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import Stripe from 'stripe';
import { AddressDto } from 'src/address/dto/address.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { CustomerDto } from 'src/order/dto/create-order-by-employee.dto';

@Public()
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ✅ Paiement via Stripe
  @Post('stripe')
  async createStripePayment(@Body() body: any) {
    const { userId, customer, cartItems, totalAmount, orderType, address } = body;
    if (!userId || !cartItems || !totalAmount || !orderType) {
      throw new BadRequestException('Informations de paiement invalidess');
    }

    return this.paymentService.processStripePayment(
      userId,
      customer as CustomerDto,
      cartItems,
      totalAmount,
      orderType,
      address as AddressDto
    );
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
       const object = event.data.object as Stripe.Checkout.Session;
       const orderType = object.metadata?.orderType || 'pickup';
       const address: AddressDto = object.metadata?.address
         ? JSON.parse(object.metadata.address)
         : undefined;
        const customer: CustomerDto = object.metadata?.customer
          ? JSON.parse(object.metadata.customer)
          : undefined;

       await this.paymentService.handleStripeWebhook(event, customer, orderType, address);
       res.json({ received: true });
     } catch (err) {
       console.error('❌ Erreur Webhook:', err);
       res.status(400).send(`Webhook Error: ${err.message}`);
     }
   }

  // ✅ Paiement via PayPal
  @Post('paypal')
  async createPayPalPayment(@Body() body: any) {
    const { userId, customer, cartItems, totalAmount, orderType } = body;
    if (!userId || !cartItems || !totalAmount || !orderType || !customer) {
      throw new BadRequestException('Informations de paiement invalidesp');
    }

    return this.paymentService.processPayPalPayment(
      userId,
      cartItems,
      totalAmount,
      orderType
    ); // L'adresse sera transmise séparément à la capture
  }

  // ✅ Capture du paiement PayPal
  @Post('paypal/capture')
  async capturePayPal(@Body() body: any) {
    const { orderId, userId, customer, orderType, address } = body;
    if (!orderId || !userId || !orderType || !customer) {
      throw new BadRequestException('Données de capture PayPal invalides');
    }

    return this.paymentService.capturePayPalPayment(
      orderId,
      userId,
      customer,
      orderType,
      address as AddressDto
    );
  }

  // ✅ Paiement en espèces
  @Post('cash')
  async processCashPayment(@Body() body: any) {
    const { userId, customer, orderType, address } = body;
    if (!userId || !orderType || !customer) {
      throw new BadRequestException('Données de paiement en espèces invalides');
    }

    return this.paymentService.processCashPayment(
      userId,
      customer,
      orderType,
      address as AddressDto
    );
  }
}
