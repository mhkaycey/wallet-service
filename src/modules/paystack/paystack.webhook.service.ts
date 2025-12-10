import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PaystackWebhookService {
  constructor(private prisma: PrismaService) {}

  async handleChargeSuccess(reference: string, amount: number) {
    // Check if transaction already exists and is successful
    const existing = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (existing?.status === TransactionStatus.SUCCESS) {
      return { status: true, alreadyProcessed: true };
    }

    // Process the transaction
    await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.update({
        where: { reference },
        data: { status: TransactionStatus.SUCCESS },
        include: { senderWallet: true, receiverWallet: true },
      });

      // Determine which wallet to update based on transaction type
      const walletId =
        transaction.type === 'DEPOSIT'
          ? transaction.receiverWalletId
          : transaction.senderWalletId;

      if (walletId) {
        // For webhooks from Paystack, we need to convert from kobo to base currency
        const amountToIncrement = new Decimal(amount / 100);

        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: amountToIncrement } },
        });
      }
    });

    return { status: true, alreadyProcessed: false };
  }

  async handleWebhookEvent(payload: any) {
    const { event, data } = payload;

    if (event !== 'charge.success') {
      return { status: true };
    }

    const { reference, amount, status } = data;

    // Find transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
      include: { receiverWallet: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Prevent double-credit (idempotency)
    if (transaction.status === TransactionStatus.SUCCESS) {
      return { status: true };
    }

    if (status === 'success') {
      return this.handleChargeSuccess(reference, amount);
    } else {
      // Handle failed transaction
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.FAILED },
      });
      return { status: true };
    }
  }
}
