import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
@Injectable()
export class AuthService {
  logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateGoogleUser(profile: any) {
    const { id, emails, displayName } = profile;
    const email = emails[0].value;

    let user = await this.prisma.user.findUnique({
      where: { googleId: id },
    });

    if (!user) {
      // Create user and wallet
      user = await this.prisma.user.create({
        data: {
          googleId: id,
          email,
          name: displayName,
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
    }

    return user;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async generateJwt(userId: string) {
    const payload = { sub: userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private generateWalletNumber(): string {
    return Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
  }
}
