import {
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('payments')
@Controller({ path: 'subscriptions', version: '1' })
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List active subscription plans (public)' })
  async plans() {
    return this.subscriptionsService.listPlans();
  }

  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({ summary: 'Get the current user\'s active subscription (creates a Free one if missing)' })
  @ApiOkResponse()
  async me(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getOrCreateFreeSubscription(userId);
  }

  @ApiBearerAuth('access-token')
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel the current subscription at period end' })
  async cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancelAtPeriodEnd(userId);
  }
}
