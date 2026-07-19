import { useState } from 'react'
import { AlertTriangle, Bell, MessageCircle, ShieldCheck, Store, Wallet } from 'lucide-react'
import { Badge } from '../features/shared/ui/Badge'
import { SearchBar } from '../features/shared/ui/SearchBar'
import { FilterChip } from '../features/shared/ui/FilterChip'
import { RatingStars } from '../features/shared/ui/RatingStars'
import { Tabs, type TabItem } from '../features/shared/ui/Tabs'
import { ListingCard } from '../features/shared/ui/ListingCard'

const primarySwatches = [
  { shade: 50, className: 'bg-primary-50' },
  { shade: 100, className: 'bg-primary-100' },
  { shade: 200, className: 'bg-primary-200' },
  { shade: 300, className: 'bg-primary-300' },
  { shade: 400, className: 'bg-primary-400' },
  { shade: 500, className: 'bg-primary-500' },
  { shade: 600, className: 'bg-primary-600' },
  { shade: 700, className: 'bg-primary-700' },
  { shade: 800, className: 'bg-primary-800' },
  { shade: 900, className: 'bg-primary-900' },
] as const

const sections = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'badges', label: 'Status Badges' },
  { id: 'search', label: 'Search & Filters' },
  { id: 'rating', label: 'Rating Stars' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'listing-card', label: 'Listing Card' },
  { id: 'forms', label: 'Form Elements' },
  { id: 'icons', label: 'Icons' },
]

const orderTabs: TabItem[] = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'disputed', label: 'Disputed' },
]

export function StyleGuide() {
  const [filters, setFilters] = useState(['Electronics', 'Under $100', 'Verified sellers'])
  const [activeTab, setActiveTab] = useState(orderTabs[0].id)

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[180px_1fr]">
      <nav className="hidden lg:block">
        <ul className="sticky top-8 space-y-1 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-16">
        <header>
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-primary-600">
            Style Guide
          </p>
          <h1 className="font-display text-4xl font-semibold">Foundations</h1>
          <p className="mt-2 max-w-xl text-slate-600">
            Colors, type, and base elements shared across buyer, seller, and admin surfaces.
          </p>
        </header>

        <section id="colors" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Colors — primary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {primarySwatches.map(({ shade, className }) => (
              <div key={shade} className="overflow-hidden rounded-lg border border-slate-200">
                <div className={`h-16 ${className}`} />
                <div className="px-3 py-2 text-xs font-medium">primary-{shade}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="typography" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Typography</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">font-display — Space Grotesk</p>
              <p className="font-display text-3xl font-semibold">Trust-first P2P marketplace</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">font-sans — Manrope</p>
              <p className="font-sans text-base">
                Every user has an account, every deal stores the creator username, and vendors complete
                individual KYC before they can list or receive escrow payouts.
              </p>
            </div>
          </div>
        </section>

        <section id="buttons" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Buttons</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              Primary
            </button>
            <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Secondary
            </button>
            <button className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Ghost
            </button>
            <button
              disabled
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white opacity-50"
            >
              Disabled
            </button>
          </div>
        </section>

        <section id="badges" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Status Badges</h2>
          <p className="mb-4 text-sm text-slate-600">
            Used for order status, vendor KYC status, and dispute status across buyer/seller/admin pages.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Draft</Badge>
            <Badge tone="info">Pending review</Badge>
            <Badge tone="warning">Awaiting shipment</Badge>
            <Badge tone="success">Verified</Badge>
            <Badge tone="success">Released</Badge>
            <Badge tone="danger">Disputed</Badge>
            <Badge tone="danger">Rejected</Badge>
          </div>
        </section>

        <section id="search" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Search & Filters</h2>
          <p className="mb-4 text-sm text-slate-600">
            Used on Marketplace Browse and Saved Listings. The filters button opens category/price/condition
            filters, which then show here as removable chips (per [buyer.md](buyer.md)).
          </p>
          <div className="max-w-lg space-y-3">
            <SearchBar />
            <div className="flex flex-wrap gap-2">
              {filters.map((label) => (
                <FilterChip
                  key={label}
                  label={label}
                  onRemove={() => setFilters((prev) => prev.filter((f) => f !== label))}
                />
              ))}
              {filters.length === 0 && <p className="text-xs text-slate-400">No active filters</p>}
            </div>
          </div>
        </section>

        <section id="rating" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Rating Stars</h2>
          <p className="mb-4 text-sm text-slate-600">
            Seller/counterparty reputation, shown inline on listing cards and on the Profile page.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <RatingStars rating={5} reviewCount={128} />
            <RatingStars rating={3.5} reviewCount={42} />
            <RatingStars rating={1} reviewCount={3} />
          </div>
        </section>

        <section id="tabs" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Tabs</h2>
          <p className="mb-4 text-sm text-slate-600">
            Segmented control for My Orders / My Escrow Deals filters (Active / Completed / Disputed).
          </p>
          <Tabs items={orderTabs} value={activeTab} onChange={setActiveTab} />
        </section>

        <section id="listing-card" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Listing Card</h2>
          <p className="mb-4 text-sm text-slate-600">Core card for Marketplace Browse and Saved Listings.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ListingCard
              title="Wireless mechanical keyboard"
              price="$89.00"
              location="Accra • Ships nationwide"
              vendorName="kwame_tech"
              vendorVerified
              rating={4.5}
              reviewCount={62}
            />
            <ListingCard
              title="Vintage film camera"
              price="$150.00"
              location="Kumasi • Local pickup"
              vendorName="ama_collectibles"
              vendorVerified
              rating={5}
              reviewCount={19}
            />
            <ListingCard
              title="Office chair, like new"
              price="$40.00"
              location="Tema • Ships nationwide"
              vendorName="jstore"
              vendorVerified={false}
              rating={3}
              reviewCount={4}
            />
          </div>
        </section>

        <section id="forms" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Form Elements</h2>
          <div className="grid max-w-md gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="style-guide-input">
                Text input
              </label>
              <input
                id="style-guide-input"
                placeholder="Placeholder text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="style-guide-select">
                Select
              </label>
              <select
                id="style-guide-select"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option>Fiat</option>
                <option>Crypto</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="style-guide-textarea">
                Textarea
              </label>
              <textarea
                id="style-guide-textarea"
                rows={3}
                placeholder="Describe the deal…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              I agree to the seller terms
            </label>
          </div>
        </section>

        <section id="icons" className="scroll-mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Icons</h2>
          <p className="mb-4 text-sm text-slate-600">lucide-react, used at 20px in nav/content, 16px inline.</p>
          <div className="flex flex-wrap gap-6">
            {[
              { Icon: Store, label: 'Store' },
              { Icon: ShieldCheck, label: 'ShieldCheck' },
              { Icon: Wallet, label: 'Wallet' },
              { Icon: MessageCircle, label: 'MessageCircle' },
              { Icon: Bell, label: 'Bell' },
              { Icon: AlertTriangle, label: 'AlertTriangle' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-xs text-slate-500">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200">
                  <Icon size={20} />
                </div>
                {label}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
