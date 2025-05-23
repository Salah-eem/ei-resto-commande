import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    console.log('ROLES:', requiredRoles, 'USER ROLE:', user.role, 'USER:', user);
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have the required role');
    }
    return true;
  }
}