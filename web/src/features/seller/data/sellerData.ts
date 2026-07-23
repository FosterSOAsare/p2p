export interface SellerSaleOrder {
  id: string
  title: string
  buyerUsername: string
  amount: number
  currency: 'GHS' | 'TRX'
  date: string
  status: 'funded' | 'delivered' | 'disbursed' | 'disputed'
  trackingNumber?: string
  carrier?: string
}

export interface SellerProductListing {
  id: string
  title: string
  price: number
  category: string
  stock: number
  views: number
  imageUrl: string
  status: 'active' | 'out_of_stock' | 'draft'
}

export interface SellerStats {
  storeName: string
  storeHandle: string
  isKycVerified: boolean
  rating: number
  reviewCount: number
  totalEarnings: number
  escrowLockedBalance: number
  availablePayoutBalance: number
  activeListingsCount: number
}

export const mockSellerStats: SellerStats = {
  storeName: 'TechHub Ghana Electronics',
  storeHandle: 'techhub_gh',
  isKycVerified: true,
  rating: 4.9,
  reviewCount: 42,
  totalEarnings: 14250,
  escrowLockedBalance: 3800,
  availablePayoutBalance: 10450,
  activeListingsCount: 8,
}

export const mockSellerOrders: SellerSaleOrder[] = [
  {
    id: 'sale-101',
    title: 'MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)',
    buyerUsername: 'kwaku_b',
    amount: 2450,
    currency: 'GHS',
    date: '2026-07-21',
    status: 'funded',
  },
  {
    id: 'sale-102',
    title: 'Sony Alpha A7 IV Mirrorless Camera Body',
    buyerUsername: 'daniel_web',
    amount: 1850,
    currency: 'GHS',
    date: '2026-07-18',
    status: 'delivered',
    trackingNumber: 'DHL-GH-99201',
    carrier: 'DHL Express',
  },
  {
    id: 'sale-103',
    title: 'DJI Mini 4 Pro Fly More Combo',
    buyerUsername: 'ama_design',
    amount: 1100,
    currency: 'TRX',
    date: '2026-07-12',
    status: 'disbursed',
    trackingNumber: 'FEDEX-88201',
    carrier: 'FedEx Priority',
  },
]

export const mockSellerListings: SellerProductListing[] = [
  {
    id: '1',
    title: 'MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)',
    price: 2450,
    category: 'Electronics',
    stock: 3,
    views: 412,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    status: 'active',
  },
  {
    id: '2',
    title: 'Sony Alpha A7 IV Mirrorless Camera Body',
    price: 1850,
    category: 'Electronics',
    stock: 2,
    views: 295,
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    status: 'active',
  },
  {
    id: '4',
    title: 'Herman Miller Embody Ergonomic Office Chair',
    price: 1350,
    category: 'Home & Office',
    stock: 1,
    views: 180,
    imageUrl: 'https://images.unsplash.com/photo-1580481072645-022f9a6d8310?w=800&auto=format&fit=crop&q=80',
    status: 'active',
  },
  {
    id: '5',
    title: 'Bose QuietComfort Ultra Headphones',
    price: 420,
    category: 'Electronics',
    stock: 5,
    views: 310,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    status: 'active',
  },
]
