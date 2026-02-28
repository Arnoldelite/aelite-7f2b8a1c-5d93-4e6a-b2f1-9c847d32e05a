import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { IJwtPayload, ITask } from '@org/data';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly orgService: OrganizationsService,
  ) {}

  private toDto(task: Task): ITask {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      category: task.category,
      priority: task.priority,
      order: task.order,
      createdById: task.createdById,
      createdByName: task.createdBy
        ? `${task.createdBy.firstName} ${task.createdBy.lastName}`
        : '',
      organizationId: task.organizationId,
      organizationName: task.organization?.name ?? '',
      assignedToId: task.assignedToId,
      assignedToName: task.assignedTo
        ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
        : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async findAll(user: IJwtPayload): Promise<ITask[]> {
    const orgIds = await this.orgService.getOrgIdScope(user);
    const tasks = await this.taskRepo.find({
      where: { organizationId: In(orgIds) },
      relations: ['createdBy', 'organization', 'assignedTo'],
      order: { status: 'ASC', order: 'ASC', createdAt: 'ASC' },
    });
    return tasks.map((t) => this.toDto(t));
  }

  async findOne(id: string, user: IJwtPayload): Promise<ITask> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['createdBy', 'organization', 'assignedTo'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    await this.assertInScope(task, user);
    return this.toDto(task);
  }

  async create(dto: CreateTaskDto, user: IJwtPayload): Promise<ITask> {
    const maxOrder = await this.taskRepo
      .createQueryBuilder('task')
      .select('MAX(task.order)', 'max')
      .where('task.organizationId = :orgId AND task.status = :status', {
        orgId: user.orgId,
        status: dto.status ?? 'todo',
      })
      .getRawOne<{ max: number | null }>();

    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? 'todo',
      category: dto.category ?? 'Work',
      priority: dto.priority ?? 'medium',
      order: (maxOrder?.max ?? -1) + 1,
      createdById: user.sub,
      organizationId: user.orgId,
      assignedToId: dto.assignedToId ?? null,
    });

    const saved = await this.taskRepo.save(task);
    const full = await this.taskRepo.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'organization', 'assignedTo'],
    });
    return this.toDto(full!);
  }

  async update(id: string, dto: UpdateTaskDto, user: IJwtPayload): Promise<ITask> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['createdBy', 'organization', 'assignedTo'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    await this.assertInScope(task, user);

    Object.assign(task, dto);
    const saved = await this.taskRepo.save(task);
    const full = await this.taskRepo.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'organization', 'assignedTo'],
    });
    return this.toDto(full!);
  }

  async remove(id: string, user: IJwtPayload): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    await this.assertInScope(task, user);
    await this.taskRepo.remove(task);
  }

  private async assertInScope(task: Task, user: IJwtPayload): Promise<void> {
    const orgIds = await this.orgService.getOrgIdScope(user);
    if (!orgIds.includes(task.organizationId)) {
      throw new ForbiddenException('Access denied to this task');
    }
  }
}
