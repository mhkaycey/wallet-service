import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { Permission } from '@prisma/client';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'wallet-service' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: Permission,
    isArray: true,
    example: [Permission.DEPOSIT, Permission.READ, Permission.TRANSFER],
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];

  @ApiProperty({
    description: 'Expiry time in days (optional)',
    example: '1M',
    required: false,
  })
  @IsOptional()
  expiry?: string;
}
