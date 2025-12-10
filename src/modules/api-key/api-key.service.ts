import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Permission } from '@prisma/client';

import * as crypto from 'crypto';

import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ApiKeyService {
  constructor(private prisma: PrismaService) {}

  async createApiKey(
    userId: string,
    name: string,
    permissions: Permission[],
    expiry: string,
  ) {
    // Check active keys count
    const activeKeysCount = await this.prisma.apiKey.count({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (activeKeysCount >= 5) {
      throw new BadRequestException(
        'Maximum 5 active API keys allowed per user',
      );
    }

    const expiresAt = this.calculateExpiry(expiry);
    const key = this.generateApiKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        key,
        permissions,
        expiresAt,
      },
      select: {
        id: true,
        key: true,
        name: true,
        permissions: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      api_key: apiKey.key,
      expires_at: apiKey.expiresAt,
    };
  }

  async rolloverApiKey(
    userId: string,
    expiredKeyId: string,
    newExpiry: string,
  ) {
    const expiredKey = await this.prisma.apiKey.findFirst({
      where: {
        id: expiredKeyId,
        userId,
      },
    });

    if (!expiredKey) {
      throw new BadRequestException('API key not found');
    }

    if (expiredKey.expiresAt > new Date()) {
      throw new BadRequestException('API key has not expired yet');
    }

    // Check active keys count
    const activeKeysCount = await this.prisma.apiKey.count({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (activeKeysCount >= 5) {
      throw new BadRequestException(
        'Maximum 5 active API keys allowed per user',
      );
    }

    const expiresAt = this.calculateExpiry(newExpiry);
    const key = this.generateApiKey();

    const newApiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: expiredKey.name,
        key,
        permissions: expiredKey.permissions,
        expiresAt,
      },
      select: {
        id: true,
        key: true,
        name: true,
        permissions: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      api_key: newApiKey.key,
      expires_at: newApiKey.expiresAt,
    };
  }

  async validateApiKey(key: string, requiredPermission?: Permission) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.isRevoked) {
      throw new UnauthorizedException('API key has been revoked');
    }

    if (apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    if (
      requiredPermission &&
      !apiKey.permissions.includes(requiredPermission)
    ) {
      throw new UnauthorizedException(
        `Missing required permission: ${requiredPermission}`,
      );
    }

    return apiKey.user;
  }

  private generateApiKey(): string {
    const id = crypto.randomUUID();
    const random = crypto.randomBytes(32).toString('hex');

    const randomBytes = crypto
      .createHash('sha256')
      .update(`${id}:${random}`)
      .digest('hex');
    return `sk_live_${randomBytes}`;
  }

  private calculateExpiry(expiry: string): Date {
    const now = new Date();

    switch (expiry) {
      case '1H':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '1D':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '1M':
        return new Date(now.setMonth(now.getMonth() + 1));
      case '1Y':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        throw new BadRequestException(
          'Invalid expiry format. Use: 1H, 1D, 1M, or 1Y',
        );
    }
  }
}
