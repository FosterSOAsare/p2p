import type { UserRole } from "../features/auth/auth.model";

declare global {
  namespace Express {
    interface Request {
      /** Set by the auth middleware after verifying the Bearer token and loading the user from the DB. */
      user?: {
        id: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

export {};
