import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({
    description: 'Deposit amount in base currency (e.g., NGN)',
    example: 1000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;
}

export class TransferDto {
  @ApiProperty({
    description: 'Recipient wallet number',
    example: '0123456789',
  })
  @IsString()
  wallet_number: string;

  @ApiProperty({
    description: 'Transfer amount in base currency (e.g., NGN)',
    example: 500,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;
}

// Response DTOs
export class DepositResponseDto {
  @ApiProperty({
    description: 'Payment reference',
    example: 'ref_1640123456789_abc123def',
  })
  reference: string;

  @ApiProperty({
    description: 'Paystack payment URL',
    example: 'https://checkout.paystack.com/abc123def456',
  })
  authorization_url: string;
}

export class TransferResponseDto {
  @ApiProperty({
    description: 'Transfer status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Transfer message',
    example: 'Transfer completed',
  })
  message: string;
}

export class BalanceResponseDto {
  @ApiProperty({
    description: 'Current wallet balance',
    example: 5000.5,
  })
  balance: number;
}

export class TransactionDto {
  @ApiProperty({
    description: 'Transaction type',
    example: 'deposit',
    enum: ['deposit', 'transfer', 'withdrawal'],
  })
  type: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 1000,
  })
  amount: number;

  @ApiProperty({
    description: 'Transaction status',
    example: 'success',
    enum: ['pending', 'success', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Transaction creation date',
    example: '2023-12-10T12:00:00.000Z',
  })
  createdAt: Date;
}

export class TransactionStatusDto {
  @ApiProperty({
    description: 'Transaction reference',
    example: 'ref_1640123456789_abc123def',
  })
  reference: string;

  @ApiProperty({
    description: 'Transaction status',
    example: 'success',
    enum: ['pending', 'success', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 1000,
  })
  amount: number;
}
