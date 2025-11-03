import { User } from '../models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      abacContext?: {
        allowedFields?: string[];
        deniedActions?: string[];
      };
    }
  }
}


