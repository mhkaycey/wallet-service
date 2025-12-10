import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class AuthService {
  logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateGoogleUser(
    profile: any,
    accessToken: string,
    refreshToken: string,
  ) {
    this.logger.debug('=== validateGoogleUser called ===');
    this.logger.debug('Profile received:', JSON.stringify(profile, null, 2));

    // Extract data from profile
    const { id, emails, displayName } = profile;

    // Check if emails exist
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      this.logger.error('No emails found in Google profile');
      throw new Error('No email found in Google profile');
    }

    const email = emails[0].value;

    this.logger.debug(`Looking for user with Google ID: ${id}`);

    // Find existing user
    let user = await this.prisma.user.findUnique({
      where: { googleId: id },
      include: { wallet: true },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { googleId: id },
        data: {
          accessToken,
          refreshToken,
        },
        include: { wallet: true },
      });
      this.logger.debug(`Existing user found and tokens updated: ${user.id}`);
    } else {
      this.logger.debug('Creating new user...');

      // Create new user with wallet
      user = await this.prisma.user.create({
        data: {
          googleId: id,
          email,
          name: displayName,
          accessToken,
          refreshToken,
          wallet: {
            create: {
              walletNumber: this.generateWalletNumber(),
            },
          },
        },
        include: {
          wallet: true,
        },
      });

      this.logger.debug(`New user created: ${user.id}`);
    }

    this.logger.debug('=================================');
    return user;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  async getProfile(user: any) {
    this.logger.debug('Getting profile for user:', user.id);
    return this.prisma.user.findUnique({
      where: { id: user.id },
      include: { wallet: true },
    });
  }

  // async findUserById(id: string) {
  //   return this.prisma.user.findUnique({
  //     where: { id },
  //     include: { wallet: true },
  //   });
  // }

  async generateJwt(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      googleId: user.googleId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        wallet: user.wallet,
      },
    };
  }

  private generateWalletNumber(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
}
