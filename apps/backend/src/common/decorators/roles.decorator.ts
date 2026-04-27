import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@aqarat/shared-types';

export const ROLES_KEY = 'roles';

/** Restrict access to one or more user roles. Used with RolesGuard. */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
