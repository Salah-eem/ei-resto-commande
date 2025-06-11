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
  }));  // Activer CORS
  app.enableCors({
    origin: [
      'http://localhost:8081', // Dev delivery app
      'http://localhost:8082', // Dev delivery app (port alternatif)
      'http://localhost:8083', // Dev delivery app (port alternatif)
      /* home
      'http://192.168.1.36:8081', // Dev delivery app (IP locale)
      'http://192.168.1.36:8082', // Dev delivery app (IP locale, port alternatif)
      'http://192.168.1.36:8083', // Dev delivery app (IP locale, port alternatif)
      */
     'https://heavy-wolves-know.loca.lt', // Dev delivery app (tunnel localtunnel)
     // epfc
      'http://10.50.104.232:8081', // Dev delivery app (IP locale)
      'http://10.50.104.232:8082', // Dev delivery app (IP locale, port alternatif)
      'http://10.50.104.232:8083', // Dev delivery app (IP locale, port alternatif)
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
    await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
  console.log(
    'The app is runing on port : http://0.0.0.0:' +
      (process.env.PORT ?? 3001),
  );
}
bootstrap();
