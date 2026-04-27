import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import type Redis from 'ioredis';
import { REDIS_DEFAULT } from '../../common/redis/redis.module';
import { ListingDailyMetricEntity } from './entities/listing-daily-metric.entity';

const CACHE_TTL_SECONDS = 5 * 60;

interface RangeBounds {
  fromIso: string; // YYYY-MM-DD inclusive
  toIso: string; // YYYY-MM-DD inclusive
}

export interface MetricBumpInput {
  listingId: string;
  /** UTC date (defaults to today). Pass an explicit value to backfill. */
  date?: string;
  field:
    | 'impressions'
    | 'uniqueImpressions'
    | 'detailViews'
    | 'inquiries'
    | 'saves'
    | 'contactClicks'
    | 'whatsappClicks'
    | 'phoneClicks';
  by?: number;
  source?: string;
  device?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(ListingDailyMetricEntity)
    private readonly metrics: Repository<ListingDailyMetricEntity>,
    private readonly dataSource: DataSource,
    @Inject(REDIS_DEFAULT) private readonly redis: Redis,
  ) {}

  // ---------- Aggregation -----------------------------------------------

  async bump(input: MetricBumpInput): Promise<void> {
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const inc = input.by ?? 1;
    const sourceJson = input.source
      ? JSON.stringify({ [input.source]: inc })
      : '{}';
    const deviceJson = input.device
      ? JSON.stringify({ [input.device]: inc })
      : '{}';

    // Postgres UPSERT — INSERT … ON CONFLICT … DO UPDATE.
    // Sources/devices are merged via jsonb_object_agg of the union of keys.
    await this.dataSource.query(
      `
        INSERT INTO listing_daily_metrics
          (listing_id, date, impressions, unique_impressions, detail_views, inquiries, saves,
           contact_clicks, whatsapp_clicks, phone_clicks, sources, devices, updated_at)
        VALUES ($1, $2,
          $3, $4, $5, $6, $7, $8, $9, $10,
          $11::jsonb, $12::jsonb, now())
        ON CONFLICT (listing_id, date) DO UPDATE SET
          impressions        = listing_daily_metrics.impressions        + EXCLUDED.impressions,
          unique_impressions = listing_daily_metrics.unique_impressions + EXCLUDED.unique_impressions,
          detail_views       = listing_daily_metrics.detail_views       + EXCLUDED.detail_views,
          inquiries          = listing_daily_metrics.inquiries          + EXCLUDED.inquiries,
          saves              = listing_daily_metrics.saves              + EXCLUDED.saves,
          contact_clicks     = listing_daily_metrics.contact_clicks     + EXCLUDED.contact_clicks,
          whatsapp_clicks    = listing_daily_metrics.whatsapp_clicks    + EXCLUDED.whatsapp_clicks,
          phone_clicks       = listing_daily_metrics.phone_clicks       + EXCLUDED.phone_clicks,
          sources            = (
            SELECT jsonb_object_agg(key, value::int)
            FROM (
              SELECT key, sum(value::int) AS value FROM (
                SELECT * FROM jsonb_each_text(listing_daily_metrics.sources)
                UNION ALL SELECT * FROM jsonb_each_text(EXCLUDED.sources)
              ) merged GROUP BY key
            ) folded
          ),
          devices            = (
            SELECT jsonb_object_agg(key, value::int)
            FROM (
              SELECT key, sum(value::int) AS value FROM (
                SELECT * FROM jsonb_each_text(listing_daily_metrics.devices)
                UNION ALL SELECT * FROM jsonb_each_text(EXCLUDED.devices)
              ) merged GROUP BY key
            ) folded
          ),
          updated_at = now()
      `,
      [
        input.listingId,
        date,
        input.field === 'impressions' ? inc : 0,
        input.field === 'uniqueImpressions' ? inc : 0,
        input.field === 'detailViews' ? inc : 0,
        input.field === 'inquiries' ? inc : 0,
        input.field === 'saves' ? inc : 0,
        input.field === 'contactClicks' ? inc : 0,
        input.field === 'whatsappClicks' ? inc : 0,
        input.field === 'phoneClicks' ? inc : 0,
        sourceJson,
        deviceJson,
      ],
    );

    // Invalidate cache for this listing's recent windows. Redis DEL doesn't
    // accept globs, so we list matching keys (bounded to ~5 per listing) and
    // unlink them in one shot.
    await this.purgeCachePattern(this.cacheKey(input.listingId, '*'));
    // Also purge the agent's dashboard caches since their numbers depend on
    // listings they own. We don't know the agent here; let them expire via
    // TTL — 5 minutes is the SLA for dashboard freshness.
  }

  private async purgeCachePattern(pattern: string): Promise<void> {
    try {
      // ioredis's keyPrefix is auto-applied to commands but `keys()` returns
      // keys WITH the prefix included. If we then pass those back into del(),
      // ioredis prepends the prefix again — yielding non-matching key names.
      // Strip it so del() lands on the right rows.
      const prefix = (this.redis.options.keyPrefix as string | undefined) ?? '';
      const matched = await this.redis.keys(pattern);
      if (matched.length === 0) return;
      const stripped = prefix
        ? matched.map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k))
        : matched;
      await this.redis.del(...stripped);
    } catch (err) {
      this.logger.warn(`Cache purge failed for ${pattern}: ${(err as Error).message}`);
    }
  }

  // ---------- Reads (Redis-cached, 5-min TTL) ---------------------------

  async listingViewsOverTime(
    listingId: string,
    rangeDays = 30,
  ): Promise<Array<{ date: string; impressions: number; detailViews: number; inquiries: number }>> {
    const cacheKey = this.cacheKey(listingId, `views:${rangeDays}`);
    const cached = await this.fromCache<typeof out>(cacheKey);
    if (cached) return cached;

    const { fromIso, toIso } = this.range(rangeDays);
    const rows = await this.metrics.find({
      where: { listingId, date: Between(fromIso, toIso) },
      order: { date: 'ASC' },
    });
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const out: Array<{ date: string; impressions: number; detailViews: number; inquiries: number }> = [];
    for (const date of this.daysIn(rangeDays)) {
      const r = byDate.get(date);
      out.push({
        date,
        impressions: r?.impressions ?? 0,
        detailViews: r?.detailViews ?? 0,
        inquiries: r?.inquiries ?? 0,
      });
    }
    await this.toCache(cacheKey, out);
    return out;
  }

  async listingFunnel(
    listingId: string,
    rangeDays = 30,
  ): Promise<{ impressions: number; detailViews: number; inquiries: number; conversionRate: number }> {
    const cacheKey = this.cacheKey(listingId, `funnel:${rangeDays}`);
    const cached = await this.fromCache<typeof result>(cacheKey);
    if (cached) return cached;

    const { fromIso, toIso } = this.range(rangeDays);
    const summed = await this.metrics
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.impressions), 0)', 'impressions')
      .addSelect('COALESCE(SUM(m.detail_views), 0)', 'detail_views')
      .addSelect('COALESCE(SUM(m.inquiries), 0)', 'inquiries')
      .where('m.listing_id = :id', { id: listingId })
      .andWhere('m.date BETWEEN :from AND :to', { from: fromIso, to: toIso })
      .getRawOne<{ impressions: string; detail_views: string; inquiries: string }>();
    const impressions = Number(summed?.impressions ?? 0);
    const detailViews = Number(summed?.detail_views ?? 0);
    const inquiries = Number(summed?.inquiries ?? 0);
    const result = {
      impressions,
      detailViews,
      inquiries,
      conversionRate: detailViews > 0 ? +((inquiries / detailViews) * 100).toFixed(2) : 0,
    };
    await this.toCache(cacheKey, result);
    return result;
  }

  async listingTrafficSources(
    listingId: string,
    rangeDays = 30,
  ): Promise<Array<{ source: string; count: number }>> {
    const cacheKey = this.cacheKey(listingId, `sources:${rangeDays}`);
    const cached = await this.fromCache<typeof out>(cacheKey);
    if (cached) return cached;

    const { fromIso, toIso } = this.range(rangeDays);
    const rows = await this.metrics.find({
      where: { listingId, date: Between(fromIso, toIso) },
    });
    const totals = new Map<string, number>();
    for (const r of rows) {
      for (const [k, v] of Object.entries(r.sources ?? {})) {
        totals.set(k, (totals.get(k) ?? 0) + Number(v));
      }
    }
    const out = Array.from(totals.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    await this.toCache(cacheKey, out);
    return out;
  }

  async listingDeviceBreakdown(
    listingId: string,
    rangeDays = 30,
  ): Promise<Array<{ device: string; count: number }>> {
    const cacheKey = this.cacheKey(listingId, `devices:${rangeDays}`);
    const cached = await this.fromCache<typeof out>(cacheKey);
    if (cached) return cached;

    const { fromIso, toIso } = this.range(rangeDays);
    const rows = await this.metrics.find({
      where: { listingId, date: Between(fromIso, toIso) },
    });
    const totals = new Map<string, number>();
    for (const r of rows) {
      for (const [k, v] of Object.entries(r.devices ?? {})) {
        totals.set(k, (totals.get(k) ?? 0) + Number(v));
      }
    }
    const out = Array.from(totals.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);
    await this.toCache(cacheKey, out);
    return out;
  }

  async agentDashboard(
    agentId: string,
    rangeDays = 30,
  ): Promise<{
    rangeStart: string;
    rangeEnd: string;
    totalImpressions: number;
    totalDetailViews: number;
    totalInquiries: number;
    conversionRate: number;
    activeListings: number;
  }> {
    const cacheKey = `analytics:agent:${agentId}:${rangeDays}`;
    const cached = await this.fromCache<typeof result>(cacheKey);
    if (cached) return cached;

    const { fromIso, toIso } = this.range(rangeDays);
    const summed = await this.dataSource.query(
      `
        SELECT
          COALESCE(SUM(m.impressions), 0)::int   AS impressions,
          COALESCE(SUM(m.detail_views), 0)::int  AS detail_views,
          COALESCE(SUM(m.inquiries), 0)::int     AS inquiries
        FROM listing_daily_metrics m
        INNER JOIN listings l ON l.id = m.listing_id
        WHERE l.owner_id = $1 AND m.date BETWEEN $2 AND $3
      `,
      [agentId, fromIso, toIso],
    );
    const activeListings = await this.dataSource.query(
      `SELECT COUNT(*)::int AS c FROM listings WHERE owner_id = $1 AND status = 'active' AND deleted_at IS NULL`,
      [agentId],
    );
    const impressions = Number(summed?.[0]?.impressions ?? 0);
    const detailViews = Number(summed?.[0]?.detail_views ?? 0);
    const inquiries = Number(summed?.[0]?.inquiries ?? 0);
    const result = {
      rangeStart: fromIso,
      rangeEnd: toIso,
      totalImpressions: impressions,
      totalDetailViews: detailViews,
      totalInquiries: inquiries,
      conversionRate: detailViews > 0 ? +((inquiries / detailViews) * 100).toFixed(2) : 0,
      activeListings: Number(activeListings?.[0]?.c ?? 0),
    };
    await this.toCache(cacheKey, result);
    return result;
  }

  // ---------- Helpers ---------------------------------------------------

  private cacheKey(listingId: string, suffix: string): string {
    return `analytics:listing:${listingId}:${suffix}`;
  }

  private async fromCache<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private async toCache(key: string, value: unknown): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
    } catch {
      // Cache failures are non-fatal.
    }
  }

  private range(rangeDays: number): RangeBounds {
    const today = new Date();
    const from = new Date(today.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
    return {
      fromIso: from.toISOString().slice(0, 10),
      toIso: today.toISOString().slice(0, 10),
    };
  }

  private daysIn(rangeDays: number): string[] {
    const out: string[] = [];
    const today = new Date();
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }
}
