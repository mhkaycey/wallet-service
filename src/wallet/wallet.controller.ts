import * as common from '@nestjs/common';
import { WalletService } from './wallet.service';
import type { Request } from 'express';

import { ApiTags, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FlexibleAuthGuard } from 'src/common/guards/guard';
import { DepositDto, TransferDto } from './dto/wallet.dto';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PaystackService } from 'src/paystack/paystack.service';

@ApiTags('Wallet')
@ApiBearerAuth() // For JWT
@ApiSecurity('api-key') // For API Key
@common.Controller('wallet')
export class WalletController {
  logger = new common.Logger(WalletController.name);
  constructor(
    private walletService: WalletService,
    private paystackService: PaystackService,
  ) {}

  @common.Post('deposit')
  @common.UseGuards(FlexibleAuthGuard)
  @Permissions('deposit')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deposit(
    @common.Req() req,
    dto: DepositDto,
    @common.Body('amount') amount: number,
  ) {
    return this.walletService.initiateDeposit(
      req.user.userId || req.user.id,
      amount,
    );
  }

  @common.Post('paystack/webhook')
  async paystackWebhook(
    @common.Req() req: common.RawBodyRequest<Request>,
    @common.Headers('x-paystack-signature') signature: string,
    @common.Body() body: any,
  ) {
    // Verify webhook signature
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);

    if (!signature) {
      throw new common.BadRequestException('Missing Paystack signature');
    }

    const isValid = this.paystackService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      throw new common.BadRequestException('Invalid webhook signature');
    }

    return this.walletService.handleWebhook(body);
  }

  @common.Post('transfer')
  @common.UseGuards(FlexibleAuthGuard)
  @Permissions('transfer')
  async transfer(
    @common.Req() req,
    dto: TransferDto,
    @common.Body()
    { wallet_number, amount }: { wallet_number: string; amount: number },
  ) {
    return this.walletService.transfer(
      req.user.userId || req.user.id,
      wallet_number,
      amount,
    );
  }

  @common.Get('balance')
  @common.UseGuards(FlexibleAuthGuard)
  @Permissions('read')
  getBalance(@common.Req() req) {
    return this.walletService.getBalance(req.user.userId || req.user.id);
  }

  @common.Get('transactions')
  @common.UseGuards(FlexibleAuthGuard)
  @Permissions('read')
  getTransactions(@common.Req() req) {
    return this.walletService.getTransactions(req.user.userId || req.user.id);
  }

  @common.Get('deposit/:reference/status')
  getStatus(@common.Param('reference') reference: string) {
    return this.walletService.getDepositStatus(reference);
  }
}
