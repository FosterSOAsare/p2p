import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react-native';

import { Primary, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The marketing panel from the web auth pages, stacked for phones.
 *
 * On web this is the left column of the two-column auth card
 * (`web/src/features/auth/ui/Login.tsx` / `Signup.tsx`), which Tailwind hides
 * below the `lg` breakpoint. A phone can't do side-by-side, so the same content
 * sits above the form instead — same badge, headline, body, floating status
 * card and trust bullets, same photo washed back behind it.
 */

export interface AuthHeroProps {
  /** Pill text at the top, e.g. "Welcome Back" / "Smart Escrow Ledger". */
  badge: string;
  title: string;
  body: string;
  /** Floating card: green status line, right-hand pill, and the quote. */
  cardStatus: string;
  cardPill: string;
  quote: string;
  bullets: [string, string];
  /** Background photo URL — matches the web's Unsplash art. */
  image: string;
}

export function AuthHero({
  badge,
  title,
  body,
  cardStatus,
  cardPill,
  quote,
  bullets,
  image,
}: AuthHeroProps) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? tone.dark : tone.light;

  return (
    <View style={[styles.panel, { backgroundColor: c.bg, borderColor: c.border }]}>
      {/* Washed-back photo, same treatment as the web (opacity 15% / 45%). */}
      <Image
        source={image}
        style={[styles.photo, { opacity: dark ? 0.45 : 0.15 }]}
        contentFit="cover"
        transition={400}
      />

      <View style={styles.content}>
        {/* Top brand pill */}
        <View style={[styles.badge, { backgroundColor: c.badgeBg, borderColor: c.badgeBorder }]}>
          <Sparkles size={14} color={c.accent} />
          <Text style={[styles.badgeText, { color: c.badgeText }]}>{badge}</Text>
        </View>

        <Text style={[styles.title, { color: c.title }]}>{title}</Text>
        <Text style={[styles.body, { color: c.body }]}>{body}</Text>

        {/* Floating status card */}
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
          <View style={styles.cardTop}>
            <View style={styles.cardStatusRow}>
              <LockKeyhole size={13} color={c.accent} />
              <Text style={[styles.cardStatus, { color: c.accent }]}>{cardStatus}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: c.pillBg }]}>
              <Text style={[styles.pillText, { color: c.body }]}>{cardPill}</Text>
            </View>
          </View>
          <Text style={[styles.quote, { color: c.quote }]}>{quote}</Text>
        </View>

        {/* Trust bullets */}
        <View style={[styles.bullets, { borderTopColor: c.divider }]}>
          {bullets.map((line) => (
            <View key={line} style={styles.bulletRow}>
              <CheckCircle2 size={14} color={c.accent} />
              <Text style={[styles.bulletText, { color: c.body }]}>{line}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Mirrors the web's `bg-emerald-50 dark:bg-slate-950` panel treatment. */
const tone = {
  light: {
    bg: '#ecfdf5',
    border: '#e2e8f0',
    accent: '#059669',
    title: '#0f172a',
    body: '#475569',
    quote: '#334155',
    badgeBg: '#ffffff',
    badgeBorder: '#e2e8f0',
    badgeText: '#065f46',
    cardBg: 'rgba(255,255,255,0.92)',
    cardBorder: '#e2e8f0',
    pillBg: '#f1f5f9',
    divider: '#e2e8f0',
  },
  dark: {
    bg: '#020617',
    border: '#1e293b',
    accent: Primary[400],
    title: '#ffffff',
    body: '#cbd5e1',
    quote: '#e2e8f0',
    badgeBg: 'rgba(255,255,255,0.1)',
    badgeBorder: 'rgba(255,255,255,0.2)',
    badgeText: Primary[300],
    cardBg: 'rgba(255,255,255,0.1)',
    cardBorder: 'rgba(255,255,255,0.2)',
    pillBg: 'rgba(255,255,255,0.1)',
    divider: 'rgba(255,255,255,0.1)',
  },
} as const;

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    padding: Spacing.five,
    gap: Spacing.three,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  body: { fontSize: 12, lineHeight: 18 },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  cardStatus: { fontSize: 12, fontWeight: '700' },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  pillText: { fontSize: 10, fontWeight: '600' },
  quote: { fontSize: 11, lineHeight: 16, fontStyle: 'italic' },
  bullets: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bulletText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
