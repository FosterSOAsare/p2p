/**
 * Light/dark, in one place.
 *
 * The toggle used to live only on the settings page, which sits behind auth —
 * so a signed-out visitor was stuck with whatever their system preferred and had
 * no way to change it. The header carries one now, and both call this, because
 * two copies of "write the class, write localStorage" is how they drift.
 *
 * The choice is deliberately local to the device rather than part of the user's
 * profile: it applies before anyone is signed in, and a phone and a laptop can
 * reasonably disagree about it.
 */

const KEY = 'p2p_theme'

/** The saved choice, falling back to what the OS asks for. */
export function preferredTheme(): boolean {
  const saved = localStorage.getItem(KEY)
  if (saved) return saved === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Apply and persist.
 *
 * The event is what keeps the header icon honest when the change came from the
 * settings page, and vice versa — without it, whichever control you did not
 * touch keeps rendering the old state until something else re-renders it.
 */
export function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem(KEY, dark ? 'dark' : 'light')
  window.dispatchEvent(new CustomEvent<boolean>('p2p:theme', { detail: dark }))
}

/** Subscribe to changes made anywhere in the app. Returns an unsubscribe. */
export function onThemeChange(fn: (dark: boolean) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<boolean>).detail)
  window.addEventListener('p2p:theme', handler)
  return () => window.removeEventListener('p2p:theme', handler)
}
