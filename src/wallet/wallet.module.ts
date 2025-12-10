import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

import { ApiKeyModule } from '../api-key/api-key.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { PaystackService } from 'src/paystack/paystack.service';

@Module({
  imports: [PrismaModule, ApiKeyModule, AuthModule],
  controllers: [WalletController],
  providers: [WalletService, PaystackService],
})
export class WalletModule {}
