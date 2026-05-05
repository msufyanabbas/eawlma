import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@eawlma/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required for this resource');
    }

    if (!required.includes(user.role)) {
      throw new ForbiddenException(`Role "${user.role}" is not permitted to access this resource`);
    }
    return true;
  }
}
