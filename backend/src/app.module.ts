import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { IsEmailUniqueConstraint } from './user/validator/email-validator';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { CartModule } from './cart/cart.module';
import { PaymentModule } from './payment/payment.module';
import { OrderModule } from './order/order.module';
import { AddressModule } from './address/address.module';
import { DeliveryGateway } from './gateway/delivery.gateway';
import { RestaurantModule } from './restaurant/restaurant.module';
import { CommonModule } from './common/common.module';
import { ScheduleModule } from '@nestjs/schedule';
import { IngredientModule } from './ingredient/ingredient.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/guard/roles.guard';
import { JwtGuard } from './auth/guard/jwt.guard';
import { MailModule } from './mail/mail.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true
    }),
    MongooseModule.forRoot(process.env.DB_URI!),
    ScheduleModule.forRoot(),

    AuthModule,
    UserModule,
    ProductModule,
    CategoryModule,
    CartModule,
    PaymentModule,
    OrderModule,
    AddressModule,
    RestaurantModule,
    CommonModule,
    IngredientModule,
    MailModule,
    // --- Configuration globale du MailerModule ---
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',  // serveur SMTP de Gmail
        port: 587,
        secure: false,                          // true → port 465, false → port 587
        auth: {
          user: process.env.SMTP_USER,          // votre compte SMTP
          pass: process.env.SMTP_PASS,          // son mot de passe
        },
      },
      defaults: {
        from: '"Resto Commande" <no-reply@restocommande.com>',
      },
      template: {
        dir: join(__dirname, 'templates'),      // dossier où mettre les templates (optionnel)
        adapter: new HandlebarsAdapter(),       // adapter pour Handlebars (mais vous pouvez envoyer du simple HTML aussi)
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [],
  providers: [
    DeliveryGateway,
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
