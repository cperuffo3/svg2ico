import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { CustomLoggerService } from './common/logging/index.js';

async function bootstrap() {
  // Create custom logger for bootstrap and NestJS internal logging
  const logger = new CustomLoggerService('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger, // Use custom logger for all NestJS internal logging
  });

  const port = process.env.PORT || 3000;
  const apiPrefix = 'api/v1';

  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // OpenAPI/Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Svg2ico API')
    .setDescription('NestJS + Prisma + PostgreSQL API')
    .setVersion('1.0')
    .addTag('Health', 'Health check endpoints')
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig);

  // Serve OpenAPI at /api/openapi (JSON at /api/openapi-json)
  // This is outside the /api/v1 prefix to avoid versioning the docs endpoint
  SwaggerModule.setup('api/openapi', app, openApiDocument);

  await app.listen(port);

  logger.log(`Application started on http://localhost:${port}/${apiPrefix}`);
  logger.log(`OpenAPI docs at http://localhost:${port}/api/openapi`);
}

bootstrap();
