import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * One metric tile — the phone version of the stat cards used across the web
 * dashboards (`UserDashboard`, `SellerDashboard`, `AdminDashboard`).
 *
 * Same anatomy: uppercase label with an icon on the right, the figure in the
 * display font, and an optional sub-line. Passing `onPress` makes the whole
 * tile tappable, matching the web tiles that are wrapped in a <Link>.
 */

export interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  /** Colour for the icon and figure; defaults to the theme's text colour. */
  accent?: string;
  /** Colour for the sub-line, when it should stand out (e.g. the escrow note). */
  subAccent?: string;
  onPress?: () => void;
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  subAccent,
  onPress,
}: StatCardProps) {
  const theme = useTheme();

  const body = (
    <>
      <View style={styles.top}>
        <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        <Icon size={18} color={accent ?? theme.primary} />
      </View>
      <Text style={[styles.value, { color: accent ?? theme.text }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.sub, { color: subAccent ?? theme.textTertiary }]} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: pressed ? theme.primary : theme.cardBorder },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // Two per row with the parent's gap taken out.
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 4,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  label: {
    flex: 1,
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // Figures use the web's `font-display`.
  value: { fontSize: 17, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  sub: { fontSize: 10.5, lineHeight: 14, fontFamily: Fonts.sans[500] },
});
