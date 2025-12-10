import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config/appConfig';
import * as bodyParser from 'body-parser';
// import { ThrottlerGuard } from '@nestjs/throttler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const config = configService.get<AppConfig>('mini-auth');

  app.useLogger(logger);
  app.enableCors({
    origin: config?.corsOrigins ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'x-paystack-signature',
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  // app.useGlobalGuards(app.get(ThrottlerGuard));

  // Configure body parsers
  app.use(bodyParser.json({ limit: '10mb' }));

  // Raw body parser for webhook endpoint (for signature verification)
  app.use(
    '/wallet/paystack/webhook',
    bodyParser.raw({ type: 'application/json', limit: '10mb' }),
  );

  // Swagger
  const configSwagger = new DocumentBuilder()
    .setTitle('Wallet Service API')
    .setDescription('PayStack Wallet System – Stage 9')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'API-Key')
    .build();
  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config?.port ?? 3000;

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API docs available at: http://localhost:${port}/api/docs`);
}
void bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error(error);
  process.exit(1);
});
