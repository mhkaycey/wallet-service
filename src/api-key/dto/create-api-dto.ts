import { IsString, IsArray, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '@prisma/client';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'wallet-service' })
  @IsString()
  name: string;

  @ApiProperty({ example: ['deposit', 'read'] })
  @IsArray()
  @IsIn(['deposit', 'transfer', 'read'], { each: true })
  permissions: Permission[];

  @ApiProperty({ enum: ['1H', '1D', '1M', '1Y'], example: '1M' })
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;
}
