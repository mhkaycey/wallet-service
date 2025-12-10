import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { PaystackService } from '../paystack/paystack.service';
import { PaystackWebhookService } from '../paystack/paystack.webhook.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private webhookService: PaystackWebhookService,
  ) {}

  async initiateDeposit(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('User wallet not found');
    }

    const reference = this.generateReference();

    // Create pending transaction
    await this.prisma.transaction.create({
      data: {
        reference,
        type: TransactionType.DEPOSIT,
        amount: new Decimal(amount),
        status: TransactionStatus.PENDING,
        receiverWalletId: user.wallet.id,
      },
    });

    // Initialize Paystack transaction
    const paystackResponse = await this.paystackService.initializeTransaction(
      user.email,
      amount,
      reference,
    );

    return paystackResponse;
  }

  async handleWebhook(payload: any) {
    return this.webhookService.handleWebhookEvent(payload);
  }

  async getDepositStatus(reference: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      reference: transaction.reference,
      status: transaction.status.toLowerCase(),
      amount: transaction.amount.toNumber(),
    };
  }

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      balance: user.wallet.balance.toNumber(),
    };
  }

  async transfer(userId: string, walletNumber: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const senderUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!senderUser || !senderUser.wallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    const receiverWallet = await this.prisma.wallet.findUnique({
      where: { walletNumber },
    });

    if (!receiverWallet) {
      throw new NotFoundException('Receiver wallet not found');
    }

    if (senderUser.wallet.id === receiverWallet.id) {
      throw new BadRequestException('Cannot transfer to your own wallet');
    }

    if (senderUser.wallet.balance.toNumber() < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const reference = this.generateReference();

    // Execute transfer atomically
    await this.prisma.$transaction(async (tx) => {
      // Get current balances for debugging
      const senderBefore = await tx.wallet.findUnique({
        where: { id: senderUser.wallet!.id },
        select: { balance: true },
      });
      const receiverBefore = await tx.wallet.findUnique({
        where: { id: receiverWallet.id },
        select: { balance: true },
      });

      this.logger.log(
        `Transfer: ${amount} from ${senderUser.wallet?.id} to ${receiverWallet.id}`,
      );
      this.logger.log(
        `Before: Sender=${senderBefore?.balance?.toString()}, Receiver=${receiverBefore?.balance?.toString()}`,
      );

      // Deduct from sender
      await tx.wallet.update({
        where: { id: senderUser.wallet!.id },
        data: {
          balance: {
            decrement: new Decimal(amount),
          },
        },
      });

      // Add to receiver
      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: {
          balance: {
            increment: new Decimal(amount),
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          reference,
          type: TransactionType.TRANSFER,
          amount: new Decimal(amount),
          status: TransactionStatus.SUCCESS,
          senderWalletId: senderUser.wallet!.id,
          receiverWalletId: receiverWallet.id,
        },
      });

      // Verify balances after update
      const senderAfter = await tx.wallet.findUnique({
        where: { id: senderUser.wallet!.id },
        select: { balance: true },
      });
      const receiverAfter = await tx.wallet.findUnique({
        where: { id: receiverWallet.id },
        select: { balance: true },
      });

      this.logger.log(
        `After: Sender=${senderAfter?.balance?.toString()}, Receiver=${receiverAfter?.balance?.toString()}`,
      );
    });

    return {
      status: 'success',
      message: 'Transfer completed',
    };
  }

  async getTransactions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transactions.map((tx) => ({
      type: tx.type.toLowerCase(),
      amount: tx.amount.toNumber(),
      status: tx.status.toLowerCase(),
      createdAt: tx.createdAt,
    }));
  }

  private generateReference(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
