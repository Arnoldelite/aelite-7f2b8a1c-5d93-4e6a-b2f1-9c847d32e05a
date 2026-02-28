import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@org/auth';
import { Role, AuditAction, IJwtPayload } from '@org/data';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Owner, Role.Admin)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(@CurrentUser() user: IJwtPayload, @Request() req: { ip: string }) {
    await this.auditService.log({
      userId: user.sub,
      userEmail: user.email,
      action: AuditAction.ViewAuditLog,
      resource: 'AuditLog',
      ipAddress: req.ip,
    });
    return this.auditService.findAll();
  }
}
