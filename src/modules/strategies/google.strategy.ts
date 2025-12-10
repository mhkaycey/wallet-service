/* eslint-disable no-console */
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  StrategyOptions,
} from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

// import { AuthConfig } from 'src/config/authConfig';
import { AuthService } from '../auth/auth.service';
import { AuthConfig } from 'src/config/authConfig';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const auth = configService.get<AuthConfig>('auth');

    console.log('=== Google Strategy Configuration ===');
    console.log('Client ID:', auth?.google.clientId?.substring(0, 20) + '...');
    console.log('Callback URL:', auth?.google.callbackUrl);
    console.log('====================================');
    const options: StrategyOptions = {
      clientID: auth?.google.clientId || '',
      clientSecret: auth?.google.clientSecret || '',
      callbackURL: auth?.google.callbackUrl || '',
      scope: ['email', 'profile'],
    };
    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,

    done: VerifyCallback,
  ): Promise<any> {
    // try {
    this.logger.debug('=== Google Strategy Validate Called ===');
    this.logger.debug('Profile ID:', profile.id);
    this.logger.debug('Profile emails:', JSON.stringify(profile.emails));
    this.logger.debug('Profile displayName:', profile.displayName);
    const user = await this.authService.validateGoogleUser(
      profile,
      accessToken,
      refreshToken,
    );
    done(null, user);
    // } catch (error) {
    //   this.logger.error('Error validating Google user:', error);
    //   throw error;
    // }
  }
}
