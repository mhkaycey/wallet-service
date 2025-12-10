import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-dto';
import { RolloverApiKeyDto } from './dto/rollerover-api.dto';

@Controller('keys')
@UseGuards(AuthGuard('jwt'))
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Post('create')
  async createApiKey(@Req() req, @Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.createApiKey(
      req.user.id,
      dto.name,
      dto.permissions,
      dto.expiry,
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
