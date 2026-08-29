/**
 * SEO metadata — the single source of truth for what any VeriTrust page calls
 * itself, describes itself as, and lets a crawler do with it.
 *
 * This is a client-rendered SPA: `index.html` ships one static head that every
 * URL starts from, and the tags below are rewritten in place on navigation.
 * Googlebot renders JS and so reads the rewritten tags; most social scrapers
 * (Facebook, WhatsApp, LinkedIn, Slack) do NOT, and will only ever see the
 * static head. So `index.html` carries the site-level card, and per-route
 * `og:*` here is an upgrade for the crawlers that execute scripts — not a
 * substitute for prerendering. See web/README.md.
 */

export const SITE_NAME = 'VeriTrust'

export const SITE_TAGLINE = 'Escrow-Backed P2P Marketplace'

/** Absolute origin, needed for canonical + og:url. Override per environment.
 *  Trailing slash stripped so `${SITE_URL}${path}` is always well-formed. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://veritrust.app').replace(/\/+$/, '')

export const DEFAULT_DESCRIPTION =
  'VeriTrust holds the payment in escrow until the buyer confirms delivery. Shop KYC-verified sellers, or open a standalone escrow deal for any off-platform trade — settled in GH₵ or crypto.'

/** Social card. 1200×630 PNG — replace public/og-cover.png to rebrand it. */
export const SOCIAL_IMAGE = '/og-cover.png'

export interface SeoMeta {
  /** Page title WITHOUT the site suffix — `formatTitle` adds it. */
  title: string
  description?: string
  /** false → `noindex, nofollow`. Default true. */
  index?: boolean
  /** Absolute or root-relative image for this page's card. */
  image?: string
}

/** `Marketplace` → `Marketplace · VeriTrust`. The home page owns the bare brand. */
export function formatTitle(title: string): string {
  if (!title || title === SITE_NAME) return `${SITE_NAME} — ${SITE_TAGLINE}`
  return `${title} · ${SITE_NAME}`
}

interface RouteSeo extends SeoMeta {
  /** Matched against the pathname. First hit wins, so order most-specific first. */
  match: RegExp
}

/**
 * Route table. Everything behind a login is `index: false` — a deal page, a
 * wallet ledger or an admin queue in a search index is a privacy leak, not a
 * traffic win. `/join/:code` is the sharpest case: the code IS the invite, so
 * indexing one would publish a private deal to anyone searching.
 */
