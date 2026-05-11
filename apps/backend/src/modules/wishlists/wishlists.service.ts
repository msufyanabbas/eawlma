import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WishlistEntity } from './entities/wishlist.entity';
import { WishlistItemEntity } from './entities/wishlist-item.entity';
import { ListingEntity } from '../listings/entities/listing.entity';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(WishlistEntity)
    private readonly wishlists: Repository<WishlistEntity>,
    @InjectRepository(WishlistItemEntity)
    private readonly items: Repository<WishlistItemEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  /** Lazy-creates the default "Saved" list the first time a user touches the
   *  wishlist system. Returns the existing default if one already exists. */
  private async ensureDefault(userId: string): Promise<WishlistEntity> {
    const existing = await this.wishlists.findOne({
      where: { userId, isDefault: true },
    });
    if (existing) return existing;
    return this.wishlists.save(
      this.wishlists.create({
        userId,
        name: 'Saved',
        emoji: '⭐',
        isDefault: true,
      }),
    );
  }

  async listForUser(userId: string): Promise<WishlistEntity[]> {
    // Make sure the default list always exists so the UI never renders an
    // empty page on first visit.
    await this.ensureDefault(userId);
    return this.wishlists.find({
      where: { userId },
      relations: ['items'],
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async create(userId: string, name: string, emoji?: string): Promise<WishlistEntity> {
    const trimmed = name.trim();
    if (!trimmed) throw new ConflictException('Name required');
    return this.wishlists.save(
      this.wishlists.create({
        userId,
        name: trimmed,
        emoji: emoji?.slice(0, 8) ?? null,
        isDefault: false,
      }),
    );
  }

  async rename(id: string, userId: string, name: string, emoji?: string): Promise<WishlistEntity> {
    const list = await this.findOwned(id, userId);
    list.name = name.trim() || list.name;
    if (emoji !== undefined) list.emoji = emoji.slice(0, 8) || null;
    return this.wishlists.save(list);
  }

  async remove(id: string, userId: string): Promise<void> {
    const list = await this.findOwned(id, userId);
    if (list.isDefault) {
      throw new ForbiddenException('Cannot delete the default wishlist');
    }
    await this.wishlists.remove(list);
  }

  async addItem(wishlistId: string, userId: string, listingId: string): Promise<WishlistItemEntity> {
    const list = await this.findOwned(wishlistId, userId);
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    const existing = await this.items.findOne({ where: { wishlistId: list.id, listingId } });
    if (existing) return existing;
    return this.items.save(this.items.create({ wishlistId: list.id, listingId }));
  }

  async removeItem(wishlistId: string, userId: string, listingId: string): Promise<void> {
    const list = await this.findOwned(wishlistId, userId);
    await this.items.delete({ wishlistId: list.id, listingId });
  }

  async listItems(wishlistId: string, userId: string): Promise<ListingEntity[]> {
    const list = await this.findOwned(wishlistId, userId);
    const items = await this.items.find({
      where: { wishlistId: list.id },
      relations: ['listing', 'listing.media'],
      order: { createdAt: 'DESC' },
    });
    return items.map((i) => i.listing).filter((l): l is ListingEntity => Boolean(l));
  }

  private async findOwned(id: string, userId: string): Promise<WishlistEntity> {
    const list = await this.wishlists.findOne({ where: { id } });
    if (!list) throw new NotFoundException('Wishlist not found');
    if (list.userId !== userId) throw new ForbiddenException('Not your wishlist');
    return list;
  }
}
