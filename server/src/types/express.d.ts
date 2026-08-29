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
      /**
       * The signed-in user's KYC status, loaded alongside `user` by `auth`.
       *
       * Exists so `requireSeller` can decide without a second query for a fact
       * the previous middleware already had. `null` means no KYC profile yet.
       */
      authKycStatus?: string | null;
    }
  }
}

export {};
