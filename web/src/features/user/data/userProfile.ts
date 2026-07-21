export interface UserOrder {
  id: string
  productId: string
  title: string
  price: number
  vendorName: string
  vendorVerified: boolean
  imageUrl: string
  orderDate: string
  status: 'funded' | 'shipped' | 'completed' | 'disputed'
  trackingCode?: string
  shippingCarrier?: string
}

export interface UserProfileData {
  fullName: string
  username: string
  email: string
  phone: string
  joinedDate: string
  avatarUrl: string
  isKycVerified: boolean
  totalSpent: number
  activeOrdersCount: number
  savedItemsCount: number
}

export const mockUserProfile: UserProfileData = {
  fullName: 'Kwaku Bonsu',
  username: 'kwaku_b',
  email: 'kwaku@example.com',
  phone: '+233 24 555 0192',
  joinedDate: 'January 2026',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  isKycVerified: true,
  totalSpent: 4850,
  activeOrdersCount: 2,
  savedItemsCount: 5,
}

export const mockUserOrders: UserOrder[] = [
  {
    id: 'ord-901',
    productId: '1',
    title: 'MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)',
    price: 2450,
    vendorName: 'kwame_tech',
    vendorVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    orderDate: '2026-07-19',
    status: 'shipped',
    trackingCode: 'DHL-GH-882910',
    shippingCarrier: 'DHL Express (Insured)',
  },
  {
    id: 'ord-902',
    productId: '2',
    title: 'Sony Alpha A7 IV Mirrorless Camera Body',
    price: 1850,
    vendorName: 'kofi_cameras',
    vendorVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    orderDate: '2026-07-15',
    status: 'completed',
    trackingCode: 'FEDEX-992019',
    shippingCarrier: 'FedEx Priority',
  },
  {
    id: 'ord-903',
    productId: '3',
    title: 'PlayStation 5 Digital Edition + 2 Controllers',
    price: 550,
    vendorName: 'game_hub',
    vendorVerified: false,
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80',
    orderDate: '2026-07-20',
    status: 'funded',
  },
]
