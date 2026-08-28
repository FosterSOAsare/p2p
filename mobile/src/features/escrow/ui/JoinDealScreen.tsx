import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Handshake, LogIn, ShieldCheck, TriangleAlert } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { usePublicDeal, useAcceptDealByCode } from '../data/joinApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import { AdminButton, AdminError, AdminLoading } from '@/features/admin/ui/AdminScaffold';

/**
 * The landing screen for a deal's share link or scanned QR — the phone version
 * of `web/src/pages/JoinDeal.tsx`.
 *
 * Public by design: the terms are readable before signing in, because asking
 * someone to log in before they can see what they'd be agreeing to is a poor
 * trade. Accepting fills whichever side the creator didn't take.
 */

const money = (amount: number, currency: string) =>
  currency === 'GHS'
    ? `GH₵ ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${amount} ${currency}`;

export function JoinDealScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code = '' } = useLocalSearchParams<{ code: string }>();

  const { user, isAuthenticated } = useAuth();
  const previewQuery = usePublicDeal(code);
  const accept = useAcceptDealByCode();

  const deal = previewQuery.data;

  const content = () => {
    if (previewQuery.isLoading) return <AdminLoading />;

    /*
      A short confirmation, then straight to the deal — the web navigates there
      immediately (`JoinDeal.tsx`), and that is where the buyer funds it.

      This used to stop here permanently, because the deal screen still read
      mock data and a real id landed on "deal not found". It reads the API now,
      so the dead end is gone; the beat on screen is kept only because joining
      is the moment worth confirming.
    */
    if (accept.isSuccess) {
      return (
        <View style={styles.centered}>
          <View style={[styles.successIcon, { backgroundColor: '#dcfce7' }]}>
            <ShieldCheck size={26} color="#166534" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>You've joined the deal</Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
            {deal ? `“${deal.title}” is now between you and @${deal.creator.username}.` : ''} Opening
            it now.
          </Text>
          <AdminButton
            label="Open the deal"
            onPress={() => router.replace(`/escrow/${accept.data.deal.id}`)}
          />
        </View>
      );
    }

    if (previewQuery.isError || !deal) {
      return (
        <View style={styles.centered}>
          <TriangleAlert size={30} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Deal not found</Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
            {previewQuery.error
              ? apiErrorMessage(previewQuery.error)
              : "This share code doesn't match any deal."}
          </Text>
          <AdminButton
            label="Go to my deals"
            tone="secondary"
            icon={ArrowLeft}
            onPress={() => router.replace('/deals')}
          />
        </View>
      );
    }

    // You take whichever side the creator didn't, and see that side's figure.
    const myRole = deal.creatorIsBuyer ? 'seller' : 'buyer';
    const myFigure = myRole === 'buyer' ? deal.fundingTotal : deal.sellerPayout;
    const isCreator = Boolean(user && user.username === deal.creator.username);

    const feeLine =
      deal.feeSplit === 'split'
        ? 'The platform fee is split evenly between both sides.'
        : deal.feeSplit === 'buyer'
          ? 'The platform fee is paid by the buyer.'
          : 'The platform fee is paid by the seller.';

    return (
      <>
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
            <Handshake size={13} color={theme.primary} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>Escrow Deal Invite</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{deal.title}</Text>
          <Text style={[styles.byline, { color: theme.textSecondary }]}>
            Created by @{deal.creator.username}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {deal.description ? (
            <Text
              style={[
                styles.description,
                { color: theme.textSecondary, backgroundColor: theme.backgroundElement },
              ]}
            >
              {deal.description}
            </Text>
          ) : null}

          <View style={[styles.amountBox, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Escrow amount</Text>
            <Text style={[styles.amount, { color: theme.primary }]}>
              {money(deal.amount, deal.currency)}
            </Text>
          </View>

          <View style={styles.pairRow}>
            <View style={[styles.pairCell, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.pairLabel, { color: theme.textSecondary }]}>You would be the</Text>
              <Text style={[styles.pairValue, { color: theme.text }]}>{myRole}</Text>
            </View>
            <View style={[styles.pairCell, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.pairLabel, { color: theme.textSecondary }]}>
                {myRole === 'buyer' ? 'You would pay' : 'You would receive'}
              </Text>
              <Text style={[styles.pairValue, { color: theme.text }]}>
                {money(myFigure, deal.currency)}
              </Text>
            </View>
          </View>

          <Text style={[styles.fee, { color: theme.textTertiary }]}>
            {feeLine} These are the terms you accept by joining.
          </Text>

          <View style={[styles.safety, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
            <ShieldCheck size={14} color="#166534" />
            <Text style={styles.safetyText}>
              Funds stay in escrow until the buyer confirms they got what they paid for.
            </Text>
          </View>

          {accept.isError ? <AdminError message={apiErrorMessage(accept.error)} /> : null}

          {!deal.joinable ? (
            <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
                This deal isn't open to join — it already has both parties, or it has moved past the
                invite stage.
              </Text>
            </View>
          ) : isCreator ? (
            <>
              <View style={[styles.notice, { backgroundColor: '#fef9c3' }]}>
                <Text style={[styles.noticeText, { color: '#854d0e' }]}>
                  This is your own deal — send the link to the other party instead.
                </Text>
              </View>
              <AdminButton label="Back to my deals" tone="secondary" onPress={() => router.replace('/deals')} />
            </>
          ) : !isAuthenticated ? (
            <AdminButton
              label="Sign in to join"
              icon={LogIn}
              onPress={() => router.push('/login')}
            />
          ) : (
            <AdminButton
              label={`Join as ${myRole}`}
              icon={Handshake}
              loading={accept.isPending}
              onPress={() =>
                accept.mutate(deal.code, {
                  // Let the confirmation land, then move on by itself. The
                  // button on that panel is the manual path for anyone who
                  // taps it first, and `replace` either way so Back doesn't
                  // return to a code that has already been redeemed.
                  onSuccess: ({ deal: joined }) => {
                    setTimeout(() => router.replace(`/escrow/${joined.id}`), 1200);
                  },
                })
              }
            />
          )}
        </View>
      </>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.seven },
        ]}
      >
        {content()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, gap: Spacing.four },

  hero: { alignItems: 'center', gap: 6 },
  badge: {
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
  title: {
    fontSize: 22,
    fontFamily: Fonts.display[700],
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  byline: { fontSize: 12, fontFamily: Fonts.sans[400] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Fonts.sans[400],
    borderRadius: Radius.md,
    padding: Spacing.three,
  },

  amountBox: { alignItems: 'center', borderRadius: Radius.md, paddingVertical: Spacing.four, gap: 2 },
  amountLabel: { fontSize: 11, fontFamily: Fonts.sans[500] },
  amount: { fontSize: 28, fontFamily: Fonts.display[700], letterSpacing: -0.6 },

  pairRow: { flexDirection: 'row', gap: Spacing.two },
  pairCell: { flex: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 2 },
  pairLabel: { fontSize: 10.5, fontFamily: Fonts.sans[500] },
  pairValue: { fontSize: 14, fontFamily: Fonts.sans[700], textTransform: 'capitalize' },

  fee: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[400] },

  safety: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  safetyText: { flex: 1, fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[500], color: '#166534' },

  notice: { borderRadius: Radius.md, padding: Spacing.three },
  noticeText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[500], textAlign: 'center' },

  centered: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.eight },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontFamily: Fonts.display[700] },
  emptyHint: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400], textAlign: 'center' },
});
