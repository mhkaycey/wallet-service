// auth.controller.ts
import { Controller, Get, Req, Res, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import express from 'express';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: express.Response) {
    try {
      // User is already validated and attached to req.user
      this.logger.log('User authenticated:', req.user.email);

      if (!req.user) {
        this.logger.error('No user found in request');
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/failure?error=no_user`,
        );
      }

      // Generate JWT token
      const tokenData = await this.authService.generateJwt(req.user);

      this.logger.log('Token generated successfully');

      // Redirect to frontend with token
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      return res.status(200).json({
        message: 'Authentication successful',
        tokenData,
      });
      // res.redirect(
      //   `${frontendUrl}/auth/success?token=${tokenData.access_token}`,
      // );
    } catch (error) {
      this.logger.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      return res.redirect(`${frontendUrl}/auth/failure?error=${error.message}`);
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'User Profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns a message for user profile',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT required' })
  async getProfile(@Req() req) {
    const profile = await this.authService.getProfile(req.user);

    return { profile };
  }
}
