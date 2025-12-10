import { Controller, Post, Headers, Req, Res } from '@nestjs/common';

import express from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PaystackService } from './paystack.service';
import { PaystackWebhookService } from './paystack.webhook.service';

@ApiTags('Paystack Webhooks')
@Controller('wallet/paystack')
export class PaystackWebhookController {
  constructor(
    private paystackService: PaystackService,
    private webhookService: PaystackWebhookService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Paystack webhook events' })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack webhook signature',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Req() req: any,
    @Res() res: express.Response,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // Parse the raw body manually since we're using raw body parser
    let body: any;
    try {
      body = JSON.parse(req.rawBody);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    if (!this.paystackService.verifyWebhookSignature(req.rawBody, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (body.event === 'charge.success') {
      const { reference, amount } = body.data;
      await this.webhookService.handleChargeSuccess(reference, amount);
    }

    res.json({ status: true });
  }
}
