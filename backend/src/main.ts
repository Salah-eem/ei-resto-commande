import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);


  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }));

   // Activer CORS
  app.enableCors({
    origin: 'http://localhost:3000', // Autoriser uniquement ce domaine
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Méthodes HTTP autorisées
    credentials: true, // Autoriser les cookies et les en-têtes d'authentification
  });

  // Servir les fichiers statiques depuis le dossier public
  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.use(cookieParser()); // ✅ Utiliser le cookie-parser

  
  await app.listen(process.env.PORT ?? 3001);
  console.log(
    'The app is runing on port : http://localhost:' +
      (process.env.PORT ?? 3001),
  );
}
bootstrap();
