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
import { Decimal } from '@prisma/client/runtime/client';
import { PaystackService } from './paystack.service';
import { PrismaService } from 'prisma/prisma.service';

@Controller('wallet/paystack')
export class PaystackWebhookController {
  constructor(
    private paystackService: PaystackService,
    private prisma: PrismaService,
  ) {}

  @Post('webhook')
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
      if (existing?.status === 'SUCCESS') {
        return res.json({ status: true });
      }

      await this.prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.update({
          where: { reference: ref },
          data: { status: 'SUCCESS' },
          include: { senderWallet: true, receiverWallet: true },
        });

        // Determine which wallet to update based on transaction type
        const walletId =
          transaction.type === 'DEPOSIT'
            ? transaction.receiverWalletId
            : transaction.senderWalletId;

        if (walletId) {
          await tx.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: new Decimal(transaction.amount) } },
          });
        }
      });
    }

    res.json({ status: true });
  }
}
