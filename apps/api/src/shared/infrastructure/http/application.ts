import { OperationsTelemetry } from '../operations/operations';
import { randomUUID } from 'node:crypto';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from '../../../app/app.module';
import { CONFIG, type RuntimeConfig } from '../config';
import { HttpErrorsFilter } from './errors';
export async function createApplication() {
  const app = await NestFactory.create(AppModule);
  const settings = app.get<RuntimeConfig>(CONFIG);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.use(helmet());
  app.use(cookieParser());
  app.use(
    (
      request: Request & { requestId: string },
      response: Response,
      next: NextFunction,
    ) => {
      request.requestId = randomUUID();
      response.setHeader('X-Request-Id', request.requestId);
      response.setHeader('Cache-Control', 'no-store');
      next();
    },
  );
  const telemetry = app.get(OperationsTelemetry);
  app.use(telemetry.middleware.bind(telemetry));
  app.enableCors({
    origin: settings.origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Protection'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpErrorsFilter());
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pettly API')
    .setDescription(
      'Pettly identity, authentication and business API. All operations use the /api prefix.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'accessToken',
    )
    .addCookieAuth(
      'pettly_refresh',
      { type: 'apiKey', in: 'cookie' },
      'refreshCookie',
    )
    .build();
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );
  if (settings.swagger)
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/openapi.json',
      swaggerOptions: { persistAuthorization: false },
    });
  return { app, settings, document };
}
