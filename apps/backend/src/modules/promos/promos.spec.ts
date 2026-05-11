/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

/**
 * Promo code validation flow. Admin /admin/promos endpoints create a code,
 * then we exercise the public /promos/validate path. The validate route is
 * auth-guarded — both buyer and agent tokens work.
 */
describe('Promo codes (integration)', () => {
  let app: INestApplication;
  let adminToken = '';
  let userToken = '';
  let createdCode = '';
  let createdId = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@eawlma.sa', password: 'Admin123!' });
    adminToken = adminLogin.body?.data?.tokens?.accessToken ?? '';

    const userLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'buyer1@eawlma.sa', password: 'Buyer123!' });
    userToken = userLogin.body?.data?.tokens?.accessToken ?? '';

    // Admin creates a 20% promo valid for 30 days.
    createdCode = `TEST_${Date.now()}`;
    const now = new Date();
    const inAMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/promos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: createdCode,
        type: 'percentage',
        discountValue: 20,
        minBookingAmount: 0,
        validFrom: now.toISOString(),
        validUntil: inAMonth.toISOString(),
        isActive: true,
        applicableTo: 'all',
      });
    createdId = created.body?.data?.id;
  }, 60_000);

  afterAll(async () => {
    if (createdId && adminToken) {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/promos/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    if (app) await app.close();
  });

  it('validates a freshly-created promo and reports a 20% discount', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/promos/validate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: createdCode, amount: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.discount).toBeCloseTo(200, 0);
  });

  it('marks an unknown code as invalid (200 with valid=false)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/promos/validate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: 'NO_SUCH_CODE', amount: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
  });

  it('rejects creating a promo without admin role (403)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/promos')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        code: `UNAUTH_${Date.now()}`,
        type: 'percentage',
        discountValue: 10,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86_400_000).toISOString(),
      });
    expect(res.status).toBe(403);
  });
});
