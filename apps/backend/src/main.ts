import 'reflect-metadata';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import express from 'express';
import type { Request, Response } from 'express';
import { mkdirSync } from 'fs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ActorContextInterceptor } from './common/interceptors/actor-context.interceptor';
import { RequestContextService } from './common/context/request-context.service';
import { DEV_UPLOADS_ROOT, StorageService } from './modules/storage/storage.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    cors: false,
    rawBody: true, // Moyasar webhook needs the raw bytes for HMAC verification
  });

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const corsOrigins = configService.get<string[]>('app.corsOrigins', []);
  const isProduction = configService.get<string>('app.nodeEnv') === 'production';

  // Dev-only S3 fallback. The PUT sink mirrors the S3 presigned-PUT endpoint
  // so the browser can upload binary bodies directly to our backend without
  // AWS credentials. The matching `/uploads/*` static mount is registered
  // LATER (after helmet) so CORP + CORS headers are applied to the response
  // — modern Chromium/Firefox won't render cross-origin <img> from a host
  // that doesn't send `Cross-Origin-Resource-Policy: cross-origin`.
  if (!isProduction) {
    mkdirSync(DEV_UPLOADS_ROOT, { recursive: true });
    const storageService = app.get(StorageService);

    app.use(
      '/storage/dev-upload',
      express.raw({ type: () => true, limit: '500mb' }),
    );
    const expressApp = app.getHttpAdapter().getInstance() as express.Express;
    expressApp.put('/storage/dev-upload/*', async (req: Request, res: Response) => {
      try {
        const objectKey = (req.params as Record<string, string>)['0'];
        const body = req.body as Buffer | undefined;
        if (!body || !Buffer.isBuffer(body) || body.length === 0) {
          res.status(400).json({ error: 'Empty or non-binary upload body' });
          return;
        }
        await storageService.saveDevUpload(objectKey, body);
        res.status(200).json({ ok: true, bytes: body.length });
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    });
  }

  app.setGlobalPrefix(apiPrefix, { exclude: ['/'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // CORS — in development we mirror back any Origin so browsers loading the
  // SPA from `localhost`, `127.0.0.1`, or any LAN IP (e.g. testing on a phone
  // at `http://192.168.1.125:5173`) all work without curating an allow-list.
  // In production we honour the explicit `CORS_ORIGINS` env list and also
  // accept any 192.168.x.x:5173 origin so on-prem demos work out-of-the-box.
  const lanRegex = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/;
  app.enableCors({
    origin: isProduction
      ? corsOrigins.length > 0
        ? [...corsOrigins, lanRegex]
        : [lanRegex]
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // Mount the dev uploads directory AFTER helmet + cors so the response gets
  // `Cross-Origin-Resource-Policy: cross-origin` (helmet) and `Access-Control-
  // Allow-Origin` (cors) — without these the SPA at :5173 can't render images
  // hosted on the API origin :3000. The explicit `setHeaders` is a belt-and-
  // braces guarantee even if middleware order is changed in future.
  if (!isProduction) {
    app.use(
      '/uploads',
      express.static(DEV_UPLOADS_ROOT, {
        fallthrough: false,
        setHeaders: (res) => {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
        },
      }),
    );
  }
  app.use(
    morgan(isProduction ? 'combined' : 'dev', {
      stream: { write: (msg: string) => logger.log(msg.trim(), 'HTTP') },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  const contextService = app.get(RequestContextService);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ActorContextInterceptor(contextService),
    new TransformInterceptor(),
  );

  app.enableShutdownHooks();

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Aqarat API')
      .setDescription('Real estate platform API for Saudi Arabia and the GCC.')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Authentication & session management')
      .addTag('users', 'User profiles and account management')
      .addTag('listings', 'Property listings')
      .addTag('search', 'Search & discovery')
      .addTag('inquiries', 'Lead capture')
      .addTag('messages', 'Messaging between users and agents')
      .addTag('notifications', 'In-app, email, push notifications')
      .addTag('analytics', 'Listing & agent analytics')
      .addTag('payments', 'Featured listings & subscriptions')
      .addTag('moderation', 'Listing moderation queue')
      .addTag('admin', 'Operator-only endpoints')
      .addTag('health', 'Liveness / readiness probes')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Aqarat API listening on http://0.0.0.0:${port}/${apiPrefix}`, 'Bootstrap');
  if (!isProduction) {
    Logger.log(`📖 Swagger UI:    http://localhost:${port}/${apiPrefix}/docs`, 'Bootstrap');
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
