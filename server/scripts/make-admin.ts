/**
 * Promote (or demote) a user by username.
 * Usage:  npx tsx scripts/make-admin.ts <username> [user]
 *         npx tsx scripts/make-admin.ts kofi_dev        → role: admin
 *         npx tsx scripts/make-admin.ts kofi_dev user   → role: user
 */
import { prisma } from "../src/shared/lib/prisma";

async function main() {
  const username = process.argv[2];
  const role = process.argv[3] === "user" ? "user" : "admin";
  if (!username) {
    console.error("Usage: npx tsx scripts/make-admin.ts <username> [user]");
    process.exit(1);
  }
  const user = await prisma.user.update({ where: { username }, data: { role } }).catch(() => null);
  if (!user) {
    console.error(`No user with username "${username}"`);
    process.exit(1);
  }
  console.log(`✅ ${user.username} is now role: ${user.role}`);
  await prisma.$disconnect();
}

main();
