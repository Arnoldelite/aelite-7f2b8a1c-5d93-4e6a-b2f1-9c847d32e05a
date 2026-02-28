import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard, CurrentUser } from '@org/auth';
import { IJwtPayload, AuditAction } from '@org/data';
import { AuditService } from '../audit/audit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Request() req: { ip: string }) {
    const result = await this.authService.login(dto);
    await this.auditService.log({
      userId: (result.user as { id: string }).id,
      userEmail: dto.email,
      action: AuditAction.Login,
      resource: 'Auth',
      ipAddress: req.ip,
    });
    return result;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    await this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      action: AuditAction.Register,
      resource: 'User',
      resourceId: user.id,
    });
    return { message: 'User created', id: user.id };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: IJwtPayload) {
    return user;
  }
}
