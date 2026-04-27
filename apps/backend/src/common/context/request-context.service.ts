import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId: string | null;
  userRole: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string;
}

/**
 * Per-request context propagated via Node's AsyncLocalStorage.
 *
 * The {@link RequestContextInterceptor} populates this on every HTTP request;
 * background workers (queue handlers, Kafka consumers) can call `runWith()`
 * to seed their own context for downstream loggers and the audit subscriber.
 */
@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(ctx: RequestContext, fn: () => T): T {
    return this.storage.run(ctx, fn);
  }

  get(): RequestContext | undefined {
    return this.storage.getStore();
  }

  /** Convenience accessor used by the audit subscriber and other services. */
  getActorId(): string | null {
    return this.storage.getStore()?.userId ?? null;
  }
}
