import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Every route is served under /api/v1 — matches the health endpoint path
  // referenced throughout the Master Plan (/api/v1/health).
  app.setGlobalPrefix('api/v1');

  // Backend validates every input independent of the frontend
  // (Master Plan Section 18) — this is where that's enforced globally.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // reject requests that send unknown properties
      transform: true, // auto-convert payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS: only the configured frontend origin, with credentials — never '*'
  // on an authenticated app (Master Plan Section 21).
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nexum API')
    .setDescription('Property Management System — Free-First backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);

  logger.log(`Nexum backend listening on http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
