/**
 * Centralized mock data for the P2P Marketplace mobile app.
 * Used across all screens until backend API is integrated.
 */

/* ── Product photos ───────────────────────────────────────────────
 * Bundled with the app rather than fetched from a URL. Remote images
 * failed on device with an SSL handshake error: Android apps validate
 * certificates against the system trust store, which is out of date on
 * older phones (the browser passes because Chrome ships its own list).
 * Local files sidestep the network entirely and work offline.
 * ---------------------------------------------------------------- */

import macbook1 from '@/assets/images/products/macbook-1.jpg';
import macbook2 from '@/assets/images/products/macbook-2.jpg';
import camera1 from '@/assets/images/products/camera-1.jpg';
import camera2 from '@/assets/images/products/camera-2.jpg';
import chair1 from '@/assets/images/products/chair-1.jpg';
import iphone1 from '@/assets/images/products/iphone-1.jpg';
import iphone2 from '@/assets/images/products/iphone-2.jpg';
import ps5 from '@/assets/images/products/ps5-1.jpg';
import kente1 from '@/assets/images/products/kente-1.jpg';
import keyboard1 from '@/assets/images/products/keyboard-1.jpg';
import usbHub1 from '@/assets/images/products/usb-hub-1.jpg';

/* ── Types ────────────────────────────────────────────────────── */

/**
 * An image the UI can render: a bundled asset (what `import` gives you) or a
 * remote URL string, once listings come from the API.
 */
export type ImageRef = string | number;

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

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  condition: string;
  quantity: number;
  images: ImageRef[];
  location: string;
  status: 'active' | 'draft' | 'out_of_stock';
  vendor: {
    username: string;
    storeName: string;
    verified: boolean;
    rating: number;
    reviewCount: number;
    avatarUrl?: string;
  };
  reviews: Review[];
  savedCount: number;
  viewCount: number;
  createdAt: string;
}

