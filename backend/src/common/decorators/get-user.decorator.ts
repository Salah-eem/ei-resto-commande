import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the user object from the request.
 * This object is defined in the validate method of JwtStrategy.
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Cet objet a été défini dans la méthode validate de JwtStrategy
  },
);
