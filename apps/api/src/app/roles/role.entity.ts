import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Role as RoleEnum } from '@org/data';

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: RoleEnum;

  @Column({ nullable: true })
  description!: string;
}
