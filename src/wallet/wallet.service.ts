import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { PaystackService } from 'src/paystack/paystack.service';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
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
      // Update transaction and wallet balance atomically
      await this.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.SUCCESS },
        });

        await tx.wallet.update({
          where: { id: transaction.receiverWalletId! },
          data: {
            balance: {
              increment: new Decimal(amount / 100), // Convert from kobo
            },
          },
        });
      });
    } else {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.FAILED },
      });
    }

    return { status: true };
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
      // Deduct from sender
      await tx.wallet.update({
        where: { id: senderUser?.wallet?.id },
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
          senderWalletId: senderUser?.wallet?.id,
          receiverWalletId: receiverWallet.id,
        },
      });
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