const ROUTES: RouteSeo[] = [
  // ── Public, indexable ──────────────────────────────────────────────────
  {
    match: /^\/$/,
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
  {
    match: /^\/marketplace\/[^/]+$/,
    // Overridden with the real listing by ProductDetail once it loads.
    title: 'Listing',
    description: 'Buy this item with the payment held in escrow until you confirm it arrived as described.',
  },
  {
    match: /^\/marketplace\/?$/,
    title: 'Marketplace',
    description:
      'Browse physical goods from KYC-verified sellers on VeriTrust. Every order is paid into escrow and released only when the buyer confirms delivery.',
  },
  {
    match: /^\/seller\/[^/]+$/,
    title: 'Seller',
    description: 'Ratings, verification status and live listings for this VeriTrust seller.',
  },
  {
    match: /^\/signup\/?$/,
    title: 'Create an Account',
    description: 'Open a free VeriTrust account to buy with escrow protection or sell to verified buyers.',
  },
  {
    match: /^\/login\/?$/,
    title: 'Sign In',
    description: 'Sign in to your VeriTrust account to manage deals, listings and your wallet.',
  },
  {
    match: /^\/terms\/?$/,
    title: 'Escrow Terms of Service',
    description: 'How VeriTrust holds funds, resolves disputes and releases payment between buyer and seller.',
  },
  {
    match: /^\/privacy\/?$/,
    title: 'Privacy Policy',
    description: 'What VeriTrust collects, why it is collected, and what is never shared or sold.',
  },

  // ── Signed-in surface — never indexed ──────────────────────────────────
  { match: /^\/join\/[^/]+$/, title: 'Join a Deal', index: false },
  { match: /^\/escrow\/new\/?$/, title: 'Start an Escrow Deal', index: false },
  { match: /^\/escrow\/[^/]+\/crypto\/callback\/?$/, title: 'Confirming Payment', index: false },
  { match: /^\/escrow\/[^/]+$/, title: 'Deal', index: false },
  { match: /^\/deals\/?$/, title: 'Deals', index: false },
  { match: /^\/checkout\/?$/, title: 'Checkout', index: false },
  { match: /^\/wallet\/deposit\/callback\/?$/, title: 'Confirming Deposit', index: false },
  { match: /^\/wallet\/?$/, title: 'Wallet', index: false },
  { match: /^\/messages\/?$/, title: 'Messages', index: false },
  { match: /^\/dashboard\/?$/, title: 'Dashboard', index: false },
  { match: /^\/bookmarks\/?$/, title: 'Saved Listings', index: false },
  { match: /^\/settings\/?$/, title: 'Account Settings', index: false },
  { match: /^\/listings\/new\/?$/, title: 'New Listing', index: false },
  { match: /^\/listings\/[^/]+$/, title: 'Edit Listing', index: false },
  { match: /^\/listings\/?$/, title: 'My Listings', index: false },
  { match: /^\/promotions\/[^/]+$/, title: 'Promotion', index: false },
  { match: /^\/promotions\/?$/, title: 'Promotions', index: false },
  { match: /^\/(sell|vendor\/kyc)\/?$/, title: 'Become a Seller', index: false },
  { match: /^\/verify-email\/?$/, title: 'Verify Your Email', index: false },
  { match: /^\/forgot-password\/?$/, title: 'Reset Your Password', index: false },
  { match: /^\/reset-password\/?$/, title: 'Choose a New Password', index: false },
  { match: /^\/change-password\/?$/, title: 'Change Password', index: false },
  { match: /^\/style-guide\/?$/, title: 'Style Guide', index: false },

  // ── Admin ──────────────────────────────────────────────────────────────
  { match: /^\/admin\/kyc\/[^/]+$/, title: 'KYC Review', index: false },
  { match: /^\/admin\/kyc\/?$/, title: 'KYC Queue', index: false },
  { match: /^\/admin\/disputes\/[^/]+$/, title: 'Dispute', index: false },
  { match: /^\/admin\/disputes\/?$/, title: 'Disputes', index: false },
  { match: /^\/admin\/listings\/[^/]+$/, title: 'Listing Review', index: false },
  { match: /^\/admin\/listings\/?$/, title: 'Listing Moderation', index: false },
  { match: /^\/admin\/reports\/?$/, title: 'Reported Listings', index: false },
  { match: /^\/admin\/users\/?$/, title: 'Users', index: false },
  { match: /^\/admin\/?$/, title: 'Admin Console', index: false },
]

/** Metadata for a pathname. Unknown paths are the 404, which must not index. */
export function resolveRouteSeo(pathname: string): SeoMeta {
  const hit = ROUTES.find((r) => r.match.test(pathname))
  if (hit) return { title: hit.title, description: hit.description, index: hit.index, image: hit.image }
  return { title: 'Page Not Found', description: undefined, index: false }
}

/** Absolute URL for a root-relative path (canonical, og:url, og:image). */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

/** Trim a body of copy down to a description that won't be cut off in a SERP. */
export function toDescription(text: string | null | undefined, fallback: string, max = 155): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  if (clean.length <= max) return clean
  // Cut on a word boundary so the ellipsis doesn't land mid-word.
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`
}

/**
 * Shapes below are declared structurally rather than imported from the feature
 * modules — `shared/libs` stays a leaf, and the SEO copy stays in one file.
 */
interface ListingSeoInput {
  title: string
  description: string | null
  price: number
  currency: string
  images: string[]
  category: string
  condition: string | null
  quantity: number
  seller: { username: string; storeName: string | null }
}

/** Title/description for a listing page. `null` while it is still loading. */
export function listingSeo(listing: ListingSeoInput | undefined | null): SeoMeta | null {
  if (!listing) return null
  const seller = listing.seller.storeName ?? `@${listing.seller.username}`
  return {
    title: `${listing.title} — ${listing.currency} ${listing.price.toLocaleString()}`,
    description: toDescription(
      listing.description,
      `${listing.title} from ${seller} on ${SITE_NAME}. Paid into escrow and released only when you confirm delivery.`,
    ),
    image: listing.images[0] ?? undefined,
  }
}

/** schema.org Product — what earns the price/availability chip in a result. */
export function listingJsonLd(listing: ListingSeoInput | undefined | null): object | null {
  if (!listing) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: toDescription(listing.description, listing.title, 300),
    image: listing.images.map((src) => absoluteUrl(src)),
    category: listing.category,
    ...(listing.condition
      ? {
          itemCondition:
            listing.condition.toLowerCase() === 'new'
              ? 'https://schema.org/NewCondition'
              : 'https://schema.org/UsedCondition',
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: listing.currency,
      availability: listing.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: listing.seller.storeName ?? listing.seller.username,
      },
    },
  }
}

interface SellerSeoInput {
  username: string
  storeName: string | null
  verified: boolean
  country: string | null
  stats: { activeListings: number; rating: number | null; reviewCount: number }
}

/** Title/description for a public seller profile. */
export function sellerSeo(profile: SellerSeoInput | undefined | null): SeoMeta | null {
  if (!profile) return null
  const name = profile.storeName ?? `@${profile.username}`
  const rating =
    profile.stats.rating !== null
      ? `Rated ${profile.stats.rating.toFixed(1)}/5 from ${profile.stats.reviewCount} review${
          profile.stats.reviewCount === 1 ? '' : 's'
        }.`
      : 'No reviews yet.'
  return {
    title: `${name}${profile.verified ? ' — Verified Seller' : ''}`,
    description: toDescription(
      null,
      `${name} on ${SITE_NAME}${profile.country ? `, ${profile.country}` : ''}. ${
        profile.stats.activeListings
      } active listing${profile.stats.activeListings === 1 ? '' : 's'}. ${rating}`,
    ),
  }
}
