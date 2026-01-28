import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ✅ SECURITY: Перевірка що user існує
    if (!user) {
      console.error('❌ RolesGuard: No user in request');
      return false;
    }

    // ✅ SECURITY: Перевірка що user має role
    if (!user.role) {
      console.error('❌ RolesGuard: User has no role', { userId: user.userId, email: user.email });
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      console.log(`⚠️ RolesGuard: User ${user.email} (${user.role}) tried to access ${requiredRoles.join(', ')} endpoint`);
    }

    return hasRole;
  }
}
