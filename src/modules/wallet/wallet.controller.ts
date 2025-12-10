import * as common from '@nestjs/common';

import type { Request } from 'express';

import {
  ApiTags,
  ApiBearerAuth,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FlexibleAuthGuard } from 'src/modules/common/guards/guard';
import {
  DepositDto,
  TransferDto,
  DepositResponseDto,
  TransferResponseDto,
  BalanceResponseDto,
  TransactionDto,
  TransactionStatusDto,
} from './dto/wallet.dto';
import { Permissions } from 'src/modules/common/decorators/permissions.decorator';

import { WalletService } from './wallet.service';
import { PaystackService } from '../paystack/paystack.service';

@ApiTags('Wallet')
@ApiBearerAuth('JWT') // For JWT
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
  @ApiOperation({ summary: 'Initiate a deposit' })
  @ApiResponse({
    status: 200,
    description: 'Deposit initiated successfully',
    type: DepositResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async deposit(
    @common.Req() req,
    @common.Body() dto: DepositDto,
  ): Promise<DepositResponseDto> {
    return this.walletService.initiateDeposit(
      req.user.userId || req.user.id,
      dto.amount,
    );
  }

  @common.Post('transfer')
  @common.UseGuards(FlexibleAuthGuard)
  @Permissions('transfer')
  @ApiOperation({ summary: 'Transfer funds to another wallet' })
  @ApiResponse({
    status: 200,
    description: 'Transfer completed successfully',
    type: TransferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid amount or insufficient balance',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async transfer(
    @common.Req() req,
    @common.Body() dto: TransferDto,
  ): Promise<TransferResponseDto> {
    return this.walletService.transfer(
      req.user.userId || req.user.id,
      dto.wallet_number,
      dto.amount,
    );
  }

  @common.Get('balance')
  @common.UseGuards(FlexibleAuthGuard)
  @Permissions('read')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
    type: BalanceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getBalance(@common.Req() req): Promise<BalanceResponseDto> {
    return this.walletService.getBalance(req.user.userId || req.user.id);
  }

  @common.Get('transactions')
  @common.UseGuards(FlexibleAuthGuard)
  @Permissions('read')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: [TransactionDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getTransactions(@common.Req() req): Promise<TransactionDto[]> {
    return this.walletService.getTransactions(req.user.userId || req.user.id);
  }

  @common.Get('deposit/:reference/status')
  @ApiOperation({ summary: 'Get deposit status by reference' })
  @ApiParam({ name: 'reference', description: 'Deposit reference number' })
  @ApiResponse({
    status: 200,
    description: 'Deposit status retrieved successfully',
    type: TransactionStatusDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getStatus(
    @common.Param('reference') reference: string,
  ): Promise<TransactionStatusDto> {
    return this.walletService.getDepositStatus(reference);
  }
}
