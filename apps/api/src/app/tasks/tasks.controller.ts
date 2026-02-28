import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@org/auth';
import { Role, AuditAction, IJwtPayload } from '@org/data';
import { AuditService } from '../audit/audit.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: IJwtPayload, @Request() req: { ip: string }) {
    const tasks = await this.tasksService.findAll(user);
    await this.auditService.log({
      userId: user.sub,
      userEmail: user.email,
      action: AuditAction.ViewTasks,
      resource: 'Task',
      ipAddress: req.ip,
    });
    return tasks;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: IJwtPayload,
    @Request() req: { ip: string },
  ) {
    const task = await this.tasksService.create(dto, user);
    await this.auditService.log({
      userId: user.sub,
      userEmail: user.email,
      action: AuditAction.CreateTask,
      resource: 'Task',
      resourceId: task.id,
      details: { title: task.title },
      ipAddress: req.ip,
    });
    return task;
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: IJwtPayload,
    @Request() req: { ip: string },
  ) {
    const task = await this.tasksService.update(id, dto, user);
    await this.auditService.log({
      userId: user.sub,
      userEmail: user.email,
      action: AuditAction.UpdateTask,
      resource: 'Task',
      resourceId: id,
      details: dto as Record<string, unknown>,
      ipAddress: req.ip,
    });
    return task;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: IJwtPayload,
    @Request() req: { ip: string },
  ) {
    await this.tasksService.remove(id, user);
    await this.auditService.log({
      userId: user.sub,
      userEmail: user.email,
      action: AuditAction.DeleteTask,
      resource: 'Task',
      resourceId: id,
      ipAddress: req.ip,
    });
  }
}
