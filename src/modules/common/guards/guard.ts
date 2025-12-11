import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../../api-key/api-key.service';
import { Permission } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * FlexibleAuthGuard: Dual authentication strategy
 *
 * - JWT Authentication: Full trusted access (all permissions granted)
 *   Used for: Admin users, internal services, web application
 *
 * - API Key Authentication: Restricted access (permission-based)
 *   Used for: Third-party integrations, limited-access clients
 *   Permissions are validated against the API key's allowed permissions
 */
@Injectable()
export class FlexibleAuthGuard extends AuthGuard('jwt') {
  logger = new Logger(FlexibleAuthGuard.name);

  constructor(
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    // API Key Authentication Path
    if (apiKey) {
      try {
        const requiredPermissions = this.getRequiredPermissions(context);
        const user = await this.apiKeyService.validateApiKey(
          apiKey,
          requiredPermissions,
        );
        this.logger.log(
          `API Key authentication successful for user: ${user.wallet?.userId || user.id}`,
        );

        // Set user on request and mark that we used API key auth
        request.user = user;
        request.authMethod = 'api-key';

        // Return true immediately to skip JWT validation
        return true;
      } catch (error) {
        this.logger.error('Failed to validate API key', error);
        throw new UnauthorizedException(
          'Invalid API key or insufficient permissions',
        );
      }
    }

    // JWT Authentication Path - only if no API key
    try {
      const result = await super.canActivate(context);

      if (result) {
        request.authMethod = 'jwt';
        this.logger.log(
          `JWT authentication successful for user: ${request.user?.userId || request.user?.id} - Full access granted`,
        );
      }

      return result as boolean;
    } catch (error) {
      this.logger.error('JWT authentication failed', error);
      throw new UnauthorizedException(
        'Invalid or missing authentication token',
      );
    }
  }

  /**
   * Override handleRequest - called by passport after authentication
   * We use this to bypass JWT validation when API key was used
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // If we already authenticated via API key, just return the user we set
    if (request.authMethod === 'api-key' && request.user) {
      this.logger.debug('Using API key authentication' + JSON.stringify(user));
      return request.user;
    }

    // Standard JWT handling
    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized');
    }

    return user;
  }

  // Override getAuthenticateOptions to skip JWT when API key is present
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // If API key is present, don't attempt JWT authentication
    if (request.headers['x-api-key']) {
      return undefined; // This prevents passport from attempting authentication
    }

    return {}; // Default options for JWT
  }

  private getRequiredPermissions(context: ExecutionContext): Permission[] {
    const permissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    this.logger.debug('Required permissions:', JSON.stringify(permissions));

    if (!permissions || permissions.length === 0) {
      return [];
    }

    // Convert string permissions to Permission enum
    return permissions
      .map((p) => {
        switch (p) {
          case 'deposit':
            return Permission.DEPOSIT;
          case 'transfer':
            return Permission.TRANSFER;
          case 'read':
            return Permission.READ;
          default:
            return null;
        }
      })
      .filter((p) => p !== null) as Permission[];
  }
}
