import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';

@Global()
@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class RequestContextModule implements NestModule {
  constructor(private readonly contextService: RequestContextService) {}

  configure(consumer: MiddlewareConsumer): void {
    const middleware = (req: Request, res: Response, next: NextFunction): void => {
      const requestId =
        (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
      res.setHeader('x-request-id', requestId);

      // The JWT strategy populates `req.user` later in the pipeline (after this
      // middleware runs), so we resolve the userId lazily inside the closure
      // by reading req.user when entries are made (see RequestContextService.get()).
      // For now we capture what we have at the request boundary; the audit
      // interceptor will refresh userId once auth resolves.
      this.contextService.run(
        {
          userId: null,
          userRole: null,
          ip: req.ip ?? null,
          userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
          requestId,
        },
        () => next(),
      );
    };
    consumer.apply(middleware).forRoutes('*');
  }
}
