import { User } from '@prisma/client';

export interface RequestWithUser {
  user?: User & { permissions?: string[] };
}
