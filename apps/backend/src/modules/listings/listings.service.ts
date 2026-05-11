import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  ListingFurnishing,
  ListingStatus,
  ListingType,
  PropertyType,
  RentPeriod,
  UserRole,
} from '@eawlma/shared-types';

import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { KafkaService } from '../../common/kafka/kafka.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

import { ListingEntity } from './entities/listing.entity';
import { ListingMediaEntity } from './entities/listing-media.entity';
import { ListingTranslationEntity } from './entities/listing-translation.entity';
import { AmenityEntity } from './entities/amenity.entity';
import { TagEntity } from './entities/tag.entity';

import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CreateListingMediaDto, ReorderListingMediaDto } from './dto/listing-media.dto';
import { UpsertListingTranslationDto } from './dto/listing-translation.dto';

const PUBLIC_VISIBLE_STATUSES: ListingStatus[] = [ListingStatus.ACTIVE];
const ALLOWED_OWNER_STATUS_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  [ListingStatus.DRAFT]: [ListingStatus.PENDING_REVIEW],
  [ListingStatus.PENDING_REVIEW]: [ListingStatus.DRAFT],
  [ListingStatus.ACTIVE]: [ListingStatus.SOLD, ListingStatus.RENTED, ListingStatus.ARCHIVED],
  [ListingStatus.REJECTED]: [ListingStatus.DRAFT],
  [ListingStatus.EXPIRED]: [ListingStatus.PENDING_REVIEW, ListingStatus.ARCHIVED],
  [ListingStatus.SOLD]: [],
  [ListingStatus.RENTED]: [],
  [ListingStatus.ARCHIVED]: [ListingStatus.DRAFT],
};

