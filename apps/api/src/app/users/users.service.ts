import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
      relations: ['organization', 'role'],
    });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['organization', 'role'],
    });
  }

  findByOrg(orgId: string): Promise<User[]> {
    return this.repo.find({
      where: { organizationId: orgId },
      relations: ['role'],
    });
  }

  save(user: Partial<User>): Promise<User> {
    return this.repo.save(user);
  }
}
