import { Controller, Post, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-dto';
import { RolloverApiKeyDto } from './dto/rollerover-api.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { User } from '@prisma/client';

@Controller('keys')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
export class ApiKeyController {
  private readonly logger = new Logger(ApiKeyController.name);
  constructor(private apiKeyService: ApiKeyService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new API key (JWT required)' })
  async createApiKey(@Req() req: { user: User }, @Body() dto: CreateApiKeyDto) {
    this.logger.log('Creating API key for user:', req.user.id);
    return this.apiKeyService.createApiKey(
      req.user.id,
      dto.name,
      dto.permissions,
      dto.expiry!,
    );
  }

  @Post('rollover')
  async rolloverApiKey(@Req() req, @Body() dto: RolloverApiKeyDto) {
    return this.apiKeyService.rolloverApiKey(
      req.user.id,
      dto.expired_key_id,
      dto.expiry,
    );
  }
}