const LISTING_RELATIONS = ['media', 'translations', 'amenities', 'tags'] as const;

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(ListingMediaEntity)
    private readonly media: Repository<ListingMediaEntity>,
    @InjectRepository(ListingTranslationEntity)
    private readonly translations: Repository<ListingTranslationEntity>,
    @InjectRepository(AmenityEntity)
    private readonly amenities: Repository<AmenityEntity>,
    @InjectRepository(TagEntity)
    private readonly tags: Repository<TagEntity>,
    private readonly dataSource: DataSource,
    private readonly kafkaService: KafkaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(ownerId: string, dto: CreateListingDto): Promise<ListingEntity> {
    if (dto.type === ListingType.RENT && !dto.rentPeriod) {
      throw new BadRequestException('rentPeriod is required for rent listings');
    }
    if (dto.type === ListingType.SALE && dto.rentPeriod) {
      throw new BadRequestException('rentPeriod is not allowed on sale listings');
    }

    const amenityEntities = await this.resolveAmenities(dto.amenityIds);
    const tagEntities = await this.resolveTags(dto.tagIds);

    const referenceCode = await this.generateReferenceCode();

    const listing = this.listings.create({
      referenceCode,
      type: dto.type,
      propertyType: dto.propertyType,
      status: ListingStatus.DRAFT,
      sourceLocale: dto.locale,
      title: dto.title.trim(),
      description: dto.description.trim(),
      price: dto.price,
      currency: dto.currency ?? 'SAR',
      rentPeriod: dto.rentPeriod ?? null,
      isNegotiable: dto.isNegotiable ?? false,

      bedrooms: dto.features.bedrooms ?? null,
      bathrooms: dto.features.bathrooms ?? null,
      area: dto.features.area ?? null,
      landArea: dto.features.landArea ?? null,
      parkingSpaces: dto.features.parkingSpaces ?? null,
      floors: dto.features.floors ?? null,
      floorNumber: dto.features.floorNumber ?? null,
      yearBuilt: dto.features.yearBuilt ?? null,
      furnishing: (dto.features.furnishing as ListingFurnishing | undefined) ?? null,
      hasElevator: !!dto.features.hasElevator,
      hasPool: !!dto.features.hasPool,
      hasGarden: !!dto.features.hasGarden,
      hasGym: !!dto.features.hasGym,
      hasMaidRoom: !!dto.features.hasMaidRoom,
      hasDriverRoom: !!dto.features.hasDriverRoom,
      hasCentralAC: !!dto.features.hasCentralAC,
      hasKitchenAppliances: !!dto.features.hasKitchenAppliances,
      hasSecurity: !!dto.features.hasSecurity,
      isCornerUnit: !!dto.features.isCornerUnit,

      country: dto.address.country.toUpperCase(),
      region: dto.address.region,
      city: dto.address.city,
      district: dto.address.district ?? null,
      address: { ...dto.address },
      lat: dto.location.lat,
      lng: dto.location.lng,

      ownerId,
      agencyId: dto.agencyId ?? null,
      amenities: amenityEntities,
      tags: tagEntities,
    });

    if (dto.shortTerm) applyShortTermFields(listing, dto.shortTerm);

    const saved = await this.listings.save(listing);
    this.logger.log(`Created listing ${saved.id} (${saved.referenceCode}) for owner ${ownerId}`);
    return this.findByIdOrFail(saved.id);
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<ListingEntity | null> {
    return this.listings.findOne({
      where: { id },
      relations: [...LISTING_RELATIONS],
    });
  }

  async findByIdOrFail(id: string): Promise<ListingEntity> {
    const listing = await this.findById(id);
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  /**
   * Public lookup that respects status visibility — non-owners can only see
   * ACTIVE listings; owners (and admin/moderator) can see any of their own.
   */
  async findPublicById(id: string, viewer?: RequestUser): Promise<ListingEntity> {
    const listing = await this.findByIdOrFail(id);
    if (PUBLIC_VISIBLE_STATUSES.includes(listing.status)) return listing;

    if (!viewer) throw new NotFoundException('Listing not found');
    const isOwner = listing.ownerId === viewer.id;
    const isPrivileged =
      viewer.role === UserRole.ADMIN || viewer.role === UserRole.MODERATOR;
    if (!isOwner && !isPrivileged) throw new NotFoundException('Listing not found');
    return listing;
  }

  async listForOwner(
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResultDto<ListingEntity>> {
    const [data, total] = await this.listings.findAndCount({
      where: { ownerId },
      relations: ['media'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return new PaginatedResultDto(data, total, page, limit);
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.listings.increment({ id }, 'viewCount', 1);
  }

  /**
   * Records a listing view: bumps the on-row counter AND publishes a
   * `listing.viewed` Kafka event so downstream analytics consumers can fold
   * it into per-day aggregates.
   */
  async recordView(
    id: string,
    ctx: { source?: string | null; device?: string | null; viewerId?: string | null },
  ): Promise<void> {
    await this.incrementViewCount(id);
    const topic =
      this.config.get<string>('kafka.topics.listingEvents') ?? 'eawlma.listing.events';
    void this.kafkaService
      .publish({
        topic,
        key: id,
        value: {
          eventType: 'listing.viewed',
          eventId: `view_${id}_${Date.now()}`,
          occurredAt: new Date().toISOString(),
          listingId: id,
          viewerId: ctx.viewerId ?? null,
          source: ctx.source ?? null,
          device: ctx.device ?? null,
        },
        headers: { 'x-event-type': 'listing.viewed' },
      })
      .catch((err: Error) =>
        this.logger.warn(`failed to publish listing.viewed: ${err.message}`),
      );
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  async update(
    id: string,
    actor: RequestUser,
    dto: UpdateListingDto,
  ): Promise<ListingEntity> {
    const listing = await this.findByIdOrFail(id);
    this.assertCanModify(listing, actor);

    const previousStatus = listing.status;
    const previousTitle = listing.title;
    const previousDescription = listing.description;

    if (dto.status && dto.status !== listing.status) {
      this.assertOwnerCanTransition(listing.status, dto.status, actor);
      listing.status = dto.status;
      if (dto.status === ListingStatus.ACTIVE && !listing.publishedAt) {
        listing.publishedAt = new Date();
      }
    }

    if (dto.type !== undefined) listing.type = dto.type;
    if (dto.propertyType !== undefined) listing.propertyType = dto.propertyType;
    if (dto.title !== undefined) listing.title = dto.title.trim();
    if (dto.description !== undefined) listing.description = dto.description.trim();
    if (dto.locale !== undefined) listing.sourceLocale = dto.locale;
    if (dto.price !== undefined) listing.price = dto.price;
    if (dto.currency !== undefined) listing.currency = dto.currency;
    if (dto.rentPeriod !== undefined) listing.rentPeriod = dto.rentPeriod ?? null;
    if (dto.isNegotiable !== undefined) listing.isNegotiable = dto.isNegotiable;

    if (dto.features) {
      const f = dto.features;
      if (f.bedrooms !== undefined) listing.bedrooms = f.bedrooms;
      if (f.bathrooms !== undefined) listing.bathrooms = f.bathrooms;
      if (f.area !== undefined) listing.area = f.area;
      if (f.landArea !== undefined) listing.landArea = f.landArea;
      if (f.parkingSpaces !== undefined) listing.parkingSpaces = f.parkingSpaces;
      if (f.floors !== undefined) listing.floors = f.floors;
      if (f.floorNumber !== undefined) listing.floorNumber = f.floorNumber;
      if (f.yearBuilt !== undefined) listing.yearBuilt = f.yearBuilt;
      if (f.furnishing !== undefined)
        listing.furnishing = f.furnishing as ListingFurnishing | null;
      if (f.hasElevator !== undefined) listing.hasElevator = !!f.hasElevator;
      if (f.hasPool !== undefined) listing.hasPool = !!f.hasPool;
      if (f.hasGarden !== undefined) listing.hasGarden = !!f.hasGarden;
      if (f.hasGym !== undefined) listing.hasGym = !!f.hasGym;
      if (f.hasMaidRoom !== undefined) listing.hasMaidRoom = !!f.hasMaidRoom;
      if (f.hasDriverRoom !== undefined) listing.hasDriverRoom = !!f.hasDriverRoom;
      if (f.hasCentralAC !== undefined) listing.hasCentralAC = !!f.hasCentralAC;
      if (f.hasKitchenAppliances !== undefined)
        listing.hasKitchenAppliances = !!f.hasKitchenAppliances;
      if (f.hasSecurity !== undefined) listing.hasSecurity = !!f.hasSecurity;
      if (f.isCornerUnit !== undefined) listing.isCornerUnit = !!f.isCornerUnit;
    }

    if (dto.address) {
      listing.country = dto.address.country.toUpperCase();
      listing.region = dto.address.region;
      listing.city = dto.address.city;
      listing.district = dto.address.district ?? null;
      listing.address = { ...dto.address };
    }
    if (dto.location) {
      listing.lat = dto.location.lat;
      listing.lng = dto.location.lng;
    }

    if (dto.shortTerm) applyShortTermFields(listing, dto.shortTerm);

    if (dto.amenityIds) listing.amenities = await this.resolveAmenities(dto.amenityIds);
    if (dto.tagIds) listing.tags = await this.resolveTags(dto.tagIds);
    if (dto.agencyId !== undefined) listing.agencyId = dto.agencyId ?? null;

    await this.listings.save(listing);

    // Emit lifecycle events for downstream consumers (analytics, AI translation).
    const changedFields: string[] = [];
    if (listing.title !== previousTitle) changedFields.push('title');
    if (listing.description !== previousDescription) changedFields.push('description');
    if (changedFields.length > 0) {
      void this.publishLifecycleEvent('listing.updated', listing, { changedFields });
    }
    if (listing.status === ListingStatus.ACTIVE && previousStatus !== ListingStatus.ACTIVE) {
      void this.publishLifecycleEvent('listing.published', listing);
    }

    return this.findByIdOrFail(id);
  }

  /** Internal: publishes a listing lifecycle event to the listing-events topic. */
  async publishLifecycleEvent(
    eventType: 'listing.published' | 'listing.updated' | 'listing.unpublished',
    listing: ListingEntity,
    extras: Record<string, unknown> = {},
  ): Promise<void> {
    const topic =
      this.config.get<string>('kafka.topics.listingEvents') ?? 'eawlma.listing.events';
    try {
      await this.kafkaService.publish({
        topic,
        key: listing.id,
        value: {
          eventType,
          eventId: `${eventType}_${listing.id}_${Date.now()}`,
          occurredAt: new Date().toISOString(),
          listingId: listing.id,
          referenceCode: listing.referenceCode,
          ownerId: listing.ownerId,
          status: listing.status,
          sourceLocale: listing.sourceLocale,
          ...extras,
        },
        headers: { 'x-event-type': eventType },
      });
    } catch (err) {
      this.logger.warn(`failed to publish ${eventType}: ${(err as Error).message}`);
    }
  }

  async submitForReview(id: string, actor: RequestUser): Promise<ListingEntity> {
    const listing = await this.findByIdOrFail(id);
    this.assertCanModify(listing, actor);
    if (![ListingStatus.DRAFT, ListingStatus.REJECTED].includes(listing.status)) {
      throw new BadRequestException('Only DRAFT or REJECTED listings can be submitted for review');
    }
    if ((listing.media ?? []).length === 0) {
      throw new BadRequestException('At least one media item is required before submitting');
    }
    // Enforce the active subscription's listing quota for the owner. Throws
    // 403 with an upgrade prompt when the agent is at their plan limit.
    await this.subscriptionsService.assertCanPublishListing(listing.ownerId);
    listing.status = ListingStatus.PENDING_REVIEW;
    await this.listings.save(listing);
    return this.findByIdOrFail(id);
  }

  async archive(id: string, actor: RequestUser): Promise<void> {
    const listing = await this.findByIdOrFail(id);
    this.assertCanModify(listing, actor);
    listing.status = ListingStatus.ARCHIVED;
    await this.listings.save(listing);
  }

  async softDelete(id: string, actor: RequestUser): Promise<void> {
    const listing = await this.findByIdOrFail(id);
    this.assertCanModify(listing, actor);
    await this.listings.softDelete({ id });
  }

  // ---------------------------------------------------------------------------
  // Media
  // ---------------------------------------------------------------------------

  async addMedia(
    listingId: string,
    actor: RequestUser,
    dto: CreateListingMediaDto,
  ): Promise<ListingMediaEntity> {
    const listing = await this.findByIdOrFail(listingId);
    this.assertCanModify(listing, actor);

    const existingCount = await this.media.count({ where: { listingId } });
    if (existingCount >= 50) {
      throw new BadRequestException('A listing can have at most 50 media items');
    }

    const item = this.media.create({
      listingId,
      type: dto.type,
      url: dto.url,
      thumbnailUrl: dto.thumbnailUrl ?? null,
      caption: dto.caption ?? null,
      position: dto.position ?? existingCount,
      width: dto.width ?? null,
      height: dto.height ?? null,
      durationSeconds: dto.durationSeconds ?? null,
    });

    return this.media.save(item);
  }

  async removeMedia(listingId: string, mediaId: string, actor: RequestUser): Promise<void> {
    const listing = await this.findByIdOrFail(listingId);
    this.assertCanModify(listing, actor);
    const item = await this.media.findOne({ where: { id: mediaId, listingId } });
    if (!item) throw new NotFoundException('Media not found on this listing');
    await this.media.remove(item);
  }

  async reorderMedia(
    listingId: string,
    actor: RequestUser,
    dto: ReorderListingMediaDto,
  ): Promise<ListingMediaEntity[]> {
    const listing = await this.findByIdOrFail(listingId);
    this.assertCanModify(listing, actor);

    if (!Array.isArray(dto.mediaIds) || dto.mediaIds.length === 0) {
      throw new BadRequestException('mediaIds must be a non-empty array');
    }

    const items = await this.media.find({ where: { listingId, id: In(dto.mediaIds) } });
    if (items.length !== dto.mediaIds.length) {
      throw new BadRequestException('One or more media IDs are not on this listing');
    }

    await this.dataSource.transaction(async (em) => {
      for (let i = 0; i < dto.mediaIds.length; i += 1) {
        await em.update(ListingMediaEntity, { id: dto.mediaIds[i], listingId }, { position: i });
      }
    });

    return this.media.find({ where: { listingId }, order: { position: 'ASC' } });
  }

  // ---------------------------------------------------------------------------
  // Translations
  // ---------------------------------------------------------------------------

  async upsertTranslation(
    listingId: string,
    actor: RequestUser,
    dto: UpsertListingTranslationDto,
  ): Promise<ListingTranslationEntity> {
    const listing = await this.findByIdOrFail(listingId);
    this.assertCanModify(listing, actor);

    const existing = await this.translations.findOne({
      where: { listingId, locale: dto.locale },
    });

    if (existing) {
      existing.title = dto.title.trim();
      existing.description = dto.description.trim();
      existing.isMachineTranslated = dto.isMachineTranslated ?? false;
      existing.translatedAt = new Date();
      return this.translations.save(existing);
    }

    return this.translations.save(
      this.translations.create({
        listingId,
        locale: dto.locale,
        title: dto.title.trim(),
        description: dto.description.trim(),
        isMachineTranslated: dto.isMachineTranslated ?? false,
        translatedAt: new Date(),
      }),
    );
  }

  async deleteTranslation(
    listingId: string,
    translationId: string,
    actor: RequestUser,
  ): Promise<void> {
    const listing = await this.findByIdOrFail(listingId);
    this.assertCanModify(listing, actor);
    const t = await this.translations.findOne({ where: { id: translationId, listingId } });
    if (!t) throw new NotFoundException('Translation not found on this listing');
    await this.translations.remove(t);
  }

  // ---------------------------------------------------------------------------
  // Reference data
  // ---------------------------------------------------------------------------

  listAmenities(): Promise<AmenityEntity[]> {
    return this.amenities.find({ order: { sortOrder: 'ASC', nameEn: 'ASC' } });
  }

  listTags(): Promise<TagEntity[]> {
    return this.tags.find({ order: { nameEn: 'ASC' } });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private assertCanModify(listing: ListingEntity, actor: RequestUser): void {
    const isOwner = listing.ownerId === actor.id;
    const isPrivileged =
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.MODERATOR ||
      actor.role === UserRole.AGENCY_ADMIN;
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to modify this listing');
    }
  }

  private assertOwnerCanTransition(
    from: ListingStatus,
    to: ListingStatus,
    actor: RequestUser,
  ): void {
    const isPrivileged = actor.role === UserRole.ADMIN || actor.role === UserRole.MODERATOR;
    if (isPrivileged) return; // moderators can move to any status (handled elsewhere)
    const allowed = ALLOWED_OWNER_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Cannot transition listing from ${from} to ${to}`);
    }
  }

  private async resolveAmenities(ids?: string[]): Promise<AmenityEntity[]> {
    if (!ids || ids.length === 0) return [];
    const found = await this.amenities.find({ where: { id: In(ids) } });
    if (found.length !== ids.length) {
      throw new BadRequestException('One or more amenityIds are invalid');
    }
    return found;
  }

  private async resolveTags(ids?: string[]): Promise<TagEntity[]> {
    if (!ids || ids.length === 0) return [];
    const found = await this.tags.find({ where: { id: In(ids) } });
    if (found.length !== ids.length) {
      throw new BadRequestException('One or more tagIds are invalid');
    }
    return found;
  }

  // ---------------------------------------------------------------------------
  // Scheduled jobs
  // ---------------------------------------------------------------------------

  /**
   * Hourly sweep that transitions ACTIVE listings whose `expiresAt` has passed
   * into EXPIRED status. Owners can re-submit them for review afterward.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireListingsJob(): Promise<void> {
    const now = new Date();
    const result = await this.listings
      .createQueryBuilder()
      .update(ListingEntity)
      .set({ status: ListingStatus.EXPIRED })
      .where('status = :active', { active: ListingStatus.ACTIVE })
      .andWhere('expires_at IS NOT NULL')
      .andWhere('expires_at < :now', { now })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Auto-expired ${result.affected} listings whose expires_at has passed`);
    }
  }

  /**
   * Reference codes look like `EAW-2026-000123`. The numeric suffix is monotonic
   * within a calendar year. Uses an advisory-locked sequence for safety under
   * concurrent inserts.
   */
  private async generateReferenceCode(): Promise<string> {
    const year = new Date().getUTCFullYear();
    const result: Array<{ next: string }> = await this.dataSource.query(`
      SELECT to_char(nextval('listings_reference_seq'), 'FM000000') AS next
    `);
    const seq = result[0]?.next ?? '000001';
    return `EAW-${year}-${seq}`;
  }
}

// Short-term field patcher used by both create + update. Hoisted out of the
// service so create() doesn't need to repeat the same field-by-field copy.
function applyShortTermFields(
  listing: ListingEntity,
  s: NonNullable<CreateListingDto['shortTerm']>,
): void {
  if (s.maxGuests !== undefined) listing.maxGuests = s.maxGuests;
  if (s.amenitiesDetailed !== undefined) listing.amenitiesDetailed = s.amenitiesDetailed;
  if (s.houseRules !== undefined) listing.houseRules = s.houseRules || null;
  if (s.checkInTime !== undefined) listing.checkInTime = s.checkInTime;
  if (s.checkOutTime !== undefined) listing.checkOutTime = s.checkOutTime;
  if (s.instantBook !== undefined) listing.instantBook = !!s.instantBook;
  if (s.cancellationPolicy !== undefined) listing.cancellationPolicy = s.cancellationPolicy;
  if (s.hotelStarRating !== undefined) listing.hotelStarRating = s.hotelStarRating;
  if (s.hotelName !== undefined) listing.hotelName = s.hotelName || null;
  if (s.dailyRate !== undefined) listing.dailyRate = s.dailyRate;
  if (s.weeklyRate !== undefined) listing.weeklyRate = s.weeklyRate;
  if (s.minimumStay !== undefined) listing.minimumStay = s.minimumStay;
  if (s.bookingType !== undefined) listing.bookingType = s.bookingType;
  if (s.damageDeposit !== undefined) listing.damageDeposit = s.damageDeposit.toFixed(2);
  if (s.checkInInstructions !== undefined) {
    listing.checkInInstructions = s.checkInInstructions || null;
  }
}
