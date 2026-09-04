/**
 * Fills the marketplace out: several verified sellers, each with a stocked
 * storefront, and at least a few listings in every category.
 *
 * The marketplace only had 13 listings across 4 of its 18 categories, so most
 * of the category browser led to an empty page. This seeds enough that every
 * category has something behind it.
 *
 * Idempotent. Sellers are upserted by username and listings are matched on
 * (sellerId, title), so re-running tops up what is missing and changes nothing
 * else. It never touches existing users, listings, escrows or wallets.
 *
 * Sellers share the same seed password as `seed-users.ts` and by the same rule:
 * the hash is written on FIRST CREATE ONLY, so re-running will not clobber a
 * password that has since been changed.
 *
 * Usage:  npx tsx scripts/seed-sellers.ts
 *         npx tsx scripts/seed-sellers.ts --dry-run    # report, write nothing
 */
import argon2 from "argon2";
import { prisma } from "../src/shared/lib/prisma";

const DRY_RUN = process.argv.includes("--dry-run");

// Same argon2id parameters as auth.service.ts — a hash written here has to
// verify against the login path.
const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const PASSWORD = process.env.SEED_PASSWORD ?? "Password4u@1";

/** Unsplash delivery URLs. Every id here was checked to resolve 200. */
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&auto=format&fit=crop&q=80`;

interface SeedSeller {
  username: string;
  fullName: string;
  storeName: string;
  location: string;
}

const SELLERS: SeedSeller[] = [
  { username: "accra_techhub", fullName: "Kwame Mensah", storeName: "Accra Tech Hub", location: "Osu, Accra" },
  { username: "kumasi_gadgets", fullName: "Ama Boateng", storeName: "Kumasi Gadgets", location: "Adum, Kumasi" },
  { username: "tema_homestore", fullName: "Yaw Owusu", storeName: "Tema Home Store", location: "Community 1, Tema" },
  { username: "legon_threads", fullName: "Abena Asante", storeName: "Legon Threads", location: "East Legon, Accra" },
  { username: "takoradi_traders", fullName: "Kofi Annan", storeName: "Takoradi Traders", location: "Market Circle, Takoradi" },
  { username: "cape_collectibles", fullName: "Efua Sarpong", storeName: "Cape Collectibles", location: "Cape Coast" },
];

interface SeedItem {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  quantity: number;
  image: string;
}

/**
 * The catalogue. Every one of the 18 categories gets four items so no category
 * page is empty, and prices are in cedis at roughly plausible Ghanaian retail.
 */
const ITEMS: SeedItem[] = [
  // ── Electronics ────────────────────────────────────────────────
  { title: "Anker 737 Power Bank 24,000mAh", description: "140W output, charges a laptop and two phones at once. Boxed with USB-C cable.", price: 890, category: "Electronics", condition: "New", quantity: 6, image: img("1609091839311-d5365f9ff1c5") },
  { title: "Xiaomi Smart Band 8", description: "AMOLED display, 16-day battery, sleep and SpO2 tracking. Sealed.", price: 320, category: "Electronics", condition: "New", quantity: 12, image: img("1575311373937-040b8e1fd5b6") },
  { title: "TP-Link Archer AX55 Wi-Fi 6 Router", description: "Dual-band AX3000. Handles a full household without dropouts.", price: 760, category: "Electronics", condition: "New", quantity: 4, image: img("1606904825846-647eb07f5be2") },
  { title: "Solar Charge Controller 40A MPPT", description: "For off-grid setups. LCD readout, over-current protection.", price: 540, category: "Electronics", condition: "New", quantity: 5, image: img("1509391366360-2e959784a276") },

  // ── Phones & Tablets ───────────────────────────────────────────
  { title: "iPhone 13 Pro 256GB — Graphite", description: "Battery health 91%. No scratches, screen protector on since day one. Box and cable included.", price: 7200, category: "Phones & Tablets", condition: "Used - Like New", quantity: 1, image: img("1592921870789-04563d55041c") },
  { title: "Samsung Galaxy A54 5G 128GB", description: "Dual SIM, Awesome Violet. Under warranty until next year.", price: 3850, category: "Phones & Tablets", condition: "New", quantity: 3, image: img("1610945265064-0e34e5519bbf") },
  { title: "iPad 10th Gen 64GB Wi-Fi", description: "Silver, barely used. Ships with a folio case and charger.", price: 4100, category: "Phones & Tablets", condition: "Used - Good", quantity: 2, image: img("1544244015-0df4b3ffc6b0") },
  { title: "Tecno Spark 20 Pro 256GB", description: "Brand new, sealed. 108MP camera, 5000mAh battery.", price: 1750, category: "Phones & Tablets", condition: "New", quantity: 8, image: img("1511707171634-5f897ff02aa9") },

  // ── Computers & Laptops ────────────────────────────────────────
  { title: "MacBook Air M2 13\" 256GB", description: "Midnight. 38 charge cycles. Immaculate, with original 35W adapter.", price: 12500, category: "Computers & Laptops", condition: "Used - Like New", quantity: 1, image: img("1517336714731-489689fd1ca8") },
  { title: "Dell XPS 15 — i7, 16GB, 512GB", description: "4K OLED touch. Ideal for design and development work.", price: 11200, category: "Computers & Laptops", condition: "Used - Good", quantity: 1, image: img("1496181133206-80ce9b88a853") },
  { title: "Logitech MX Master 3S", description: "Quiet clicks, 8K DPI. Pairs with three machines at once.", price: 780, category: "Computers & Laptops", condition: "New", quantity: 10, image: img("1527864550417-7fd91fc51a46") },
  { title: "Samsung 980 NVMe SSD 1TB", description: "PCIe 3.0, 3500MB/s read. Sealed retail packaging.", price: 950, category: "Computers & Laptops", condition: "New", quantity: 7, image: img("1597872200969-2b65d56bd16b") },

  // ── Gaming & Consoles ──────────────────────────────────────────
  { title: "PlayStation 5 Slim Disc Edition", description: "Boxed with one DualSense controller. Bought in March, lightly used.", price: 8900, category: "Gaming & Consoles", condition: "Used - Like New", quantity: 1, image: img("1606813907291-d86efa9b94db") },
  { title: "Xbox Series X 1TB", description: "Includes two controllers and three months of Game Pass.", price: 8400, category: "Gaming & Consoles", condition: "Used - Good", quantity: 1, image: img("1621259182978-fbf93132d53d") },
  { title: "Nintendo Switch OLED — White", description: "Sealed. The OLED screen is a real step up for handheld play.", price: 4600, category: "Gaming & Consoles", condition: "New", quantity: 3, image: img("1578303512597-81e6cc155b3e") },
  { title: "Razer Kraken V3 Headset", description: "7.1 surround, THX spatial audio. Comfortable for long sessions.", price: 1150, category: "Gaming & Consoles", condition: "New", quantity: 6, image: img("1599669454699-248893623440") },

  // ── Cameras & Drones ───────────────────────────────────────────
  { title: "Canon EOS R50 + 18-45mm Kit", description: "Under 2,000 shutter actuations. Two batteries and a 64GB card included.", price: 9800, category: "Cameras & Drones", condition: "Used - Like New", quantity: 1, image: img("1502920917128-1aa500764cbd") },
  { title: "DJI Mini 3 Fly More Combo", description: "Three batteries, ND filters and the carry bag. Registered and ready to fly.", price: 11500, category: "Cameras & Drones", condition: "Used - Good", quantity: 1, image: img("1473968512647-3e447244af8f") },
  { title: "GoPro HERO12 Black", description: "Sealed. 5.3K60 video, waterproof to 10m without a housing.", price: 5400, category: "Cameras & Drones", condition: "New", quantity: 2, image: img("1526170375885-4d8ecf77b99f") },
  { title: "Godox SL60W Video Light", description: "Bowens mount with softbox and stand. Studio-steady output.", price: 1980, category: "Cameras & Drones", condition: "Used - Good", quantity: 2, image: img("1516035069371-29a1b244cc32") },

  // ── Audio & Headphones ─────────────────────────────────────────
  { title: "Sony WH-1000XM5", description: "Best-in-class noise cancelling. Case, cable and adapter included.", price: 3900, category: "Audio & Headphones", condition: "Used - Like New", quantity: 2, image: img("1505740420928-5e560c06d30e") },
  { title: "AirPods Pro (2nd Gen) USB-C", description: "Sealed Apple retail box. Adaptive audio and USB-C charging case.", price: 2650, category: "Audio & Headphones", condition: "New", quantity: 5, image: img("1600294037681-c80b4cb5b434") },
  { title: "JBL Flip 6 Bluetooth Speaker", description: "IP67 waterproof, 12 hours of playback. Loud for its size.", price: 1290, category: "Audio & Headphones", condition: "New", quantity: 9, image: img("1608043152269-423dbba4e7e1") },
  { title: "Audio-Technica AT2020 Mic", description: "Cardioid condenser. The standard starting microphone for recording.", price: 1450, category: "Audio & Headphones", condition: "Used - Good", quantity: 3, image: img("1590602847861-f357a9332bbc") },

  // ── TVs & Home Theater ─────────────────────────────────────────
  { title: "LG 55\" C3 OLED 4K TV", description: "Perfect blacks and 120Hz. Wall bracket included, stand unused.", price: 14500, category: "TVs & Home Theater", condition: "Used - Like New", quantity: 1, image: img("1593784991095-a205069470b6") },
  { title: "Samsung 43\" Crystal UHD 4K", description: "2024 model, sealed. Smart TV with built-in streaming apps.", price: 4300, category: "TVs & Home Theater", condition: "New", quantity: 4, image: img("1461151304267-38535e780c79") },
  { title: "Sonos Beam Gen 2 Soundbar", description: "Dolby Atmos in a compact bar. Transforms TV dialogue clarity.", price: 5900, category: "TVs & Home Theater", condition: "Used - Good", quantity: 1, image: img("1545454675-3531b543be5d") },
  { title: "Epson EH-TW740 Projector", description: "1080p, 3300 lumens. Bright enough for a room that isn't fully dark.", price: 6800, category: "TVs & Home Theater", condition: "New", quantity: 2, image: img("1478720568477-152d9b164e26") },

  // ── Home & Office ──────────────────────────────────────────────
  { title: "Ergonomic Mesh Office Chair", description: "Adjustable lumbar, 4D armrests, tilt lock. Assembled and tested.", price: 2200, category: "Home & Office", condition: "New", quantity: 5, image: img("1580480055273-228ff5388ef8") },
  { title: "Standing Desk 140x70cm", description: "Electric height adjustment with three memory presets. Oak top.", price: 3600, category: "Home & Office", condition: "New", quantity: 3, image: img("1595515106969-1ce29566ff1c") },
  { title: "Brother HL-L2350DW Printer", description: "Mono laser, duplex, Wi-Fi. Toner about half full.", price: 1450, category: "Home & Office", condition: "Used - Good", quantity: 2, image: img("1612815154858-60aa4c59eaa6") },
  { title: "Anglepoise LED Desk Lamp", description: "Three colour temperatures, USB charging port in the base.", price: 380, category: "Home & Office", condition: "New", quantity: 11, image: img("1507473885765-e6ed057f782c") },

  // ── Furniture ──────────────────────────────────────────────────
  { title: "3-Seater Fabric Sofa — Grey", description: "Firm cushions, no sagging. Pet-free and smoke-free home.", price: 4800, category: "Furniture", condition: "Used - Good", quantity: 1, image: img("1555041469-a586c61ea9bc") },
  { title: "Solid Wood Dining Table + 4 Chairs", description: "Mahogany, locally made. Seats four comfortably, six at a push.", price: 5200, category: "Furniture", condition: "New", quantity: 2, image: img("1617806118233-18e1de247200") },
  { title: "Queen Bed Frame with Storage", description: "Four drawers underneath. Flat-packed for transport.", price: 3400, category: "Furniture", condition: "New", quantity: 3, image: img("1505693416388-ac5ce068fe85") },
  { title: "Bookshelf — 5 Tier Oak", description: "Sturdy and deep enough for A4 files as well as books.", price: 980, category: "Furniture", condition: "Used - Like New", quantity: 4, image: img("1594620302200-9a762244a156") },

  // ── Appliances ─────────────────────────────────────────────────
  { title: "Nespresso Vertuo Next", description: "Barely used — bought and never got into the habit. Descaled.", price: 1650, category: "Appliances", condition: "Used - Like New", quantity: 1, image: img("1570481662006-a3a1374699e8") },
  { title: "Binatone 1.7L Electric Kettle", description: "Stainless steel, rapid boil, auto shut-off. Sealed.", price: 260, category: "Appliances", condition: "New", quantity: 15, image: img("1594213114663-d94db9b17125") },
  { title: "Hisense 205L Chest Freezer", description: "Energy-efficient, keeps cold for hours through outages.", price: 4200, category: "Appliances", condition: "New", quantity: 2, image: img("1571175443880-49e1d25b2bc5") },
  { title: "Philips Air Fryer XL 6.2L", description: "Feeds a family of five in one basket. Dishwasher-safe drawer.", price: 1890, category: "Appliances", condition: "New", quantity: 6, image: img("1585515320310-259814833e62") },

  // ── Fashion ────────────────────────────────────────────────────
  { title: "Handwoven Kente Stole", description: "Authentic Bonwire weave. Bold gold and green, ideal for graduation.", price: 850, category: "Fashion", condition: "New", quantity: 10, image: img("1594938298603-c8148c4dae35") },
  { title: "Nike Air Force 1 '07 — White", description: "UK 9. Worn three times, box and spare laces included.", price: 1250, category: "Fashion", condition: "Used - Like New", quantity: 1, image: img("1549298916-b41d501d3772") },
  { title: "Leather Weekender Bag", description: "Full-grain leather, brass hardware. Ages beautifully.", price: 1950, category: "Fashion", condition: "New", quantity: 4, image: img("1553062407-98eeb64c6a62") },
  { title: "Tailored Ankara Two-Piece", description: "Made to measure by a Makola tailor. Wax print, fully lined.", price: 720, category: "Fashion", condition: "New", quantity: 6, image: img("1490481651871-ab68de25d43d") },

  // ── Jewelry & Watches ──────────────────────────────────────────
  { title: "Seiko 5 Sports Automatic", description: "Field style on a nylon strap. Keeps time within a few seconds a day.", price: 2400, category: "Jewelry & Watches", condition: "Used - Like New", quantity: 1, image: img("1523170335258-f5ed11844a49") },
  { title: "Casio G-Shock GA-2100", description: "The \"CasiOak\". Shock resistant, 200m water resistance. Sealed.", price: 1550, category: "Jewelry & Watches", condition: "New", quantity: 4, image: img("1508057198894-247b23fe5ade") },
  { title: "Sterling Silver Cuff Bracelet", description: "Hand-finished by a Cape Coast silversmith. Adjustable fit.", price: 690, category: "Jewelry & Watches", condition: "New", quantity: 7, image: img("1611591437281-460bfbe1220a") },
  { title: "Gold-Plated Hoop Earrings", description: "18k plating over brass. Hypoallergenic posts.", price: 340, category: "Jewelry & Watches", condition: "New", quantity: 14, image: img("1515562141207-7a88fb7ce338") },

  // ── Beauty & Health ────────────────────────────────────────────
  { title: "Raw Ghanaian Shea Butter 1kg", description: "Unrefined, cold-pressed in the Northern Region. Nothing added.", price: 180, category: "Beauty & Health", condition: "New", quantity: 25, image: img("1556228720-195a672e8a03") },
  { title: "Dyson Supersonic Hair Dryer", description: "Genuine, with three attachments. Bought abroad, lightly used.", price: 4900, category: "Beauty & Health", condition: "Used - Good", quantity: 1, image: img("1522338140262-f46f5913618a") },
  { title: "Omron Blood Pressure Monitor", description: "Upper-arm cuff, clinically validated. Stores 60 readings.", price: 720, category: "Beauty & Health", condition: "New", quantity: 8, image: img("1631549916768-4119b2e5f926") },
  { title: "African Black Soap — 500g", description: "Traditional recipe with plantain ash and cocoa pod. Gentle on skin.", price: 95, category: "Beauty & Health", condition: "New", quantity: 30, image: img("1600857544200-b2f666a9a2ec") },

  // ── Sports & Fitness ───────────────────────────────────────────
  { title: "Adjustable Dumbbell Set 2x24kg", description: "Dial-a-weight, replaces fifteen pairs. Saves a lot of floor space.", price: 3800, category: "Sports & Fitness", condition: "Used - Good", quantity: 1, image: img("1638536532686-d610adfc8e5c") },
  { title: "Spalding NBA Official Basketball", description: "Indoor/outdoor composite. Size 7, pumped and ready.", price: 420, category: "Sports & Fitness", condition: "New", quantity: 12, image: img("1546519638-68e109498ffc") },
  { title: "Yoga Mat 6mm — Non-Slip", description: "TPE, odour-free, with a carry strap. Good grip when damp.", price: 240, category: "Sports & Fitness", condition: "New", quantity: 18, image: img("1592432678016-e910b452f9a2") },
  { title: "Foldable Treadmill 2.5HP", description: "Twelve programs, folds flat under a bed. Delivery within Accra.", price: 6200, category: "Sports & Fitness", condition: "Used - Like New", quantity: 1, image: img("1595078475328-1ab05d0a6a0e") },

  // ── Books & Media ──────────────────────────────────────────────
  { title: "Things Fall Apart — Chinua Achebe", description: "Paperback, good condition. Light spine creasing only.", price: 85, category: "Books & Media", condition: "Used - Good", quantity: 5, image: img("1544947950-fa07a98d237f") },
  { title: "Clean Code — Robert C. Martin", description: "The standard reference on writing maintainable software.", price: 320, category: "Books & Media", condition: "Used - Like New", quantity: 3, image: img("1532012197267-da84d127e765") },
  { title: "Vinyl — Fela Kuti, Zombie", description: "Reissue pressing. Sleeve and record both near mint.", price: 480, category: "Books & Media", condition: "Used - Like New", quantity: 2, image: img("1495707902641-75cac588d2e9") },
  { title: "Atomic Habits — James Clear", description: "Hardcover, unread. Bought two by mistake.", price: 210, category: "Books & Media", condition: "New", quantity: 6, image: img("1512820790803-83ca734da794") },

  // ── Baby & Kids ────────────────────────────────────────────────
  { title: "Chicco Bravo Travel System", description: "Pushchair and car seat. Cleaned thoroughly, all straps intact.", price: 2400, category: "Baby & Kids", condition: "Used - Good", quantity: 1, image: img("1586015555751-63bb77f4322a") },
  { title: "Wooden Building Blocks — 100pc", description: "Untreated beech, no sharp edges. Ages 2 and up.", price: 380, category: "Baby & Kids", condition: "New", quantity: 9, image: img("1503919545889-aef636e10ad4") },
  { title: "Convertible Baby Cot with Mattress", description: "Converts to a toddler bed. Solid pine, three height positions.", price: 1850, category: "Baby & Kids", condition: "Used - Like New", quantity: 2, image: img("1567721913486-6585f069b332") },
  { title: "Kids Balance Bike — Ages 2-5", description: "Lightweight frame, adjustable seat. Teaches balance before pedals.", price: 560, category: "Baby & Kids", condition: "New", quantity: 5, image: img("1597007066704-67bf2068d5b2") },

  // ── Vehicles ───────────────────────────────────────────────────
  { title: "Toyota Corolla 2015 — 1.8L", description: "128,000km, one owner, full service history. Registered and insured.", price: 89000, category: "Vehicles", condition: "Used - Good", quantity: 1, image: img("1590362891991-f776e747a588") },
  { title: "Honda CB125F Motorcycle", description: "Economical commuter, 2021. Recent service and new tyres.", price: 12500, category: "Vehicles", condition: "Used - Good", quantity: 1, image: img("1558981806-ec527fa84c39") },
  { title: "Bosch Car Battery 12V 70Ah", description: "Maintenance-free, two-year warranty. Fits most saloons.", price: 1150, category: "Vehicles", condition: "New", quantity: 6, image: img("1620714223084-8fcacc6dfd8d") },
  { title: "Michelin Tyres 205/55 R16 — Set of 4", description: "Primacy 4. Roughly 80% tread remaining across all four.", price: 3200, category: "Vehicles", condition: "Used - Good", quantity: 1, image: img("1580273916550-e323be2ae537") },

  // ── Collectibles ───────────────────────────────────────────────
  { title: "Ashanti Carved Wooden Stool", description: "Traditional form, hand-carved from a single block of sese wood.", price: 1600, category: "Collectibles", condition: "Used - Good", quantity: 1, image: img("1578662996442-48f60103fc96") },
  { title: "Vintage Ghana Postage Stamps", description: "Independence-era set, mounted in an album. Well preserved.", price: 950, category: "Collectibles", condition: "Used - Good", quantity: 1, image: img("1607083206968-13611e3d76db") },
  { title: "Adinkra Symbol Brass Weights", description: "Set of twelve goldweights, cast by the lost-wax method.", price: 2100, category: "Collectibles", condition: "Used - Good", quantity: 2, image: img("1589998059171-988d887df646") },
  { title: "Hand-Painted Kente Wall Art", description: "Framed original on canvas, 60x90cm. Signed by the artist.", price: 1400, category: "Collectibles", condition: "New", quantity: 3, image: img("1513519245088-0e12902e5a38") },
];

/** Deterministic per-title so re-running assigns the same seller each time. */
function ownerFor(title: string): SeedSeller {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SELLERS[h % SELLERS.length];
}

async function main() {
  if (DRY_RUN) console.log("— dry run: nothing will be written —\n");

  const passwordHash = DRY_RUN ? "" : await argon2.hash(PASSWORD, ARGON2_OPTS);
  const byUsername = new Map<string, string>();
  let sellersCreated = 0;

  for (const s of SELLERS) {
    if (DRY_RUN) {
      const existing = await prisma.user.findUnique({ where: { username: s.username } });
      console.log(`${existing ? "exists" : "CREATE"}  @${s.username} — ${s.storeName}`);
      if (existing) byUsername.set(s.username, existing.id);
      continue;
    }

    // Password written on create only — never clobbers one already changed.
    const user = await prisma.user.upsert({
      where: { username: s.username },
      create: {
        username: s.username,
        email: `${s.username}@veritrust.demo`,
        passwordHash,
        fullName: s.fullName,
        role: "user",
        emailVerifiedAt: new Date(),
      },
      update: { fullName: s.fullName },
    });
    if (!byUsername.has(s.username)) sellersCreated++;
    byUsername.set(s.username, user.id);

    // Verified KYC, so the storefront carries the seller badge the UI expects.
    await prisma.kycProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        legalName: s.fullName,
        storeName: s.storeName,
        country: "Ghana",
        address: s.location,
        idType: "national_id",
        idNumber: `GHA-${String(Math.abs(hash(s.username))).padStart(9, "0")}`,
        momoNumber: "+233200000000",
        status: "verified",
        reviewedAt: new Date(),
      },
      update: { status: "verified", storeName: s.storeName },
    });

    // A wallet, so a payout has somewhere to land.
    await prisma.wallet.upsert({
      where: { userId_currency: { userId: user.id, currency: "GHS" } },
      create: { userId: user.id, currency: "GHS", balance: 0 },
      update: {},
    });
  }

  let created = 0;
  let skipped = 0;

  for (const [i, item] of ITEMS.entries()) {
    const owner = ownerFor(item.title);
    const sellerId = byUsername.get(owner.username);
    if (!sellerId) {
      if (DRY_RUN) { created++; continue; }
      throw new Error(`no seller id for @${owner.username}`);
    }

    const exists = await prisma.listing.findFirst({
      where: { sellerId, title: item.title },
      select: { id: true },
    });
    if (exists) { skipped++; continue; }
    if (DRY_RUN) { created++; continue; }

    await prisma.listing.create({
      data: {
        sellerId,
        title: item.title,
        description: item.description,
        price: item.price,
        currency: "GHS",
        category: item.category,
        condition: item.condition,
        quantity: item.quantity,
        images: [item.image],
        location: owner.location,
        status: "active",
        // Deterministic filler until real view tracking exists — matches the
        // approach in seed-marketplace.ts.
        views: 40 + ((i * 53) % 900),
      },
    });
    created++;
  }

  const categories = new Set(ITEMS.map((i) => i.category));
  console.log(
    `\n${DRY_RUN ? "would create" : "sellers"}: ${DRY_RUN ? "" : `${sellersCreated} new, ${SELLERS.length - sellersCreated} existing`}`,
  );
  console.log(`listings: ${created} ${DRY_RUN ? "would be created" : "created"}, ${skipped} already existed`);
  console.log(`categories covered: ${categories.size}`);

  await prisma.$disconnect();
}

/** Small stable hash, only used to fabricate a plausible ID number. */
function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
