export interface Review {
  id: string
  name: string
  rating: number
  date: string
  comment: string
  verifiedPurchase: boolean
}

export interface Product {
  id: string
  title: string
  price: number
  category: 'Electronics' | 'Collectibles' | 'Home & Office' | 'Fashion' | 'Vehicles'
  condition: 'Brand New' | 'Like New' | 'Good' | 'Fair'
  location: string
  shippingEstimate: string
  quantity: number
  vendorName: string
  vendorVerified: boolean
  vendorRating: number
  vendorResponseTime: string
  rating: number
  reviewCount: number
  short: string
  description: string
  returnPolicy: string
  images: string[]
  reviews: Review[]
}

export const products: Product[] = [
  {
    id: '1',
    title: 'Apple MacBook Pro M3 Max (16-inch, 36GB RAM, 1TB SSD)',
    price: 2450,
    category: 'Electronics',
    condition: 'Like New',
    location: 'Accra • Ships nationwide',
    shippingEstimate: '1-2 business days via Express Courier',
    quantity: 2,
    vendorName: 'kwame_tech',
    vendorVerified: true,
    vendorRating: 4.9,
    vendorResponseTime: '< 15 mins',
    rating: 4.9,
    reviewCount: 48,
    short: 'Space Black M3 Max, pristine condition with box & original 140W charger.',
    description:
      'Lightly used for video editing. Under AppleCare warranty until end of year. Battery health is at 98%. Comes complete in original packaging with magsafe cable and power brick. Zero scratches on body or Retina screen.',
    returnPolicy: '7-day inspection window with 100% escrow refund protection.',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r1',
        name: 'Kofi A.',
        rating: 5,
        date: '2 days ago',
        comment: 'Item arrived in perfect condition. Escrow released smoothly!',
        verifiedPurchase: true,
      },
      {
        id: 'r2',
        name: 'Esi M.',
        rating: 5,
        date: '1 week ago',
        comment: 'Super fast shipping and vendor answered all my questions immediately.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '2',
    title: 'Vintage Leica M6 35mm Rangefinder Camera',
    price: 1850,
    category: 'Collectibles',
    condition: 'Good',
    location: 'Kumasi • Insured delivery',
    shippingEstimate: '2-3 business days',
    quantity: 1,
    vendorName: 'ama_collectibles',
    vendorVerified: true,
    vendorRating: 5.0,
    vendorResponseTime: '< 1 hour',
    rating: 5.0,
    reviewCount: 19,
    short: 'Classic silver chrome finish with Summicron 50mm f/2 lens included.',
    description:
      'Fully functional mechanically and optically. Shutter speeds tested and accurate. Viewfinder is crystal clear with strong patch alignment. Minor patina on top plate as expected for an authentic vintage piece.',
    returnPolicy: '3-day buyer inspection period upon carrier delivery.',
    images: [
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r3',
        name: 'Daniel O.',
        rating: 5,
        date: '3 weeks ago',
        comment: 'Dream camera! Lens optics are immaculate. Highly recommend this seller.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '3',
    title: 'Herman Miller Embody Ergonomic Office Chair',
    price: 920,
    category: 'Home & Office',
    condition: 'Like New',
    location: 'Tema • Pickup or Local Freight',
    shippingEstimate: 'Same-day local courier or pickup',
    quantity: 4,
    vendorName: 'jstore_official',
    vendorVerified: true,
    vendorRating: 4.7,
    vendorResponseTime: '< 30 mins',
    rating: 4.7,
    reviewCount: 34,
    short: 'Sync fabric in Black / Graphite frame. Full adjustability package.',
    description:
      'Corporate liquidation inventory. Chairs were used in an executive boardroom for less than 6 months. All mechanisms, armrests, and pneumatic lifts function like brand new.',
    returnPolicy: 'Standard 7-day escrow hold policy.',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r4',
        name: 'Yaw B.',
        rating: 5,
        date: '1 month ago',
        comment: 'Saved over $600 compared to retail! Chair is in flawless condition.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '4',
    title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
    price: 290,
    category: 'Electronics',
    condition: 'Brand New',
    location: 'Accra • Express shipping',
    shippingEstimate: 'Next-day delivery',
    quantity: 8,
    vendorName: 'audio_hub',
    vendorVerified: true,
    vendorRating: 4.9,
    vendorResponseTime: '< 10 mins',
    rating: 4.9,
    reviewCount: 88,
    short: 'Sealed factory box, Silver edition with carrying case.',
    description:
      'Brand new in sealed box. Features industry-leading active noise canceling, 30-hour battery life, and crystal-clear hands-free calling.',
    returnPolicy: 'Unopened returns accepted within 14 days.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r5',
        name: 'Akosua K.',
        rating: 5,
        date: '5 days ago',
        comment: 'Genuine brand new headphones. Sound quality is unreal!',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '5',
    title: 'Rolex Submariner Date 126610LN (2023 Full Set)',
    price: 12500,
    category: 'Collectibles',
    condition: 'Like New',
    location: 'Accra • Insured Hand Delivery',
    shippingEstimate: 'Insured high-value express courier',
    quantity: 1,
    vendorName: 'horology_gh',
    vendorVerified: true,
    vendorRating: 5.0,
    vendorResponseTime: '< 5 mins',
    rating: 5.0,
    reviewCount: 15,
    short: 'Complete with outer/inner box, warranty card, tags, & full links.',
    description:
      '41mm Oystersteel case with Cerachrom black bezel. Purchased from Authorized Dealer in late 2023. Under international warranty until 2028. Escrow payment required before release.',
    returnPolicy: '48-hour authentication & inspection window.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r6',
        name: 'Kwabena S.',
        rating: 5,
        date: '2 weeks ago',
        comment: 'High value escrow transaction executed seamlessly. Verified authentic!',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '6',
    title: 'Handcrafted Genuine Italian Leather Travel Bag',
    price: 185,
    category: 'Fashion',
    condition: 'Brand New',
    location: 'Cape Coast • Ships nationwide',
    shippingEstimate: '2-4 business days',
    quantity: 5,
    vendorName: 'craft_master',
    vendorVerified: false,
    vendorRating: 4.5,
    vendorResponseTime: '< 2 hours',
    rating: 4.5,
    reviewCount: 27,
    short: 'Full-grain vintage brown leather duffel bag with brass hardware.',
    description:
      'Hand-stitched by artisan leatherworkers. Fits weekend travel gear or laptop/documents. Features shoe compartment and detachable shoulder strap.',
    returnPolicy: '7-day standard escrow inspection.',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r7',
        name: 'Grace T.',
        rating: 4,
        date: '1 month ago',
        comment: 'Beautiful leather quality and smells amazing.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '7',
    title: 'Sony PlayStation 5 Slim (1TB Console + DualSense Controller)',
    price: 460,
    category: 'Electronics',
    condition: 'Brand New',
    location: 'Accra • Same-day dispatch',
    shippingEstimate: '1 business day',
    quantity: 6,
    vendorName: 'kwame_tech',
    vendorVerified: true,
    vendorRating: 4.9,
    vendorResponseTime: '< 15 mins',
    rating: 4.9,
    reviewCount: 52,
    short: 'Latest PS5 Slim Disc Edition with 1TB SSD storage and Astro Bot bundle.',
    description:
      'Brand new factory sealed PlayStation 5 Slim console. Includes wireless DualSense controller, HDMI cable, power cord, and 1-year Sony warranty.',
    returnPolicy: '14-day unopened return policy with full escrow refund.',
    images: [
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r8',
        name: 'Emmanuel K.',
        rating: 5,
        date: '3 days ago',
        comment: 'Console arrived next day sealed. Smooth escrow transaction!',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '8',
    title: 'DJI Mini 4 Pro Fly More Combo Drone (RC 2 Controller)',
    price: 890,
    category: 'Electronics',
    condition: 'Like New',
    location: 'Kumasi • Express shipping',
    shippingEstimate: '2 business days',
    quantity: 2,
    vendorName: 'aero_gadgets',
    vendorVerified: true,
    vendorRating: 4.8,
    vendorResponseTime: '< 20 mins',
    rating: 4.8,
    reviewCount: 23,
    short: 'Under 249g 4K HDR drone with 3 batteries, shoulder bag, & built-in screen controller.',
    description:
      'Flown less than 3 times for test footage. Includes DJI RC 2 controller with bright screen, 3 intelligent flight batteries, two-way charging hub, spare propellers, and carrying case.',
    returnPolicy: '7-day test flight inspection window.',
    images: [
      'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r9',
        name: 'Patrick M.',
        rating: 5,
        date: '1 week ago',
        comment: 'Camera quality is mind-blowing. Seller packed it extremely safely.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '9',
    title: 'Rare 1998 Pokemon Charizard Holo 1st Edition Card (PSA 8)',
    price: 3200,
    category: 'Collectibles',
    condition: 'Like New',
    location: 'Accra • Vault Delivery',
    shippingEstimate: 'Insured high-value express courier',
    quantity: 1,
    vendorName: 'ama_collectibles',
    vendorVerified: true,
    vendorRating: 5.0,
    vendorResponseTime: '< 1 hour',
    rating: 5.0,
    reviewCount: 31,
    short: 'PSA Graded 8 NM-MT Base Set Shadowless Charizard Holo.',
    description:
      'Authentic PSA encapsulated 1st Edition Base Set Charizard. Certification number verified on PSA database. Stored in UV-protected climate vault.',
    returnPolicy: '48-hour PSA certification re-verification window.',
    images: [
      'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r10',
        name: 'David L.',
        rating: 5,
        date: '2 weeks ago',
        comment: 'Grail card acquired! Escrow protection made this high-value trade stress-free.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '10',
    title: 'Nike Air Jordan 1 Retro High OG Chicago (Size 10.5 US)',
    price: 540,
    category: 'Fashion',
    condition: 'Brand New',
    location: 'Accra • Ships nationwide',
    shippingEstimate: '1-2 business days',
    quantity: 3,
    vendorName: 'kicks_vault',
    vendorVerified: true,
    vendorRating: 4.9,
    vendorResponseTime: '< 15 mins',
    rating: 4.9,
    reviewCount: 42,
    short: 'Deadstock brand new in original box with extra red & black laces.',
    description:
      '100% authentic Nike Air Jordan 1 High OG Chicago colorway. Deadstock never worn or tried on. Passed authentication check.',
    returnPolicy: '7-day authenticity verification escrow guarantee.',
    images: [
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r11',
        name: 'Kelvin B.',
        rating: 5,
        date: '4 days ago',
        comment: 'Legit check passed 100%. Super fast dispatch.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: '11',
    title: 'Vintage Mid-Century Eames Style Lounge Chair & Ottoman',
    price: 1150,
    category: 'Home & Office',
    condition: 'Good',
    location: 'Kumasi • Freight Delivery',
    shippingEstimate: '3-5 business days',
    quantity: 1,
    vendorName: 'retro_living',
    vendorVerified: true,
    vendorRating: 4.7,
    vendorResponseTime: '< 1 hour',
    rating: 4.7,
    reviewCount: 18,
    short: 'Palisander rosewood veneer with black top-grain leather cushions.',
    description:
      'Mid-century modern lounge chair replica in supple black leather and molded plywood shell. Features die-cast aluminum swivel base. Extremely comfortable.',
    returnPolicy: '7-day inspection window.',
    images: [
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&auto=format&fit=crop&q=80',
    ],
    reviews: [
      {
        id: 'r12',
        name: 'Sandra E.',
        rating: 5,
        date: '2 weeks ago',
        comment: 'Statement piece for my living room! High quality craftsmanship.',
        verifiedPurchase: true,
      },
    ],
  },
]
