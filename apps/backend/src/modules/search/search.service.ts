import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  ListingSortField,
  ListingStatus,
  SortOrder,
} from '@aqarat/shared-types';

import { ListingEntity } from '../listings/entities/listing.entity';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { SearchListingsDto } from './dto/search-listings.dto';

const EARTH_RADIUS_KM = 6371;

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  async searchListings(
    dto: SearchListingsDto,
  ): Promise<PaginatedResultDto<ListingEntity>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const qb = this.listings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.media', 'media')
      .leftJoinAndSelect('l.translations', 'translations')
      .where('l.status = :status', { status: ListingStatus.ACTIVE });

    this.applyTextSearch(qb, dto.q);
    this.applyFilters(qb, dto);
    this.applyGeo(qb, dto);
    this.applySorting(qb, dto.sortField, dto.sortOrder, !!dto.q, !!dto.centerLat);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResultDto(data, total, page, limit);
  }

  // ---------------------------------------------------------------------------

  private applyTextSearch(qb: SelectQueryBuilder<ListingEntity>, q?: string): void {
    if (!q) return;
    // Use `plainto_tsquery` with the simple config so it works for both AR and EN.
    // Match against listing title/description and any translation title/description.
    qb.andWhere(
      `(
        to_tsvector('simple', l.title || ' ' || l.description) @@ plainto_tsquery('simple', :q)
        OR to_tsvector('simple', coalesce(translations.title, '') || ' ' || coalesce(translations.description, '')) @@ plainto_tsquery('simple', :q)
        OR l.reference_code ILIKE :likeQ
      )`,
      { q, likeQ: `%${q}%` },
    );
    qb.addSelect(
      `ts_rank(to_tsvector('simple', l.title || ' ' || l.description), plainto_tsquery('simple', :q))`,
      'search_rank',
    );
  }

  private applyFilters(qb: SelectQueryBuilder<ListingEntity>, dto: SearchListingsDto): void {
    if (dto.type) qb.andWhere('l.type = :type', { type: dto.type });

    if (dto.propertyTypes && dto.propertyTypes.length > 0) {
      qb.andWhere('l.property_type IN (:...propertyTypes)', {
        propertyTypes: dto.propertyTypes,
      });
    }

    if (dto.city) qb.andWhere('l.city ILIKE :city', { city: dto.city });
    if (dto.district) qb.andWhere('l.district ILIKE :district', { district: dto.district });

    if (dto.minPrice !== undefined) qb.andWhere('l.price >= :minPrice', { minPrice: dto.minPrice });
    if (dto.maxPrice !== undefined) qb.andWhere('l.price <= :maxPrice', { maxPrice: dto.maxPrice });

    if (dto.minBedrooms !== undefined)
      qb.andWhere('l.bedrooms >= :minBedrooms', { minBedrooms: dto.minBedrooms });
    if (dto.maxBedrooms !== undefined)
      qb.andWhere('l.bedrooms <= :maxBedrooms', { maxBedrooms: dto.maxBedrooms });
    if (dto.minBathrooms !== undefined)
      qb.andWhere('l.bathrooms >= :minBathrooms', { minBathrooms: dto.minBathrooms });
    if (dto.minArea !== undefined)
      qb.andWhere('l.area >= :minArea', { minArea: dto.minArea });
    if (dto.maxArea !== undefined)
      qb.andWhere('l.area <= :maxArea', { maxArea: dto.maxArea });

    if (dto.furnishing) qb.andWhere('l.furnishing = :furnishing', { furnishing: dto.furnishing });
    if (dto.rentPeriod) qb.andWhere('l.rent_period = :rentPeriod', { rentPeriod: dto.rentPeriod });
    if (dto.agencyId) qb.andWhere('l.agency_id = :agencyId', { agencyId: dto.agencyId });
    if (dto.agentId) qb.andWhere('l.owner_id = :agentId', { agentId: dto.agentId });
    if (dto.isFeatured) qb.andWhere('l.is_featured = TRUE');

    if (dto.amenityIds && dto.amenityIds.length > 0) {
      // Match listings that have ALL requested amenities.
      qb.andWhere(
        `(
          SELECT COUNT(DISTINCT la.amenity_id)
          FROM listing_amenities la
          WHERE la.listing_id = l.id AND la.amenity_id IN (:...amenityIds)
        ) = :amenityCount`,
        { amenityIds: dto.amenityIds, amenityCount: dto.amenityIds.length },
      );
    }
  }

  private applyGeo(qb: SelectQueryBuilder<ListingEntity>, dto: SearchListingsDto): void {
    const hasBox =
      dto.neLat !== undefined &&
      dto.neLng !== undefined &&
      dto.swLat !== undefined &&
      dto.swLng !== undefined;
    const hasRadius =
      dto.centerLat !== undefined && dto.centerLng !== undefined && dto.radiusKm !== undefined;

    if (hasBox && hasRadius) {
      throw new BadRequestException('Use either bounding-box OR radius, not both');
    }

    if (hasBox) {
      qb.andWhere('l.lat BETWEEN :swLat AND :neLat', { swLat: dto.swLat, neLat: dto.neLat });
      // If the box doesn't cross the antimeridian, sw.lng < ne.lng. We don't
      // attempt to handle the crossing case here — Saudi Arabia / GCC don't
      // straddle the antimeridian and front-end maps in this region won't
      // produce such bounds.
      qb.andWhere('l.lng BETWEEN :swLng AND :neLng', { swLng: dto.swLng, neLng: dto.neLng });
    }

    if (hasRadius && dto.centerLat !== undefined && dto.centerLng !== undefined && dto.radiusKm) {
      // Cheap bounding box pre-filter, then exact haversine
      const latDelta = dto.radiusKm / 111;
      const lngDelta =
        dto.radiusKm / (111 * Math.max(Math.cos((dto.centerLat * Math.PI) / 180), 0.01));
      qb.andWhere('l.lat BETWEEN :rLatMin AND :rLatMax', {
        rLatMin: dto.centerLat - latDelta,
        rLatMax: dto.centerLat + latDelta,
      });
      qb.andWhere('l.lng BETWEEN :rLngMin AND :rLngMax', {
        rLngMin: dto.centerLng - lngDelta,
        rLngMax: dto.centerLng + lngDelta,
      });
      // Exact distance via haversine, in km
      qb.andWhere(
        `(
          ${EARTH_RADIUS_KM} * 2 * asin(sqrt(
            power(sin(radians((l.lat - :centerLat) / 2)), 2) +
            cos(radians(:centerLat)) * cos(radians(l.lat)) *
            power(sin(radians((l.lng - :centerLng) / 2)), 2)
          ))
        ) <= :radiusKm`,
        { centerLat: dto.centerLat, centerLng: dto.centerLng, radiusKm: dto.radiusKm },
      );
      qb.addSelect(
        `(
          ${EARTH_RADIUS_KM} * 2 * asin(sqrt(
            power(sin(radians((l.lat - :centerLat) / 2)), 2) +
            cos(radians(:centerLat)) * cos(radians(l.lat)) *
            power(sin(radians((l.lng - :centerLng) / 2)), 2)
          ))
        )`,
        'distance_km',
      );
    }
  }

  private applySorting(
    qb: SelectQueryBuilder<ListingEntity>,
    field: ListingSortField | undefined,
    order: SortOrder | undefined,
    hasTextSearch: boolean,
    hasGeoCenter: boolean,
  ): void {
    const direction = order === SortOrder.ASC ? 'ASC' : 'DESC';

    // Featured listings always float to the top within the requested sort.
    // NOTE: addOrderBy('alias.property') resolves the column via TypeORM
    //   metadata, so it requires the camelCase entity property name.
    qb.addOrderBy('l.isFeatured', 'DESC');

    if (field === ListingSortField.RELEVANCE && hasTextSearch) {
      qb.addOrderBy('search_rank', 'DESC');
      qb.addOrderBy('l.publishedAt', 'DESC', 'NULLS LAST');
      return;
    }

    if (field === ListingSortField.RELEVANCE && hasGeoCenter) {
      qb.addOrderBy('distance_km', 'ASC');
      return;
    }

    switch (field) {
      case ListingSortField.PRICE:
        qb.addOrderBy('l.price', direction);
        break;
      case ListingSortField.AREA:
        qb.addOrderBy('l.area', direction, 'NULLS LAST');
        break;
      case ListingSortField.POPULARITY:
        qb.addOrderBy('l.viewCount', 'DESC');
        qb.addOrderBy('l.inquiryCount', 'DESC');
        break;
      case ListingSortField.CREATED_AT:
      default:
        qb.addOrderBy('l.createdAt', direction);
        break;
    }

    qb.addOrderBy('l.id', 'ASC'); // tiebreaker for stable pagination
  }
}
