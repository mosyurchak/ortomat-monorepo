import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

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
      this.logger.error('RolesGuard: No user in request');
      return false;
    }

    // ✅ SECURITY: Перевірка що user має role
    if (!user.role) {
      this.logger.error(`RolesGuard: User has no role: ${user.userId}`);
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(`RolesGuard: User ${user.userId} (${user.role}) tried to access ${requiredRoles.join(', ')} endpoint`);
    }

    return hasRole;
  }
}
