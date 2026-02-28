import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';
import { IJwtPayload, Role } from '@org/data';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
  ) {}

  findAll(): Promise<Organization[]> {
    return this.repo.find({ relations: ['parent', 'children'] });
  }

  findById(id: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { id }, relations: ['parent', 'children'] });
  }

  findByName(name: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { name } });
  }

  save(org: Partial<Organization>): Promise<Organization> {
    return this.repo.save(org);
  }

  /**
   * Returns org IDs that the given user can see tasks from.
   * Owner of a parent org sees own org + all child orgs.
   * Everyone else sees only their own org.
   */
  async getOrgIdScope(user: IJwtPayload): Promise<string[]> {
    if (user.role === Role.Owner && !user.parentOrgId) {
      const children = await this.repo.find({
        where: { parentOrganizationId: user.orgId },
      });
      return [user.orgId, ...children.map((c) => c.id)];
    }
    return [user.orgId];
  }
}
