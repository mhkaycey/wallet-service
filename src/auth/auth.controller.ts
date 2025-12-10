import {
  Controller,
  Get,
  UseGuards,
  Request,
  Logger,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthConfig } from 'src/config/authConfig';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    this.logger.log('AuthController initialized');
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth Authentication',
    description:
      "Initiates Google OAuth flow by redirecting to Google's authentication page. Note: This endpoint will redirect you to Google for authentication. For testing in Swagger, use the direct URL: http://localhost:3000/api/auth/google",
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google OAuth authentication page',
  })
  async googleAuth(@Request() req) {
    // const auth = this.configService.get<AuthConfig>('auth');
    // const callbackUrl = auth?.google.callbackUrl;
    // const clientId = auth?.google.clientId;
    // return res.redirect(
    //   'https://accounts.google.com/o/oauth2/v2/auth?' +
    //     'response_type=code&' +
    //     `redirect_uri=${encodeURIComponent(callbackUrl || '')}&` +
    //     'scope=email profile&' +
    //     `client_id=${clientId || ''}`,
    // );
    this.logger.log(req.user);
  }
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req) {
    const user = await this.authService.validateGoogleUser(req.user.googleId);
    const jwt = await this.authService.login(user);
    return { ...jwt, user }; // Redirect or return
  }
}
