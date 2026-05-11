/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

/**
 * Public search lives at `/search/listings` — `/listings` is a CRUD scope for
 * the agent who owns the row, not a public index. Tests below target the real
 * endpoints, not the names from the spec stub.
 *
 * Response shape: TransformInterceptor wraps every reply as `{ data, timestamp }`,
 * and the search controller's own payload is `{ data: ListingResponseDto[], meta }`.
 * That stacks: `body.data.data` is the items array, `body.data.meta` is pagination.
 */
describe('Listings API (integration)', () => {
  let app: INestApplication;
  let agentToken = '';
  let adminToken = '';
  let userToken = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    const login = (email: string, password: string) =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .then((r) => r.body?.data?.tokens?.accessToken ?? '');

    agentToken = await login('agent1@eawlma.sa', 'Agent123!');
    adminToken = await login('admin@eawlma.sa', 'Admin123!');

    const userEmail = `buyer_${Date.now()}@test.com`;
    const userReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Buyer',
        lastName: 'Test',
        email: userEmail,
        password: 'Test1234!',
        phone: `+96650${String(Date.now()).slice(-7)}`,
        role: 'user',
      });
    userToken = userReg.body?.data?.tokens?.accessToken ?? '';
  }, 60_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('GET /search/listings (public)', () => {
    it('returns listings without auth', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/search/listings');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.meta).toBeDefined();
    });

    it('filters by city', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search/listings')
        .query({ city: 'Riyadh' });
      expect(res.status).toBe(200);
      for (const l of res.body.data.data as Array<{ city: string }>) {
        expect(l.city.toLowerCase()).toContain('riyadh');
      }
    });

    it('filters by price range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search/listings')
        .query({ minPrice: 500_000, maxPrice: 2_000_000 });
      expect(res.status).toBe(200);
      for (const l of res.body.data.data as Array<{ price: number }>) {
        expect(Number(l.price)).toBeGreaterThanOrEqual(500_000);
        expect(Number(l.price)).toBeLessThanOrEqual(2_000_000);
      }
    });

    it('paginates correctly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search/listings')
        .query({ page: 1, limit: 5 });
      expect(res.status).toBe(200);
      expect((res.body.data.data as unknown[]).length).toBeLessThanOrEqual(5);
    });

    it('survives SQL-injection style input', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search/listings')
        .query({ city: `'; DROP TABLE listings; --` });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /listings (create)', () => {
    const valid = () => ({
      type: 'sale' as const,
      propertyType: 'villa' as const,
      title: 'Test Villa',
      description: 'Spacious 4-bedroom villa in test district.',
      locale: 'en',
      price: 1_500_000,
      features: { bedrooms: 4, bathrooms: 3, area: 300 },
      address: {
        country: 'SA',
        region: 'Riyadh Region',
        city: 'Riyadh',
        district: 'Test District',
        street: 'Test St',
      },
      location: { lat: 24.7136, lng: 46.6753 },
    });

    it('requires authentication (401 without bearer)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send(valid());
      expect(res.status).toBe(401);
    });

    it('creates a listing as agent (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(valid());
      expect([201, 200]).toContain(res.status);
      expect(res.body.data.id).toBeDefined();
    });

    it('forbids USER role from creating a listing (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(valid());
      expect(res.status).toBe(403);
    });

    it('rejects negative price with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ ...valid(), price: -1000 });
      expect(res.status).toBe(400);
    });
  });

  describe('RBAC', () => {
    it('admin can list pending listings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/listings/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('agent cannot list admin pending listings (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/listings/pending')
        .set('Authorization', `Bearer ${agentToken}`);
      expect(res.status).toBe(403);
    });

    it('unauthenticated cannot list /listings/mine (401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/listings/mine');
      expect(res.status).toBe(401);
    });
  });
});
