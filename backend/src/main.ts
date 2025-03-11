import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';



async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);


  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }));

   // Activer CORS
  app.enableCors({
    origin: [
      'http://localhost:3000', // Dev
      'https://ei-resto-commande.vercel.app' // Production
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Méthodes HTTP autorisées
    credentials: true, // Autoriser les cookies et les en-têtes d'authentification
  });

  // Servir les fichiers statiques depuis le dossier public
  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.use(cookieParser()); // ✅ Utiliser le cookie-parser

 // Désactiver la conversion JSON pour le webhook Stripe puisque il attend un corps brut ( signature => chaîne de caractères)
  app.use('/payment/stripe/webhook', bodyParser.raw({ type: 'application/json' }));
  
  await app.listen(process.env.PORT ?? 3001);
  console.log(
    'The app is runing on port : http://localhost:' +
      (process.env.PORT ?? 3001),
  );
}
bootstrap();
