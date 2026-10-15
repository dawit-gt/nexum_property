import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  // Render sits behind a proxy: trust it so req.ip is the real client IP
  // (otherwise the rate limiter counts every user as one).
  app.set('trust proxy', 1);

  app.use(helmet());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Tolerate a trailing slash in FRONTEND_URL; CORS origins must match exactly.
  const frontendUrl = (config.get<string>('FRONTEND_URL') ?? '').replace(/\/+$/, '');
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nexum API')
      .setDescription('Property Management System — Free-First backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);

  logger.log(`Nexum backend listening on port ${port} (/api/v1)`);
  if (!isProduction) logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
