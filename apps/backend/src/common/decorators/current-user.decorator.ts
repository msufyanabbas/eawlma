import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@aqarat/shared-types';

export interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
  jti?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
