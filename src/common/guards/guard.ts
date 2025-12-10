import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyService } from '../../api-key/api-key.service';
import { Permission } from '@prisma/client';

@Injectable()
export class FlexibleAuthGuard extends AuthGuard('jwt') {
  logger = new Logger(FlexibleAuthGuard.name);
  constructor(private apiKeyService: ApiKeyService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    // If API key is provided, validate it
    if (apiKey) {
      const permission = this.getRequiredPermission(
        request.route.path,
        request.method,
      );
      const user = await this.apiKeyService.validateApiKey(apiKey, permission);
      request.user = user;
      return true;
    }

    // Otherwise, use JWT authentication
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (error) {
      this.logger.error('Failed to validate JWT', error);
      throw new UnauthorizedException('Invalid or missing authentication');
    }
  }

  private getRequiredPermission(
    path: string,
    method: string,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  ): Permission | undefined {
    if (path.includes('/deposit') && method === 'POST') {
      return Permission.DEPOSIT;
    }
    if (path.includes('/transfer') && method === 'POST') {
      return Permission.TRANSFER;
    }
    if (path.includes('/balance') || path.includes('/transactions')) {
      return Permission.READ;
    }
    return undefined;
  }
}
