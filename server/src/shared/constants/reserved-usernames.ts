/** Usernames rejected at signup (docs/13 §13.2). Mirror this list in the web client for pre-validation. */
export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "support",
  "help",
  "taas",
  "escrow",
  "payments",
  "api",
  "root",
  "system",
  "moderator",
  "arbitrator",
  "driver",
  "official",
  "security",
] as const;