export interface Review {
  id: string;
  fromUser: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface EscrowDeal {
  id: string;
  code: string;
  title: string;
  status: 'created' | 'funded' | 'shipped' | 'delivered' | 'released' | 'disputed' | 'refunded';
  amount: number;
  currency: string;
  rail: 'fiat' | 'crypto';
  creator: { username: string; storeName?: string };
  counterparty: { username: string; storeName?: string };
  description: string;
  releaseCondition: string;
  tracking?: { carrier: string; code: string };
  events: EscrowEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface EscrowEvent {
  id: string;
  type: string;
  description: string;
  actor: string;
  createdAt: string;
}

export interface Order {
  id: string;
  dealId: string;
  listingTitle: string;
  listingImage: ImageRef;
  quantity: number;
  amount: number;
  currency: string;
  status: 'escrow_funded' | 'shipped' | 'delivered' | 'released' | 'disputed';
  vendor: { username: string; storeName: string };
  buyer: { username: string };
  tracking?: { carrier: string; code: string };
  createdAt: string;
}

export interface KycSubmission {
  id: string;
  userId: string;
  username: string;
  storeName: string;
  legalName: string;
  country: string;
  idType: string;
  idNumber: string;
  taxId?: string;
  address: string;
  momoNumber: string;
  trxAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  decidedAt?: string;
  avatarUrl?: string;
  email?: string;
  joinDate?: string;
}

export interface SellerListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  status: 'active' | 'draft' | 'out_of_stock';
  quantity: number;
  imageUrl: ImageRef;
  viewCount: number;
  reviewCount: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

/* ── Mock Current User ────────────────────────────────────────── */

export const mockCurrentUser: User = {
  id: 'u-001',
  username: 'kofi_buyer',
  fullName: 'Kofi Mensah',
  email: 'kofi@example.com',
  phone: '+233 24 123 4567',
  role: 'buyer',
  kycStatus: 'unverified',
  createdAt: '2024-09-15T10:30:00Z',
};

export const mockSellerUser: User = {
  id: 'u-002',
  username: 'kwame_tech',
  fullName: 'Kwame Asante',
  email: 'kwame@example.com',
  phone: '+233 20 987 6543',
  role: 'seller',
  kycStatus: 'verified',
  createdAt: '2024-06-01T08:00:00Z',
};

export const mockAdminUser: User = {
  id: 'u-003',
  username: 'admin_ama',
  fullName: 'Ama Darko',
  email: 'ama@p2p-admin.com',
  role: 'admin',
  kycStatus: 'verified',
  createdAt: '2024-01-01T00:00:00Z',
};

/* ── Categories ───────────────────────────────────────────────── */

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Electronics', icon: 'laptop-outline' },
  { id: 'cat-2', name: 'Phones', icon: 'phone-portrait-outline' },
  { id: 'cat-3', name: 'Cameras', icon: 'camera-outline' },
  { id: 'cat-4', name: 'Gaming', icon: 'game-controller-outline' },
  { id: 'cat-5', name: 'Fashion', icon: 'shirt-outline' },
  { id: 'cat-6', name: 'Home & Office', icon: 'home-outline' },
  { id: 'cat-7', name: 'Vehicles', icon: 'car-outline' },
  { id: 'cat-8', name: 'Services', icon: 'construct-outline' },
];

/* ── Products ─────────────────────────────────────────────────── */

export const mockProducts: Product[] = [
  {
    id: 'p-001',
    title: 'MacBook Pro 14" M3 Pro',
    description: 'Brand new MacBook Pro 14-inch with M3 Pro chip, 18GB RAM, 512GB SSD. Sealed in box with full Apple warranty. Perfect for professionals and creators.',
    price: 12500,
    currency: 'GH₵',
    category: 'Electronics',
    condition: 'Brand New',
    quantity: 3,
    images: [macbook1, macbook2],
    location: 'Accra, Ghana',
    status: 'active',
    vendor: {
      username: 'kwame_tech',
      storeName: 'Kwame Tech Hub',
      verified: true,
      rating: 4.8,
      reviewCount: 124,
    },
    reviews: [
      { id: 'r-1', fromUser: 'esi_buyer', rating: 5, comment: 'Fast delivery, genuine product!', createdAt: '2025-03-10T14:00:00Z' },
      { id: 'r-2', fromUser: 'yaw_k', rating: 4, comment: 'Great seller, item as described.', createdAt: '2025-03-08T09:30:00Z' },
    ],
    savedCount: 45,
    viewCount: 890,
    createdAt: '2025-02-15T10:00:00Z',
  },
  {
    id: 'p-002',
    title: 'Canon EOS R5 Mirrorless Camera',
    description: 'Professional-grade mirrorless camera with 45MP full-frame sensor. Includes RF 24-105mm f/4L lens. Lightly used, excellent condition.',
    price: 18000,
    currency: 'GH₵',
    category: 'Cameras',
    condition: 'Like New',
    quantity: 1,
    images: [camera1, camera2],
    location: 'Kumasi, Ghana',
    status: 'active',
    vendor: {
      username: 'esi_crafts',
      storeName: 'Esi\'s Photo Studio',
      verified: true,
      rating: 4.9,
      reviewCount: 87,
    },
    reviews: [
      { id: 'r-3', fromUser: 'kofi_buyer', rating: 5, comment: 'Amazing camera, exactly as described.', createdAt: '2025-02-28T16:00:00Z' },
    ],
    savedCount: 32,
    viewCount: 456,
    createdAt: '2025-01-20T08:00:00Z',
  },
  {
    id: 'p-003',
    title: 'Herman Miller Aeron Gaming Chair',
    description: 'Ergonomic office/gaming chair. Size B, fully loaded with all adjustments. Remastered 2024 model.',
    price: 8500,
    currency: 'GH₵',
    category: 'Home & Office',
    condition: 'Brand New',
    quantity: 5,
    images: [chair1],
    location: 'Accra, Ghana',
    status: 'active',
    vendor: {
      username: 'kwame_tech',
      storeName: 'Kwame Tech Hub',
      verified: true,
      rating: 4.8,
      reviewCount: 124,
    },
    reviews: [],
    savedCount: 18,
    viewCount: 234,
    createdAt: '2025-03-01T12:00:00Z',
  },
  {
    id: 'p-004',
    title: 'iPhone 15 Pro Max 256GB',
    description: 'Natural Titanium, factory unlocked. Includes original box, cable, and AppleCare+ until 2026.',
    price: 9200,
    currency: 'GH₵',
    category: 'Phones',
    condition: 'Like New',
    quantity: 2,
    images: [iphone1, iphone2],
    location: 'Takoradi, Ghana',
    status: 'active',
    vendor: {
      username: 'nana_phones',
      storeName: 'Nana Mobile GH',
      verified: true,
      rating: 4.6,
      reviewCount: 203,
    },
    reviews: [
      { id: 'r-4', fromUser: 'abena_m', rating: 5, comment: 'Legitimate seller, fast escrow release!', createdAt: '2025-03-12T11:00:00Z' },
    ],
    savedCount: 67,
    viewCount: 1230,
    createdAt: '2025-02-10T09:00:00Z',
  },
  {
    id: 'p-005',
    title: 'PlayStation 5 Slim + 2 Controllers',
    description: 'PS5 Slim disc edition with extra DualSense controller. Barely used, comes with FIFA 25 and Spider-Man 2.',
    price: 5800,
    currency: 'GH₵',
    category: 'Gaming',
    condition: 'Used - Good',
    quantity: 1,
    images: [ps5],
    location: 'Accra, Ghana',
    status: 'active',
    vendor: {
      username: 'yaw_gaming',
      storeName: 'Yaw\'s Game Zone',
      verified: false,
      rating: 4.2,
      reviewCount: 31,
    },
    reviews: [],
    savedCount: 29,
    viewCount: 567,
    createdAt: '2025-03-05T14:00:00Z',
  },
  {
    id: 'p-006',
    title: 'Vintage Kente Cloth Collection',
    description: 'Authentic hand-woven Ashanti Kente cloth set. 3 pieces, traditional patterns. Certificate of authenticity included.',
    price: 2800,
    currency: 'GH₵',
    category: 'Fashion',
    condition: 'Brand New',
    quantity: 10,
    images: [kente1],
    location: 'Kumasi, Ghana',
    status: 'active',
    vendor: {
      username: 'esi_crafts',
      storeName: 'Esi\'s Photo Studio',
      verified: true,
      rating: 4.9,
      reviewCount: 87,
    },
    reviews: [
      { id: 'r-5', fromUser: 'tourist_lisa', rating: 5, comment: 'Absolutely beautiful, museum quality!', createdAt: '2025-03-14T10:00:00Z' },
    ],
    savedCount: 41,
    viewCount: 678,
    createdAt: '2025-01-08T07:00:00Z',
  },
  {
    id: 'p-007',
    title: 'Wireless Mechanical Keyboard',
    description: 'Hot-swappable 75% mechanical keyboard with Bluetooth and 2.4GHz. Draft — photos and pricing still being finalised.',
    price: 650,
    currency: 'GH₵',
    category: 'Electronics',
    condition: 'New',
    quantity: 12,
    images: [keyboard1],
    location: 'Accra, Ghana',
    status: 'draft',
    vendor: {
      username: 'kwame_tech',
      storeName: 'Kwame Tech Hub',
      verified: true,
      rating: 4.8,
      reviewCount: 124,
    },
    reviews: [],
    savedCount: 0,
    viewCount: 0,
    createdAt: '2025-03-14T09:00:00Z',
  },
  {
    id: 'p-008',
    title: 'USB-C Hub Pro 8-in-1',
    description: 'HDMI 4K, 100W PD passthrough, SD/microSD, 3x USB 3.0 and gigabit ethernet. Restocking soon.',
    price: 320,
    currency: 'GH₵',
    category: 'Electronics',
    condition: 'New',
    quantity: 0,
    images: [usbHub1],
    location: 'Accra, Ghana',
    status: 'out_of_stock',
    vendor: {
      username: 'kwame_tech',
      storeName: 'Kwame Tech Hub',
      verified: true,
      rating: 4.8,
      reviewCount: 124,
    },
    reviews: [],
    savedCount: 8,
    viewCount: 214,
    createdAt: '2025-02-20T11:30:00Z',
  },
];

/* ── Escrow Deals ─────────────────────────────────────────────── */

export const mockDeals: EscrowDeal[] = [
  {
    id: 'deal-001',
    code: 'ESC-7X2K',
    title: 'MacBook Pro Purchase',
    status: 'shipped',
    amount: 12500,
    currency: 'GH₵',
    rail: 'fiat',
    creator: { username: 'kofi_buyer' },
    counterparty: { username: 'kwame_tech', storeName: 'Kwame Tech Hub' },
    description: 'Purchase of MacBook Pro 14" M3 Pro from marketplace listing.',
    releaseCondition: 'Buyer confirms receipt of item in described condition.',
    tracking: { carrier: 'GH Post EMS', code: 'GH2025031478' },
    events: [
      { id: 'ev-1', type: 'created', description: 'Escrow deal created from marketplace checkout.', actor: 'kofi_buyer', createdAt: '2025-03-10T10:00:00Z' },
      { id: 'ev-2', type: 'funded', description: 'GH₵12,687.50 locked in escrow (incl. 1.5% fee).', actor: 'system', createdAt: '2025-03-10T10:02:00Z' },
      { id: 'ev-3', type: 'shipped', description: 'Item shipped via GH Post EMS. Tracking: GH2025031478', actor: 'kwame_tech', createdAt: '2025-03-11T14:00:00Z' },
    ],
    createdAt: '2025-03-10T10:00:00Z',
    updatedAt: '2025-03-11T14:00:00Z',
  },
  {
    id: 'deal-002',
    code: 'ESC-9P4M',
    title: 'Freelance Logo Design Contract',
    status: 'funded',
    amount: 500,
    currency: 'USDC',
    rail: 'crypto',
    creator: { username: 'kofi_buyer' },
    counterparty: { username: 'designer_ama' },
    description: 'Logo design and brand identity package. 3 concepts, 2 rounds of revisions.',
    releaseCondition: 'Buyer confirms final deliverables received.',
    events: [
      { id: 'ev-4', type: 'created', description: 'Standalone escrow deal created.', actor: 'kofi_buyer', createdAt: '2025-03-12T09:00:00Z' },
      { id: 'ev-5', type: 'funded', description: '500 USDC deposited into escrow.', actor: 'kofi_buyer', createdAt: '2025-03-12T09:15:00Z' },
    ],
    createdAt: '2025-03-12T09:00:00Z',
    updatedAt: '2025-03-12T09:15:00Z',
  },
  {
    id: 'deal-003',
    code: 'ESC-3L8N',
    title: 'Canon Camera Purchase',
    status: 'released',
    amount: 18000,
    currency: 'GH₵',
    rail: 'fiat',
    creator: { username: 'kofi_buyer' },
    counterparty: { username: 'esi_crafts', storeName: "Esi's Photo Studio" },
    description: 'Canon EOS R5 + RF 24-105mm lens from marketplace.',
    releaseCondition: 'Buyer confirms receipt.',
    tracking: { carrier: 'DHL Ghana', code: 'DHL8847291' },
    events: [
      { id: 'ev-6', type: 'created', description: 'Escrow deal created.', actor: 'kofi_buyer', createdAt: '2025-02-28T08:00:00Z' },
      { id: 'ev-7', type: 'funded', description: 'GH₵18,270 locked in escrow.', actor: 'system', createdAt: '2025-02-28T08:05:00Z' },
      { id: 'ev-8', type: 'shipped', description: 'Item shipped via DHL Ghana.', actor: 'esi_crafts', createdAt: '2025-03-01T10:00:00Z' },
      { id: 'ev-9', type: 'delivered', description: 'Buyer confirmed receipt.', actor: 'kofi_buyer', createdAt: '2025-03-03T16:00:00Z' },
      { id: 'ev-10', type: 'released', description: 'GH₵17,865 released to seller.', actor: 'system', createdAt: '2025-03-03T16:01:00Z' },
    ],
    createdAt: '2025-02-28T08:00:00Z',
    updatedAt: '2025-03-03T16:01:00Z',
  },
  {
    id: 'deal-004',
    code: 'ESC-5W1Q',
    title: 'Website Development Contract',
    status: 'disputed',
    amount: 2000,
    currency: 'USDT',
    rail: 'crypto',
    creator: { username: 'business_joe' },
    counterparty: { username: 'kofi_buyer' },
    description: 'Full-stack website development with 5 pages, responsive design, and CMS integration.',
    releaseCondition: 'Client approves final deployment.',
    events: [
      { id: 'ev-11', type: 'created', description: 'Standalone escrow deal created.', actor: 'business_joe', createdAt: '2025-02-15T12:00:00Z' },
      { id: 'ev-12', type: 'funded', description: '2,000 USDT deposited.', actor: 'business_joe', createdAt: '2025-02-15T12:30:00Z' },
      { id: 'ev-13', type: 'disputed', description: 'Dispute opened: "Deliverables not meeting agreed specifications."', actor: 'business_joe', createdAt: '2025-03-05T09:00:00Z' },
    ],
    createdAt: '2025-02-15T12:00:00Z',
    updatedAt: '2025-03-05T09:00:00Z',
  },
];

/* ── Orders (buyer view) ─────────────────────────────────────── */

export const mockOrders: Order[] = [
  {
    id: 'ord-001',
    dealId: 'deal-001',
    listingTitle: 'MacBook Pro 14" M3 Pro',
    listingImage: macbook1,
    quantity: 1,
    amount: 12500,
    currency: 'GH₵',
    status: 'shipped',
    vendor: { username: 'kwame_tech', storeName: 'Kwame Tech Hub' },
    buyer: { username: 'kofi_buyer' },
    tracking: { carrier: 'GH Post EMS', code: 'GH2025031478' },
    createdAt: '2025-03-10T10:00:00Z',
  },
  {
    id: 'ord-002',
    dealId: 'deal-003',
    listingTitle: 'Canon EOS R5 Mirrorless Camera',
    listingImage: camera1,
    quantity: 1,
    amount: 18000,
    currency: 'GH₵',
    status: 'released',
    vendor: { username: 'esi_crafts', storeName: "Esi's Photo Studio" },
    buyer: { username: 'kofi_buyer' },
    tracking: { carrier: 'DHL Ghana', code: 'DHL8847291' },
    createdAt: '2025-02-28T08:00:00Z',
  },
];

/* ── Seller Listings ──────────────────────────────────────────── */

export const mockSellerListings: SellerListing[] = [
  {
    id: 'p-001',
    title: 'MacBook Pro 14" M3 Pro',
    price: 12500,
    currency: 'GH₵',
    category: 'Electronics',
    status: 'active',
    quantity: 3,
    imageUrl: macbook1,
    viewCount: 890,
    reviewCount: 2,
    createdAt: '2025-02-15T10:00:00Z',
  },
  {
    id: 'p-003',
    title: 'Herman Miller Aeron Gaming Chair',
    price: 8500,
    currency: 'GH₵',
    category: 'Home & Office',
    status: 'active',
    quantity: 5,
    imageUrl: chair1,
    viewCount: 234,
    reviewCount: 0,
    createdAt: '2025-03-01T12:00:00Z',
  },
  {
    id: 'sl-003',
    title: 'Wireless Mechanical Keyboard',
    price: 650,
    currency: 'GH₵',
    category: 'Electronics',
    status: 'draft',
    quantity: 12,
    imageUrl: keyboard1,
    viewCount: 0,
    reviewCount: 0,
    createdAt: '2025-03-14T08:00:00Z',
  },
  {
    id: 'sl-004',
    title: 'USB-C Hub Pro 8-in-1',
    price: 320,
    currency: 'GH₵',
    category: 'Electronics',
    status: 'out_of_stock',
    quantity: 0,
    imageUrl: usbHub1,
    viewCount: 156,
    reviewCount: 8,
    createdAt: '2025-01-20T09:00:00Z',
  },
];

/* ── KYC Submissions (admin view) ─────────────────────────────── */

export const mockKycSubmissions: KycSubmission[] = [
  {
    id: 'kyc-001',
    userId: 'u-010',
    username: 'akua_fashion',
    storeName: "Akua's Boutique",
    legalName: 'Akua Owusu-Afriyie',
    country: 'Ghana',
    idType: 'Ghana Card',
    idNumber: 'GHA-XXXXXXXXX-X',
    taxId: 'TIN-00123456',
    address: '14 Oxford Street, Osu, Accra',
    momoNumber: '+233 24 555 7890',
    trxAddress: 'TXyz1234567890abcdef',
    status: 'pending',
    submittedAt: '2025-03-14T11:00:00Z',
    avatarUrl: undefined,
    email: 'akua@boutique.com',
    joinDate: '2025-01-10T00:00:00Z',
  },
  {
    id: 'kyc-002',
    userId: 'u-011',
    username: 'prince_motors',
    storeName: 'Prince Auto Parts',
    legalName: 'Prince Boateng',
    country: 'Ghana',
    idType: 'Passport',
    idNumber: 'G1234567',
    address: '22 Asafo Market Road, Kumasi',
    momoNumber: '+233 20 111 2233',
    trxAddress: 'TAbcdef0987654321',
    status: 'pending',
    submittedAt: '2025-03-13T09:00:00Z',
    email: 'prince@autoparts.gh',
    joinDate: '2024-11-20T00:00:00Z',
  },
  {
    id: 'kyc-003',
    userId: 'u-002',
    username: 'kwame_tech',
    storeName: 'Kwame Tech Hub',
    legalName: 'Kwame Asante',
    country: 'Ghana',
    idType: 'Ghana Card',
    idNumber: 'GHA-YYYYYYYYY-Y',
    taxId: 'TIN-00987654',
    address: '5 Ring Road Central, Accra',
    momoNumber: '+233 20 987 6543',
    trxAddress: 'TQwerty1234567890',
    status: 'approved',
    submittedAt: '2024-08-01T10:00:00Z',
    decidedAt: '2024-08-03T14:00:00Z',
    email: 'kwame@example.com',
    joinDate: '2024-06-01T00:00:00Z',
  },
  {
    id: 'kyc-004',
    userId: 'u-012',
    username: 'fake_vendor',
    storeName: 'Scam Store',
    legalName: 'John Doe',
    country: 'Nigeria',
    idType: "Driver's License",
    idNumber: 'DL-0000000',
    address: 'Unknown Address',
    momoNumber: '+234 80 000 0000',
    trxAddress: 'TInvalid000000',
    status: 'rejected',
    rejectionReason: 'Identity document appears fraudulent. Uploaded selfie does not match ID photo.',
    submittedAt: '2025-03-01T06:00:00Z',
    decidedAt: '2025-03-02T10:00:00Z',
    email: 'fake@email.com',
    joinDate: '2025-02-28T00:00:00Z',
  },
];

/* ── Seller Stats (for seller dashboard) ──────────────────────── */

export const mockSellerStats = {
  totalRevenue: 48750,
  lockedInEscrow: 12500,
  availablePayout: 36250,
  currency: 'GH₵',
  activeListings: 4,
  totalSales: 23,
  rating: 4.8,
  reviewCount: 124,
};

/* ── Buyer Stats (for user dashboard) ─────────────────────────── */

export const mockBuyerStats = {
  activeOrders: 1,
  escrowLocked: 12687.5,
  totalPurchases: 30687.5,
  savedItems: 4,
  currency: 'GH₵',
};

/* ── Message Thread Mock ──────────────────────────────────────── */

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  createdAt: string;
}

export const mockMessages: Message[] = [
  { id: 'm-1', from: 'kofi_buyer', to: 'kwame_tech', content: 'Hi, is the MacBook Pro still available?', createdAt: '2025-03-10T09:00:00Z' },
  { id: 'm-2', from: 'kwame_tech', to: 'kofi_buyer', content: 'Yes! I have 3 units in stock. All sealed with warranty.', createdAt: '2025-03-10T09:05:00Z' },
  { id: 'm-3', from: 'kofi_buyer', to: 'kwame_tech', content: 'Great, I\'ll proceed with the escrow checkout.', createdAt: '2025-03-10T09:10:00Z' },
  { id: 'm-4', from: 'kwame_tech', to: 'kofi_buyer', content: 'Sounds good! I\'ll ship within 24 hours once payment is locked.', createdAt: '2025-03-10T09:12:00Z' },
];
