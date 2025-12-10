import { IsNumber, IsString, Min } from 'class-validator';

export class DepositDto {
  @IsNumber()
  @Min(1)
  amount: number;
}

export class TransferDto {
  @IsString()
  wallet_number: string;

  @IsNumber()
  @Min(1)
  amount: number;
}
