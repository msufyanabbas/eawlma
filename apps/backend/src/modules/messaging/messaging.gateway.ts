import { Inject, Logger, OnModuleInit, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import type Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '@eawlma/shared-types';

import { REDIS_PUB, REDIS_SUB } from '../../common/redis/redis.module';
import { MessagingService } from './messaging.service';
import {
  JoinConversationPayloadDto,
  MarkAsReadPayloadDto,
  MessageResponseDto,
  SendMessageDto,
  TypingPayloadDto,
} from './dto/messaging.dto';
import { ConversationEntity } from './entities/conversation.entity';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    role: string;
    email: string;
  };
}

const userRoom = (userId: string) => `user:${userId}`;
const conversationRoom = (conversationId: string) => `conv:${conversationId}`;

@WebSocketGateway({
  namespace: '/messaging',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly messagingService: MessagingService,
    @Inject(REDIS_PUB) private readonly pub: Redis,
    @Inject(REDIS_SUB) private readonly sub: Redis,
  ) {}

  onModuleInit(): void {
    // Lifecycle hook reserved for future warmup tasks.
  }

  // ---- Lifecycle ---------------------------------------------------------

  afterInit(server: Server): void {
    // Wire the Redis adapter so multi-instance deployments share rooms.
    try {
      server.adapter(createAdapter(this.pub, this.sub));
      this.logger.log('Socket.IO Redis adapter attached');
    } catch (err) {
      this.logger.warn(
        `Could not attach Socket.IO Redis adapter: ${(err as Error).message}`,
      );
    }

    // JWT handshake middleware: every socket must present a valid bearer.
    server.use((socket, next) => {
      const token = this.extractToken(socket);
      if (!token) {
        return next(new Error('Authentication token missing'));
      }
      try {
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.config.getOrThrow<string>('jwt.accessSecret'),
          issuer: this.config.get<string>('jwt.issuer'),
          audience: this.config.get<string>('jwt.audience'),
        });
        (socket as AuthenticatedSocket).data = {
          userId: payload.sub,
          role: payload.role,
          email: payload.email,
        };
        next();
      } catch (err) {
        next(new Error('Invalid or expired token'));
      }
    });
  }

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.data?.userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }
    await socket.join(userRoom(userId));
    this.logger.log(`Socket ${socket.id} connected as user ${userId}`);
    socket.emit('connected', { userId, ts: Date.now() });
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    if (socket.data?.userId) {
      this.logger.log(`Socket ${socket.id} disconnected (${socket.data.userId})`);
    }
  }

  // ---- Events ------------------------------------------------------------

  @SubscribeMessage('joinConversation')
  async onJoinConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: JoinConversationPayloadDto,
  ): Promise<{ ok: true }> {
    const { userId } = socket.data;
    const conversation = await this.messagingService.getConversationForUser(
      payload.conversationId,
      userId,
    );
    await socket.join(conversationRoom(conversation.id));
    return { ok: true };
  }

  @SubscribeMessage('leaveConversation')
  async onLeaveConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: JoinConversationPayloadDto,
  ): Promise<{ ok: true }> {
    await socket.leave(conversationRoom(payload.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('sendMessage')
  async onSendMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: SendMessageDto & { conversationId: string },
  ): Promise<MessageResponseDto> {
    const { userId } = socket.data;
    if (!payload?.conversationId) {
      throw new WsException('conversationId is required');
    }
    const message = await this.messagingService.sendMessage({
      conversationId: payload.conversationId,
      senderId: userId,
      body: payload.body,
      attachmentUrls: payload.attachmentUrls,
    });
    const conversation = await this.messagingService.getConversationForUser(
      payload.conversationId,
      userId,
    );
    const dto = MessageResponseDto.fromEntity(message);
    this.emitNewMessage(conversation, dto);
    return dto;
  }

  @SubscribeMessage('markAsRead')
  async onMarkAsRead(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: MarkAsReadPayloadDto,
  ): Promise<{ updated: number }> {
    const { userId } = socket.data;
    const result = await this.messagingService.markAsRead(
      payload.conversationId,
      userId,
      payload.upToMessageId,
    );
    const conversation = await this.messagingService.getConversationForUser(
      payload.conversationId,
      userId,
    );
    this.emitReadReceipt(conversation, userId);
    return result;
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: TypingPayloadDto,
  ): { ok: true } {
    const { userId } = socket.data;
    socket
      .to(conversationRoom(payload.conversationId))
      .emit('typing', {
        conversationId: payload.conversationId,
        userId,
        isTyping: payload.isTyping,
      });
    return { ok: true };
  }

  // ---- Server-initiated emitters (used by REST controllers too) ---------

  emitNewMessage(conversation: ConversationEntity, message: MessageResponseDto): void {
    // Emit to the conversation room (anyone who joined it gets it),
    // and also to each participant's user room (so unread badges update).
    this.server.to(conversationRoom(conversation.id)).emit('message', message);
    for (const participantId of conversation.participantIds) {
      this.server
        .to(userRoom(participantId))
        .emit('conversation:updated', {
          conversationId: conversation.id,
          lastMessageAt: message.createdAt,
          lastMessagePreview: message.body.slice(0, 280),
          lastSenderId: message.senderId,
        });
    }
  }

  emitReadReceipt(conversation: ConversationEntity, readerId: string): void {
    this.server
      .to(conversationRoom(conversation.id))
      .emit('readReceipt', {
        conversationId: conversation.id,
        readerId,
        ts: Date.now(),
      });
  }

  // ---- Helpers -----------------------------------------------------------

  private extractToken(socket: Socket): string | null {
    const authToken = (socket.handshake.auth?.token as string | undefined) ?? null;
    if (authToken) return authToken;

    const header = socket.handshake.headers.authorization;
    if (header && header.toLowerCase().startsWith('bearer ')) {
      return header.slice(7).trim();
    }
    const queryToken = socket.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;
    if (Array.isArray(queryToken) && queryToken.length > 0) return queryToken[0];
    return null;
  }
}
