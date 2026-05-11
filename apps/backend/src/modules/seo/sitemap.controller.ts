import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingStatus } from '@eawlma/shared-types';

import { Public } from '../../common/decorators/public.decorator';
import { ListingEntity } from '../listings/entities/listing.entity';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  priority: string;
  changefreq: string;
}

@Controller('sitemap.xml')
export class SitemapController {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap(): Promise<string> {
    const baseUrl = (
      this.config.get<string>('app.frontendUrl') ?? 'https://eawlma.sa'
    ).replace(/\/$/, '');

    const listings = await this.listings.find({
      where: { status: ListingStatus.ACTIVE },
      select: ['id', 'updatedAt'],
      take: 5000,
    });

    const urls: SitemapUrl[] = [
      { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/search`, priority: '0.9', changefreq: 'daily' },
      { loc: `${baseUrl}/stays`, priority: '0.8', changefreq: 'daily' },
      { loc: `${baseUrl}/hotels`, priority: '0.8', changefreq: 'daily' },
      { loc: `${baseUrl}/agents`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${baseUrl}/market`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${baseUrl}/about`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${baseUrl}/contact`, priority: '0.5', changefreq: 'monthly' },
      ...listings.map<SitemapUrl>((l) => ({
        loc: `${baseUrl}/listings/${l.id}`,
        lastmod: l.updatedAt.toISOString().split('T')[0],
        priority: '0.8',
        changefreq: 'weekly',
      })),
    ];

    const body = urls
      .map((u) => {
        const parts = [
          `    <loc>${u.loc}</loc>`,
          u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
          `    <changefreq>${u.changefreq}</changefreq>`,
          `    <priority>${u.priority}</priority>`,
        ]
          .filter(Boolean)
          .join('\n');
        return `  <url>\n${parts}\n  </url>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
  }
}
