/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

/**
 * Integration tests for the auth flow. Requires the dev Postgres + Redis to be
 * running and the database to have been seeded with the standard test users
 * (admin@eawlma.sa / agent1@eawlma.sa / buyer1@eawlma.sa).
 *
 * Wire shapes asserted here are deliberately tied to the real backend:
 *   • TransformInterceptor wraps every body as `{ data, timestamp }`.
 *   • AuthResponse is `{ user, tokens: { accessToken, refreshToken, ... } }`.
 */
describe('Auth (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    // Mirror the main bootstrap pipeline so DTOs are validated identically.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  }, 60_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /auth/register', () => {
    it('registers a new user and returns access + refresh tokens', async () => {
      const email = `test_${Date.now()}@test.com`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email,
          password: 'Test1234!',
          phone: `+96650${String(Date.now()).slice(-7)}`,
          role: 'user',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(email);
    });

    it('rejects duplicate email with 409', async () => {
      const email = `dup_${Date.now()}@test.com`;
      const base = {
        firstName: 'A',
        lastName: 'B',
        password: 'Test1234!',
        role: 'user',
      };
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...base, email, phone: `+96650${String(Date.now() + 1).slice(-7)}` });
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...base, email, phone: `+96650${String(Date.now() + 2).slice(-7)}` });
      expect(res.status).toBe(409);
    });

    it('rejects weak password (< 8 chars) with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: `weak_${Date.now()}@test.com`,
          password: '123',
          phone: '+966500000004',
          role: 'user',
        });
      expect(res.status).toBe(400);
    });

    it('rejects invalid email with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'not-an-email',
          password: 'Test1234!',
          phone: '+966500000005',
          role: 'user',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in seeded admin and returns tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@eawlma.sa', password: 'Admin123!' });
      expect(res.status).toBe(200);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('admin');
    });

    it('rejects wrong password with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@eawlma.sa', password: 'WrongPass1!' });
      expect(res.status).toBe(401);
    });

    it('rejects non-existent user with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'Test1234!' });
      expect(res.status).toBe(401);
    });
  });

  describe('Rate limiting (5/min on login)', () => {
    it('blocks the 6th login attempt with 429', async () => {
      // Hit a distinctly-failing endpoint (wrong password) 6 times rapidly.
      const results = await Promise.all(
        Array.from({ length: 6 }).map(() =>
          request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ email: 'rate_limit_probe@test.com', password: 'wrong' }),
        ),
      );
      const rateLimited = results.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
