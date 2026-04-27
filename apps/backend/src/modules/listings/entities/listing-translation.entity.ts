import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingEntity } from './listing.entity';

@Entity({ name: 'listing_translations' })
@Index('uq_listing_translation_locale', ['listingId', 'locale'], { unique: true })
export class ListingTranslationEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => ListingEntity, (l) => l.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  /** BCP-47 locale code (`ar`, `en`, `fr`, `zh-Hans`, …). Source listing locales
   *  are constrained by `Locale` in shared-types, but AI-generated translations
   *  may target any of the 30 supported languages. */
  @Column({ type: 'varchar', length: 8 })
  locale: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'boolean', name: 'is_machine_translated', default: false })
  isMachineTranslated: boolean;

  @Column({ type: 'timestamptz', name: 'translated_at', nullable: true })
  translatedAt: Date | null;
}
