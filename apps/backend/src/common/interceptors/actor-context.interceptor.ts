import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from '../context/request-context.service';
import type { RequestUser } from '../decorators/current-user.decorator';

/**
 * Once a request hits a controller, JwtAuthGuard has already resolved
 * `req.user`. Copy it into the AsyncLocalStorage so the audit subscriber +
 * downstream services can know who is mutating data.
 */
@Injectable()
export class ActorContextInterceptor implements NestInterceptor {
  constructor(private readonly contextService: RequestContextService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const user: RequestUser | undefined = req?.user;
    const store = this.contextService.get();
    if (store && user) {
      store.userId = user.id;
      store.userRole = user.role ?? null;
    }
    return next.handle();
  }
}
