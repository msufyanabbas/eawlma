/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

/**
 * Wallet endpoints. The real shape is `{ wallet: { balance, … }, recentTransactions }`
 * — NOT a flat `{ balance }` as the spec stub assumed.
 */
describe('Wallet API (integration)', () => {
  let app: INestApplication;
  let agentToken = '';

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

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'agent1@eawlma.sa', password: 'Agent123!' });
    agentToken = login.body?.data?.tokens?.accessToken ?? '';
  }, 60_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('returns the agent wallet on GET /wallet/me (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/wallet/me')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.wallet).toBeDefined();
    expect(res.body.data.wallet.balance).toBeDefined();
  });

  it('blocks anonymous access to /wallet/me with 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/wallet/me');
    expect(res.status).toBe(401);
  });

  it('rejects payout below the minimum threshold (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payouts/request')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        amount: 50, // below 100 SAR minimum
        iban: 'SA0380000000608010167519',
        bankName: 'Al Rajhi Bank',
      });
    expect(res.status).toBe(400);
  });

  it('rejects malformed IBAN (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payouts/request')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        amount: 500,
        iban: 'INVALID_IBAN',
        bankName: 'Al Rajhi Bank',
      });
    expect(res.status).toBe(400);
  });
});
