import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly paystackUrl = 'https://api.paystack.co';
  private readonly secretKey: string;
  logger = new Logger(PaystackService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new Error(
        'PAYSTACK_SECRET_KEY environment variable is not defined',
      );
    }
    this.secretKey = secretKey;
  }

  async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
  ) {
    try {
      const response = await axios.post(
        `${this.paystackUrl}/transaction/initialize`,
        {
          email,
          amount: amount * 100, // Convert to kobo
          reference,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        reference: response.data.data.reference,
        authorization_url: response.data.data.authorization_url,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(
        'Failed to initialize Paystack transaction',
      );
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(
        `${this.paystackUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      return {
        status: response.data.data.status,
        amount: response.data.data.amount / 100, // Convert from kobo
        reference: response.data.data.reference,
      };
    } catch (error) {
      throw new BadRequestException('Failed to verify Paystack transaction');
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }
}
