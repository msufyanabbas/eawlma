import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import { MessagingService } from './messaging.service';
import {
  ConversationResponseDto,
  CreateConversationDto,
  MessageResponseDto,
  SendMessageDto,
} from './dto/messaging.dto';
import { MessagingGateway } from './messaging.gateway';

@ApiTags('messages')
@ApiBearerAuth('access-token')
@Controller({ path: 'conversations', version: '1' })
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly gateway: MessagingGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the current user\'s conversations' })
  async list(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const result = await this.messagingService.listForUser(
      userId,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
    return {
      data: result.data.map(({ conversation, unreadCount }) =>
        ConversationResponseDto.fromEntity(conversation, unreadCount),
      ),
      meta: result.meta,
    };
  }

  @Get('unread-total')
  @ApiOperation({ summary: 'Total unread messages across all conversations' })
  async unreadTotal(@CurrentUser('id') userId: string) {
    const count = await this.messagingService.totalUnreadFor(userId);
    return { count };
  }

  @Post()
  @ApiOperation({ summary: 'Start a conversation (idempotent — reuses an existing 1:1 with the same listing context)' })
  @ApiCreatedResponse()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    const { conversation, firstMessage } =
      await this.messagingService.createOrGetConversation(userId, {
        recipientId: dto.recipientId,
        listingId: dto.listingId,
        initialMessage: dto.initialMessage,
      });
    const unread = await this.messagingService.unreadCountFor(userId, conversation.id);
    const conversationDto = ConversationResponseDto.fromEntity(conversation, unread);
    const messageDto = MessageResponseDto.fromEntity(firstMessage);

    // Push the new message to live sockets (recipient may already be online)
    this.gateway.emitNewMessage(conversation, messageDto);
    return { conversation: conversationDto, message: messageDto };
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Paginated message history for a conversation (newest first)' })
  async messages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const result = await this.messagingService.listMessages(
      id,
      userId,
      pagination.page ?? 1,
      pagination.limit ?? 30,
    );
    return {
      data: result.data.map(MessageResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message via REST (also pushed to sockets)' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const message = await this.messagingService.sendMessage({
      conversationId: id,
      senderId: userId,
      body: dto.body,
      attachmentUrls: dto.attachmentUrls,
    });
    const conversation = await this.messagingService.getConversationForUser(id, userId);
    const messageDto = MessageResponseDto.fromEntity(message);
    this.gateway.emitNewMessage(conversation, messageDto);
    return messageDto;
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark conversation messages as read' })
  @ApiOkResponse({ schema: { properties: { updated: { type: 'number' } } } })
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { upToMessageId?: string },
  ) {
    const result = await this.messagingService.markAsRead(id, userId, body?.upToMessageId);
    const conversation = await this.messagingService.getConversationForUser(id, userId);
    this.gateway.emitReadReceipt(conversation, userId);
    return result;
  }
}
