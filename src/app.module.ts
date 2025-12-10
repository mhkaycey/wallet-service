import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from './prisma/prisma.module';
import { PaystackModule } from './modules/paystack/paystack.module';
import authConfig from './config/authConfig';
import { AuthModule } from './modules/auth/auth.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [authConfig],
    }),

    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => {
        const authConfig = config.get('auth');
        return {
          secret: authConfig?.jwt?.secret || config.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn:
              authConfig?.jwt?.expiresIn ||
              config.get<string>('JWT_EXPIRATION') ||
              '1d',
          },
        };
      },
      inject: [ConfigService],
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        throttlers: [
          {
            ttl: 60000, // 60 seconds in milliseconds
            limit: 10,
          },
        ],
      }),
    }),

    PrismaModule,
    AuthModule,
    ApiKeyModule,
    WalletModule,
    PaystackModule,
  ],
})
export class AppModule {}
