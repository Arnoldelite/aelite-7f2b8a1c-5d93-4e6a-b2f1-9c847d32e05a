import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IJwtPayload } from '@org/data';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IJwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as IJwtPayload;
  },
);
