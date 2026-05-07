import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  // For public routes we still want to attach `req.user` when a valid bearer
  // token is sent — endpoints like POST /inquiries change their validation
  // shape based on whether the request is authenticated, and without this
  // they'd treat every request as an anonymous guest.
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    try {
      const result = await super.canActivate(ctx);
      return Boolean(result);
    } catch (err) {
      if (isPublic) return true;
      throw err;
    }
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false,
    info: unknown,
    ctx: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      // Pass anonymous + invalid-token requests through unauthenticated;
      // the controller handler treats `undefined` user as a guest sender.
      return (user || undefined) as TUser;
    }
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    return user as TUser;
  }
}
