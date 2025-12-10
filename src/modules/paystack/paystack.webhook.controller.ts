import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  Res,
  RawBody,
} from '@nestjs/common';

import express from 'express';
import { TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PaystackService } from './paystack.service';
import { PrismaService } from 'prisma/prisma.service';

@ApiTags('Paystack Webhooks')
@Controller('wallet/paystack')
export class PaystackWebhookController {
  constructor(
    private paystackService: PaystackService,
    private prisma: PrismaService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Paystack webhook events' })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack webhook signature',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Req() req: any,
    @Res() res: express.Response,
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
  ) {
    if (!this.paystackService.verifyWebhookSignature(req.rawBody, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (body.event === 'charge.success') {
      const ref = body.data.reference;

      const existing = await this.prisma.transaction.findUnique({
        where: { reference: ref },
      });
      if (existing?.status === TransactionStatus.SUCCESS) {
        return res.json({ status: true });
      }

      await this.prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.update({
          where: { reference: ref },
          data: { status: TransactionStatus.SUCCESS },
          include: { senderWallet: true, receiverWallet: true },
        });

        // Determine which wallet to update based on transaction type
        const walletId =
          transaction.type === 'DEPOSIT'
            ? transaction.receiverWalletId
            : transaction.senderWalletId;

        if (walletId) {
          // For deposits, the amount in the transaction is already in base currency
          // For webhooks from Paystack, we need to convert from kobo to base currency
          const amountToIncrement =
            body.event === 'charge.success'
              ? new Decimal(body.data.amount / 100) // Convert from kobo
              : new Decimal(transaction.amount);

          await tx.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: amountToIncrement } },
          });
        }
      });
    }

    res.json({ status: true });
  }
}
