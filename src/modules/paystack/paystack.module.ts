import { Module } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { PaystackWebhookController } from './paystack.webhook.controller';
import { PaystackWebhookService } from './paystack.webhook.service';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaystackWebhookController],
  providers: [PaystackService, PaystackWebhookService],
  exports: [PaystackService, PaystackWebhookService],
})
export class PaystackModule {}
