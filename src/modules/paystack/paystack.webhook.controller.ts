import { Controller, Post, Headers, Req, Res, Logger } from '@nestjs/common';

import express from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PaystackService } from './paystack.service';
import { PaystackWebhookService } from './paystack.webhook.service';

@ApiTags('Paystack Webhooks')
@Controller('wallet')
export class PaystackWebhookController {
  logger = new Logger(PaystackWebhookController.name);
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
    // Get the raw body from the request
    const rawBody = req.body;

    // Parse the JSON body
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      this.logger.error('Error parsing webhook body:', error);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    this.logger.debug('Raw body:', rawBody);
    this.logger.debug('Parsed body:', body);

    if (!this.paystackService.verifyWebhookSignature(rawBody, signature)) {
      this.logger.error('Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    this.logger.debug('Webhook event:', body.event);
    this.logger.debug('Webhook data:', body.data);
    this.logger.debug('Webhook signature:', signature);

    if (body.event === 'charge.success') {
      const { reference, amount } = body.data;
      await this.webhookService.handleChargeSuccess(reference, amount);
    }

    res.json({ status: true });
  }
}
