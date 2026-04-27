import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'listing_daily_metrics' })
@Index('idx_metrics_listing', ['listingId'])
@Index('idx_metrics_date', ['date'])
export class ListingDailyMetricEntity {
  @PrimaryColumn({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @PrimaryColumn({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'integer', default: 0 })
  impressions: number;

  @Column({ type: 'integer', name: 'unique_impressions', default: 0 })
  uniqueImpressions: number;

  @Column({ type: 'integer', name: 'detail_views', default: 0 })
  detailViews: number;

  @Column({ type: 'integer', default: 0 })
  inquiries: number;

  @Column({ type: 'integer', default: 0 })
  saves: number;

  @Column({ type: 'integer', name: 'contact_clicks', default: 0 })
  contactClicks: number;

  @Column({ type: 'integer', name: 'whatsapp_clicks', default: 0 })
  whatsappClicks: number;

  @Column({ type: 'integer', name: 'phone_clicks', default: 0 })
  phoneClicks: number;

  /** Top-level referrers seen on this day. Bounded to ~20 keys per row. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  sources: Record<string, number>;

  /** Device breakdown — desktop / mobile / tablet / bot. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  devices: Record<string, number>;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
