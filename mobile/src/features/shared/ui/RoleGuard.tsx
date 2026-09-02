import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, ShieldAlert, Store } from '@/components/icons';

import { Fonts, ReadingWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePersona } from '@/hooks/use-persona';

/**
 * Gates a screen behind a persona — the phone version of the web's
 * `SellerGuard` / `AdminGuard` layout routes, with the same copy.
 *
 * `require="seller"` admits admins too, exactly as the web does
 * (`me.role === 'admin' || me.kycStatus === 'verified'`), since an admin can
 * manage anything a seller can.
 *
 * This is convenience, not security: it stops people walking into a screen
 * that can't work for them. The server re-checks every protected endpoint —
 * on the web via `requireSeller` and the admin middleware — so a guard being
 * bypassed on the client grants nothing.
 */

export interface RoleGuardProps {
  require: 'seller' | 'admin';
  children: ReactNode;
}

export function RoleGuard({ require: required, children }: RoleGuardProps) {
  const theme = useTheme();
  const router = useRouter();
  const persona = usePersona();

  const allowed = required === 'admin' ? persona === 'admin' : persona === 'seller' || persona === 'admin';

  if (allowed) return <>{children}</>;

  const isAdminGate = required === 'admin';

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.center}>
        <View
          style={[
            styles.badge,
            { backgroundColor: isAdminGate ? '#ffe4e6' : theme.primaryLight },
          ]}
        >
          {isAdminGate ? (
            <ShieldAlert size={28} color="#e11d48" />
          ) : (
            <Store size={28} color={theme.primary} />
          )}
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {isAdminGate ? 'Admin access required' : 'Sellers only'}
        </Text>

        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {isAdminGate
            ? 'Your account does not have administrator permissions.'
            : 'Listing management is for verified sellers. Complete seller verification to start listing goods.'}
        </Text>

        <Pressable
          onPress={() => router.replace(isAdminGate ? '/home' : '/sell')}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>
            {isAdminGate ? 'Back to Home' : 'Become a Seller'}
          </Text>
          <ArrowRight size={15} color="#ffffff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    width: '100%',
    maxWidth: ReadingWidth,
    alignSelf: 'center',
  },
  badge: {
    height: 60,
    width: 60,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Heading uses the web's `font-display`.
  title: { fontSize: 20, fontFamily: Fonts.display[700], textAlign: 'center' },
  body: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Fonts.sans[400],
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  buttonText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
