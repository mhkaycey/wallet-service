import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

import { ApiKeyModule } from '../api-key/api-key.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { PaystackModule } from '../paystack/paystack.module';
import { FlexibleAuthGuard } from '../common/guards/guard';

@Module({
  imports: [PrismaModule, ApiKeyModule, AuthModule, PaystackModule],
  controllers: [WalletController],
  providers: [WalletService, FlexibleAuthGuard],
})
export class WalletModule {}
