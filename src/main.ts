import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Servir la carpeta de comprobantes de forma pública
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Servir el frontend (tennis_pwa_prototype)
  app.useStaticAssets(join(process.cwd(), '..', 'tennis_pwa_prototype'), {
    prefix: '/',
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`✅ Backend Tenis escuchando en el puerto ${port}`);
  console.log(`🔒 CORS habilitado para: ${corsOrigin}`);
}
bootstrap();
