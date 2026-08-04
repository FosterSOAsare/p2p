import type { ComponentType, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck, TriangleAlert } from 'lucide-react-native';

import { Accent, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shared furniture for the admin console screens.
 *
 * The web keeps its admin pages visually identical to each other (console
 * badge, display-face title, one-line purpose, then content). These pieces do
 * the same on a phone so the seven screens read as one product, and so no
 * screen has to re-solve safe areas, scrolling, or the loading/empty/error
 * triplet.
 *
 * Deliberately roomy: this app wasn't designed mobile-first, and cramming the
 * web's dense tables onto a 390pt screen is what makes admin tools miserable.
 * Content gets full width, one idea per row, and generous vertical rhythm.
 */

/* ── Screen shell ─────────────────────────────────────────────── */

export function AdminScreen({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
  /** Hidden on the console itself, which is reached from the tab bar. */
  showBack = true,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  showBack?: boolean;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.eight },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          ) : undefined
        }
      >
        {showBack && (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin'))}
            hitSlop={10}
            style={styles.back}
          >
            <ArrowLeft size={16} color={theme.textSecondary} />
            <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
          </Pressable>
        )}

        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
            <ShieldCheck size={13} color={theme.primary} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>Admin Console</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>

        {children}
      </ScrollView>

      {footer}
    </View>
  );
}

/* ── Loading / error / empty ──────────────────────────────────── */

export function AdminLoading() {
  const theme = useTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

export function AdminError({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
      <TriangleAlert size={16} color={Accent.error} />
      <Text style={[styles.noticeText, { color: '#991b1b' }]}>{message}</Text>
    </View>
  );
}

export function AdminEmpty({
  icon: Icon,
  title,
  hint,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  title: string;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <Icon size={30} color={theme.textTertiary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      {hint ? <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

/* ── Building blocks ──────────────────────────────────────────── */

/** A bordered surface — the phone equivalent of the web's rounded card. */
export function AdminCard({ children, style }: { children: ReactNode; style?: object }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }, style]}>
      {children}
    </View>
  );
}

/** Coloured status chip. Pass explicit colours so each domain owns its palette. */
export function StatusPill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Label above value — the detail-row pattern used across the review screens. */
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Horizontal filter chips. Scrolls rather than wrapping so rows stay one line. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.primary : theme.backgroundElement,
                borderColor: active ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[styles.chipText, { color: active ? '#ffffff' : theme.textSecondary }]}
            >
              {opt.label}
            </Text>
            {opt.count != null && opt.count > 0 && (
              <View style={[styles.chipCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : theme.backgroundSelected }]}>
                <Text style={[styles.chipCountText, { color: active ? '#ffffff' : theme.textSecondary }]}>
                  {opt.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Primary/secondary/destructive action button, sized for a thumb. */
export function AdminButton({
  label,
  onPress,
  tone = 'primary',
  icon: Icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: ComponentType<{ size?: number; color?: string }>;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
}) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, fg: '#ffffff', border: theme.primary },
    success: { bg: '#16a34a', fg: '#ffffff', border: '#16a34a' },
    danger: { bg: Accent.error, fg: '#ffffff', border: Accent.error },
    secondary: { bg: 'transparent', fg: theme.text, border: theme.border },
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {Icon ? <Icon size={15} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ── Formatting helpers shared by the admin screens ───────────── */

export const money = (amount: number, currency = 'GHS') =>
  currency === 'GHS'
    ? `GH₵ ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${amount} ${currency}`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, gap: Spacing.four },

  back: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.one },
  backText: { fontSize: 12.5, fontFamily: Fonts.sans[600] },

  header: { borderBottomWidth: 1, paddingBottom: Spacing.three, gap: 6 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: { fontSize: 20, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  centered: { paddingVertical: Spacing.eight, alignItems: 'center' },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  noticeText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[600] },

  empty: {
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.seven,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: { fontSize: 14, fontFamily: Fonts.display[700] },
  emptyHint: { fontSize: 12, textAlign: 'center', fontFamily: Fonts.sans[400], lineHeight: 17 },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },

  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full },
  pillText: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },

  detailRow: { gap: 2 },
  detailLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: { fontSize: 13.5, fontFamily: Fonts.sans[600], lineHeight: 19 },

  chipRow: { gap: Spacing.two, paddingRight: Spacing.four },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  chipCount: { minWidth: 18, alignItems: 'center', borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1 },
  chipCountText: { fontSize: 10.5, fontFamily: Fonts.sans[700] },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: Radius.md,
    // 44pt minimum touch target.
    paddingVertical: Platform.select({ ios: 13, default: 12 }),
    paddingHorizontal: Spacing.four,
  },
  buttonText: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
});
