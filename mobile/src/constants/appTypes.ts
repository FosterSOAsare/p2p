/**
 * The handful of app-wide shapes that aren't owned by a feature's data layer.
 *
 * These used to live in `constants/mockData.ts` alongside ~700 lines of invented
 * users, products, deals and notifications. Every screen has since moved onto
 * the API, so nothing imported those values any more — only these two types —
 * and the fake data was left sitting in the tree looking authoritative. It is
 * gone; this is what was actually still in use.
 *
 * Anything describing a server response belongs in that feature's `data/`
 * module instead (see `features/escrow/data/dealsApi.ts` and friends).
 */

/**
 * An image the UI can render: a bundled asset (what `import` gives you) or a
 * remote URL string, which is what listings from the API carry.
 */
export type ImageRef = string | number;

/**
 * The signed-in account, as the app's screens consume it.
 *
 * Note `role`: the server tracks `user | admin`, and `AuthContext` widens that
 * into the three personas the UI branches on — a KYC-verified user is a seller.
 */
export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: 'buyer' | 'seller' | 'admin';
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  createdAt: string;
}
