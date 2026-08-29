import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  SITE_NAME,
  SOCIAL_IMAGE,
  DEFAULT_DESCRIPTION,
  absoluteUrl,
  formatTitle,
  resolveRouteSeo,
} from '../libs/seo'
import type { SeoMeta } from '../libs/seo'

/**
 * Head management for the SPA. Two layers:
 *
 *   1. `resolveRouteSeo(pathname)` gives every route a title and a robots rule
 *      with no per-page code — add a route to the table and it is covered.
 *   2. A page with content the table cannot know (a listing name, a seller's
 *      handle) calls `useSeo({...})` to override for as long as it is mounted.
 *
 * The page's override is registered from its own effect, which runs BEFORE the
 * provider's (React flushes child effects first), so the more specific value
 * always wins the frame it lands on. Unmounting clears it and the route default
 * takes back over.
 */

type Register = (meta: SeoMeta | null) => void

const SeoContext = createContext<Register>(() => {})

/** Create-or-update a `<meta>`, tagged so it is obviously ours in devtools. */
function setMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  const selector = `meta[${attr}="${key}"]`
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!content) {
    // Leave the static index.html tag in place rather than blanking it — an
    // empty description is worse than the site-level one.
    return el
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    el.setAttribute('data-seo', 'managed')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  return el
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    el.setAttribute('data-seo', 'managed')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Write one page's metadata into `<head>`. */
function applySeo(meta: SeoMeta, pathname: string) {
  const title = formatTitle(meta.title)
  const description = meta.description ?? DEFAULT_DESCRIPTION
  // Canonical drops the query string on purpose: `?sort=rating` and `?page=2`
  // are views of one resource, not separate pages to compete with each other.
  const url = absoluteUrl(pathname)
  const image = absoluteUrl(meta.image ?? SOCIAL_IMAGE)

  document.title = title
  setMeta('name', 'description', description)
  setMeta('name', 'robots', meta.index === false ? 'noindex, nofollow' : 'index, follow')
  setCanonical(url)

  setMeta('property', 'og:site_name', SITE_NAME)
  setMeta('property', 'og:type', pathname === '/' ? 'website' : 'article')
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', image)

  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', image)
}

function SeoHead({ override }: { override: SeoMeta | null }) {
  const { pathname } = useLocation()
  useEffect(() => {
    applySeo(override ?? resolveRouteSeo(pathname), pathname)
  }, [override, pathname])
  return null
}

/** Wraps the routed tree. One instance, mounted in `Layout`. */
export function SeoProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<SeoMeta | null>(null)
  return (
    <SeoContext.Provider value={setOverride}>
      <SeoHead override={override} />
      {children}
    </SeoContext.Provider>
  )
}

/**
 * Override this route's metadata while the calling page is mounted.
 *
 * Pass `null` (or nothing) while the data is still loading and the route
 * default stays in place — better a correct generic title for a moment than
 * "undefined · VeriTrust".
 */
export function useSeo(meta: SeoMeta | null | undefined) {
  const register = useContext(SeoContext)
  // Depend on the fields, not the object, so an inline literal doesn't
  // re-register on every render of the page that owns it.
  const title = meta?.title
  const description = meta?.description
  const index = meta?.index
  const image = meta?.image
  const resolved = useMemo(
    () => (title ? { title, description, index, image } : null),
    [title, description, index, image],
  )

  useEffect(() => {
    register(resolved)
    return () => register(null)
  }, [register, resolved])
}

/**
 * Structured data for rich results. Rendered into `<head>` as one script per
 * `id`, replaced on change and removed on unmount so a stale Product block
 * can't outlive the page that described it.
 */
export function useJsonLd(id: string, data: object | null) {
  // Keyed on the serialised block, not the object identity, so a caller can
  // build it inline every render without thrashing the DOM.
  const json = data ? JSON.stringify(data) : null
  useEffect(() => {
    if (!json) return
    document.head.querySelector(`#ld-${id}`)?.remove()
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = `ld-${id}`
    el.textContent = json
    document.head.appendChild(el)
    return () => el.remove()
  }, [id, json])
}
