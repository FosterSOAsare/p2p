/**
 * Seeds marketplace data:
 *  - a broad set of categories (idempotent upserts by slug)
 *  - the web client's mock products (web/src/features/marketplace/data/products.ts)
 *    as real Listing rows owned by the platform's verified seller
 *
 * No reviews are seeded — reviews come from real completed escrow deals.
 *
 * Usage:  npx tsx scripts/seed-marketplace.ts [sellerUsername]
 *         (omit the username to auto-pick the first KYC-verified seller)
 */
import { prisma } from "../src/shared/lib/prisma";
import { products } from "../../web/src/features/marketplace/data/products";

const CATEGORIES = [
  // the five the client mock data uses
  "Electronics",
  "Collectibles",
  "Home & Office",
  "Fashion",
  "Vehicles",
  // plus lots more for a realistic marketplace
  "Phones & Tablets",
  "Computers & Laptops",
  "Gaming & Consoles",
  "Cameras & Drones",
  "Audio & Headphones",
  "TVs & Home Theater",
  "Appliances",
  "Furniture",
  "Beauty & Health",
  "Sports & Fitness",
  "Books & Media",
  "Baby & Kids",
  "Jewelry & Watches",
  "Art & Crafts",
  "Musical Instruments",
  "Garden & Outdoor",
  "Pet Supplies",
  "Automotive Parts",
  "Tools & Industrial",
  "Groceries & Food",
  "Tickets & Events",
  "Services",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  // ---- categories ----
  for (const [position, name] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: slugify(name) },
      create: { name, slug: slugify(name), position },
      update: { name, position },
    });
  }
  console.log(`✅ ${CATEGORIES.length} categories upserted`);

  // ---- resolve the seller ----
  const username = process.argv[2];
  const seller = username
    ? await prisma.user.findUnique({ where: { username } })
    : (await prisma.kycProfile.findFirst({ where: { status: "verified" }, include: { user: true } }))?.user;

  if (!seller) {
    console.error(
      username
        ? `No user with username "${username}"`
        : "No KYC-verified seller found — approve one first or pass a username.",
    );
    process.exit(1);
  }
  console.log(`Seeding listings for seller @${seller.username}`);

  // ---- listings from the client mock data ----
  let created = 0;
  let skipped = 0;
  for (const [i, p] of products.entries()) {
    const exists = await prisma.listing.findFirst({
      where: { sellerId: seller.id, title: p.title },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.listing.create({
      data: {
        sellerId: seller.id,
        title: p.title,
        description: `${p.short}\n\n${p.description}`,
        price: p.price,
        currency: "GHS",
        category: p.category,
        condition: p.condition,
        quantity: p.quantity,
        images: p.images,
        location: p.location,
        status: "active",
        views: 120 + i * 37, // deterministic filler until real view tracking
      },
    });
    created++;
  }
  console.log(`✅ listings: ${created} created, ${skipped} already existed`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
