import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayContains, DataSource, LessThanOrEqual, Repository } from 'typeorm';
import type Redis from 'ioredis';

import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { REDIS_DEFAULT } from '../../common/redis/redis.module';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TranslationService } from '../translation/translation.service';

const PREVIEW_MAX = 280;

interface CreateConversationInput {
  recipientId: string;
  listingId?: string;
  initialMessage: string;
}

interface SendMessageInput {
  conversationId: string;
  senderId: string;
  body: string;
  attachmentUrls?: string[];
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversations: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    @Inject(REDIS_DEFAULT) private readonly redis: Redis,
    private readonly translation: TranslationService,
  ) {}

  // ---------------------------------------------------------------------------
  // Conversations
  // ---------------------------------------------------------------------------

  async createOrGetConversation(
    senderId: string,
    input: CreateConversationInput,
  ): Promise<{ conversation: ConversationEntity; firstMessage: MessageEntity }> {
    if (input.recipientId === senderId) {
      throw new BadRequestException('You cannot start a conversation with yourself');
    }
    const recipient = await this.users.findOne({ where: { id: input.recipientId } });
    if (!recipient) throw new NotFoundException('Recipient user not found');

    const participantIds = [senderId, input.recipientId].sort();

    // Try to find an existing 1:1 conversation in this listing context
    let conversation = await this.conversations
      .createQueryBuilder('c')
      .where('c.participant_ids @> :ids::uuid[] AND c.participant_ids <@ :ids::uuid[]', {
        ids: participantIds,
      })
      .andWhere(
        input.listingId
          ? 'c.listing_id = :listingId'
          : 'c.listing_id IS NULL',
        input.listingId ? { listingId: input.listingId } : {},
      )
      .getOne();

    if (!conversation) {
      conversation = this.conversations.create({
        participantIds,
        listingId: input.listingId ?? null,
      });
      conversation = await this.conversations.save(conversation);
    }

    const firstMessage = await this.sendMessage({
      conversationId: conversation.id,
      senderId,
      body: input.initialMessage,
    });

    // Re-fetch to pick up updated last-message fields
    const refreshed = await this.conversations.findOneOrFail({ where: { id: conversation.id } });
    return { conversation: refreshed, firstMessage };
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResultDto<{ conversation: ConversationEntity; unreadCount: number }>> {
    const [data, total] = await this.conversations.findAndCount({
      where: { participantIds: ArrayContains([userId]) },
      order: { lastMessageAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const unreadCounts = await Promise.all(
      data.map((c) => this.unreadCountFor(userId, c.id)),
    );

    const enriched = data.map((conversation, idx) => ({
      conversation,
      unreadCount: unreadCounts[idx],
    }));

    return new PaginatedResultDto(enriched, total, page, limit);
  }

  async getConversationForUser(id: string, userId: string): Promise<ConversationEntity> {
    const conversation = await this.conversations.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertParticipant(conversation, userId);
    return conversation;
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  async listMessages(
    conversationId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResultDto<MessageEntity>> {
    const conversation = await this.getConversationForUser(conversationId, userId);
    const [data, total] = await this.messages.findAndCount({
      where: { conversationId: conversation.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return new PaginatedResultDto(data, total, page, limit);
  }

  async sendMessage(input: SendMessageInput): Promise<MessageEntity> {
    if (!input.body.trim()) {
      throw new BadRequestException('Message body cannot be empty');
    }
    const trimmedBody = input.body.trim();
    // Detection runs outside the transaction so a slow Google response
    // doesn't hold a row lock. Failure is non-fatal — `null` just means
    // the read path will translate without a same-language fast path.
    const detectedLanguage = await this.translation.detect(trimmedBody);

    return this.dataSource.transaction(async (em) => {
      const conversation = await em.findOne(ConversationEntity, {
        where: { id: input.conversationId },
      });
      if (!conversation) throw new NotFoundException('Conversation not found');
      this.assertParticipant(conversation, input.senderId);

      const message = em.create(MessageEntity, {
        conversationId: conversation.id,
        senderId: input.senderId,
        body: trimmedBody,
        attachmentUrls: input.attachmentUrls ?? [],
        readBy: [input.senderId],
        deliveredAt: new Date(),
        detectedLanguage,
      });
      const saved = await em.save(message);

      conversation.lastMessageAt = saved.createdAt;
      conversation.lastMessagePreview = saved.body.slice(0, PREVIEW_MAX);
      conversation.lastSenderId = saved.senderId;
      await em.save(conversation);

      // Bump per-recipient unread counters in Redis (best-effort)
      const recipients = conversation.participantIds.filter((p) => p !== input.senderId);
      for (const r of recipients) {
        await this.redis.incr(this.unreadKey(r, conversation.id)).catch((err) =>
          this.logger.warn(`Redis incr failed for ${r}: ${err.message}`),
        );
      }

      return saved;
    });
  }

  async markAsRead(
    conversationId: string,
    userId: string,
    upToMessageId?: string,
  ): Promise<{ updated: number }> {
    const conversation = await this.getConversationForUser(conversationId, userId);

    const qb = this.messages
      .createQueryBuilder()
      .update(MessageEntity)
      .set({ readBy: () => `array_append(read_by, :uid::uuid)` })
      .where('conversation_id = :cid', { cid: conversation.id })
      .andWhere('NOT (:uid::uuid = ANY(read_by))')
      .setParameter('uid', userId);

    if (upToMessageId) {
      const cutoff = await this.messages.findOne({
        where: { id: upToMessageId, conversationId: conversation.id },
      });
      if (!cutoff) throw new NotFoundException('Cutoff message not found');
      qb.andWhere('created_at <= :cutoff', { cutoff: cutoff.createdAt });
    }

    const result = await qb.execute();
    const updated = result.affected ?? 0;

    // Reset Redis unread counter for this conversation
    await this.redis
      .del(this.unreadKey(userId, conversation.id))
      .catch((err) => this.logger.warn(`Redis del failed: ${err.message}`));

    return { updated };
  }

  /**
   * Translate a single message into `targetLang` for a viewer. Verifies the
   * caller is a participant in the message's conversation; never throws on a
   * Google failure (returns the original body with isOriginal=false so the
   * UI can decide whether to show a "translation unavailable" hint).
   */
  async translateMessage(
    messageId: string,
    userId: string,
    targetLang: string,
  ): Promise<{
    messageId: string;
    targetLang: string;
    sourceLang: string | null;
    translatedText: string;
    isOriginal: boolean;
  }> {
    const message = await this.messages.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    const conversation = await this.conversations.findOne({
      where: { id: message.conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertParticipant(conversation, userId);

    const normalizedTarget = (targetLang || '').trim().toLowerCase();
    if (!normalizedTarget) throw new BadRequestException('targetLang is required');

    // Fast path: when we already know the source language and it matches the
    // target, skip the round-trip.
    const source = message.detectedLanguage;
    if (source && this.langsEqual(source, normalizedTarget)) {
      return {
        messageId: message.id,
        targetLang: normalizedTarget,
        sourceLang: source,
        translatedText: message.body,
        isOriginal: true,
      };
    }

    const translated = await this.translation.translate(message.body, normalizedTarget);
    return {
      messageId: message.id,
      targetLang: normalizedTarget,
      sourceLang: source,
      translatedText: translated,
      isOriginal: translated === message.body,
    };
  }

  private langsEqual(a: string, b: string): boolean {
    // Compare just the primary subtag so "zh-CN" matches "zh".
    return a.toLowerCase().split('-')[0] === b.toLowerCase().split('-')[0];
  }

  async unreadCountFor(userId: string, conversationId: string): Promise<number> {
    try {
      const cached = await this.redis.get(this.unreadKey(userId, conversationId));
      if (cached !== null) return Number.parseInt(cached, 10);
    } catch {
      // Fall through to DB query
    }
    const count = await this.messages
      .createQueryBuilder('m')
      .where('m.conversation_id = :cid', { cid: conversationId })
      .andWhere('NOT (:uid::uuid = ANY(m.read_by))', { uid: userId })
      .getCount();
    await this.redis
      .set(this.unreadKey(userId, conversationId), String(count), 'EX', 3600)
      .catch(() => undefined);
    return count;
  }

  async totalUnreadFor(userId: string): Promise<number> {
    const result = await this.messages
      .createQueryBuilder('m')
      .innerJoin('conversations', 'c', 'c.id = m.conversation_id')
      .where(':uid = ANY(c.participant_ids)', { uid: userId })
      .andWhere('NOT (:uid::uuid = ANY(m.read_by))')
      .setParameter('uid', userId)
      .getCount();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private assertParticipant(conversation: ConversationEntity, userId: string): void {
    if (!conversation.participantIds.includes(userId)) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }
  }

  private unreadKey(userId: string, conversationId: string): string {
    return `unread:${userId}:${conversationId}`;
  }
}
