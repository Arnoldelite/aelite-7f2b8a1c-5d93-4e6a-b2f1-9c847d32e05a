import { SetMetadata } from '@nestjs/common';
import { Role } from '@org/data';
import { ROLES_KEY } from '../constants.js';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
