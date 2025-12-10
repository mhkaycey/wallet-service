import { Module } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { PaystackWebhookController } from './paystack.webhook.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaystackWebhookController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaystackModule {}
