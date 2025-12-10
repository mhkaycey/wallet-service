import { registerAs } from '@nestjs/config';

export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[] | boolean;
}

const parseCorsOrigins = (origins: string | undefined): string[] | boolean => {
  if (!origins) return true;
  if (origins === '*') return true;
  return origins.split(',').map((origin) => origin.trim());
};

export default registerAs<AppConfig>('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
}));
