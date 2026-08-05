import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Truck,
} from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { mockDeals, type EscrowDeal } from '@/constants/mockData';
import { statusBadge, TONE_COLORS, type DealStatus } from './dealStatus';

/**
 * Escrow deal detail — the phone version of `web/src/pages/EscrowDetail.tsx`.
 *
 * Same spine: header with status and escrow amount, the parties, deal terms,
 * the audit timeline, and a role- and status-aware action panel. The web opens
 * its dispatch / dispute / edit forms in modals; on a phone they expand inline
 * so there's no nested-scroll trap.
 *
 * Reads `mockDeals` — no API, so the actions don't move any money. Each one is
 * marked `TODO(api)` where the web fires its mutation.
 */

const DISPUTE_REASONS = [
  { value: 'not_delivered', label: 'Item was never delivered' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'service_not_done', label: 'Service not completed' },
  { value: 'other', label: 'Other' },
];

/**
 * The web reads `fundingTotal` / `sellerPayout` off the deal, computed server
 * side. The mock only carries `amount`, so recompute with the same rule the
 * server and the checkout screen use: fiat 1.5%, min GH₵2, capped at GH₵150,
 * split 50/50 between the parties.
 */
function dealMoney(amount: number) {
  let fee = Math.floor(amount * 100 * 0.015) / 100;
  if (fee < 2) fee = 2;
  if (fee > 150) fee = 150;
  const buyerFee = Math.floor((fee / 2) * 100) / 100;
  return {
    fundingTotal: amount + buyerFee,
    sellerPayout: amount - (fee - buyerFee),
  };
}

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatStamp(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EscrowDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const deal = useMemo(() => mockDeals.find((d) => d.id === id), [id]);

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('not_delivered');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/deals');
  };

  const backButton = (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back to My Deals"
      style={({ pressed }) => [
        styles.backRow,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <ArrowLeft size={20} color={theme.text} />
      <Text style={[styles.backText, { color: theme.text }]}>Back to My Deals</Text>
    </Pressable>
  );

  // The web renders a "Deal not found" card for an id it can't resolve.
  if (!deal) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.notFound, { color: theme.text }]}>Deal not found</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              This deal doesn&apos;t exist, or you&apos;re not a party to it.
            </Text>
            <Pressable
              onPress={() => router.replace('/deals')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Go to My Deals</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const badge = statusBadge(deal.status as DealStatus);
  const tone = TONE_COLORS[badge.tone];

  // Mock deals are all buyer-created, so the creator is the buyer side.
  const isBuyer = deal.creator.username === user?.username;
  const other = isBuyer ? deal.counterparty : deal.creator;

  // Which actions the state machine allows, mirroring the web's `has(...)`.
  const money = dealMoney(deal.amount);
  const inFlight = ['funded', 'shipped', 'delivered'].includes(deal.status);
  const canRelease = isBuyer && inFlight;
  const canDispute = inFlight;
  const canDeliver = !isBuyer && deal.status === 'funded';
  const isDone = deal.status === 'released';

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {backButton}

        {/* Header */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.headRow}>
            <View style={[styles.badge, { backgroundColor: tone.bg }]}>
              <Text style={[styles.badgeText, { color: tone.text }]}>{badge.label}</Text>
            </View>
            <Text style={[styles.code, { color: theme.textTertiary }]}>{deal.code}</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{deal.title}</Text>

          <View style={styles.amountBlock}>
            <Text style={[styles.amountLabel, { color: theme.textTertiary }]}>Escrow Amount</Text>
            <Text style={[styles.amount, { color: theme.primary }]}>
              {formatMoney(deal.amount, deal.currency)}
            </Text>
            <Text style={[styles.rail, { color: theme.textTertiary }]}>
              {deal.rail.toUpperCase()} · {deal.currency}
            </Text>
          </View>

          {/* Parties */}
          <View style={[styles.parties, { borderTopColor: theme.border }]}>
            <View style={styles.party}>
              <Text style={[styles.partyLabel, { color: theme.textTertiary }]}>
                {isBuyer ? 'You (Buyer)' : 'Buyer'}
              </Text>
              <Text style={[styles.partyName, { color: theme.text }]} numberOfLines={1}>
                @{deal.creator.username}
              </Text>
            </View>
            <View style={styles.party}>
              <Text style={[styles.partyLabel, { color: theme.textTertiary }]}>
                {isBuyer ? 'Seller' : 'You (Seller)'}
              </Text>
              <Text style={[styles.partyName, { color: theme.text }]} numberOfLines={1}>
                @{deal.counterparty.username}
              </Text>
            </View>
          </View>

          {/* On a disputed deal the web turns this amber and relabels it, since
              the thread is where evidence gets submitted. */}
          <Pressable
            onPress={() =>
              router.push(`/messages/${other.username}?redirect=/escrow/${deal.id}`)
            }
            style={({ pressed }) => [
              styles.messageBtn,
              deal.status === 'disputed'
                ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }
                : {
                    backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: theme.border,
                  },
              deal.status === 'disputed' && pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <MessageCircle size={15} color={deal.status === 'disputed' ? '#ffffff' : theme.text} />
            <Text
              style={[
                styles.messageText,
                { color: deal.status === 'disputed' ? '#ffffff' : theme.text },
              ]}
            >
              {deal.status === 'disputed'
                ? 'Open Dispute Chat & Submit Evidence'
                : `Message @${other.username}`}
            </Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Actions</Text>

          {notice ? (
            <View style={[styles.notice, { backgroundColor: theme.primaryLight }]}>
              <AlertCircle size={14} color={theme.primary} />
              <Text style={[styles.noticeText, { color: theme.primary }]}>{notice}</Text>
            </View>
          ) : null}

          {isDone ? (
            <View style={[styles.doneBox, { backgroundColor: theme.primaryLight }]}>
              <CheckCircle2 size={18} color={theme.primary} />
              <Text style={[styles.doneText, { color: theme.primary }]}>
                {isBuyer
                  ? 'Completed — funds released to the seller.'
                  : 'Payout released to your wallet.'}
              </Text>
            </View>
          ) : null}

          {/* Only while the deal is still `created` — once funded the terms are
              locked, same condition as the web's `deal.status === 'created'`. */}
          {deal.status === 'created' ? (
            <Pressable
              // TODO(api): PATCH /api/escrows/:id — opens the web's edit modal.
              onPress={() => setNotice('Editing deal terms needs the API — nothing was changed.')}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  borderWidth: 1,
                  borderColor: theme.border,
                },
              ]}
            >
              <Pencil size={16} color={theme.text} />
              <Text style={[styles.primaryBtnText, { color: theme.text }]}>Edit Deal Terms</Text>
            </Pressable>
          ) : null}

          {canDeliver ? (
            <Pressable
              // TODO(api): POST the dispatch with carrier + tracking, as the
              // web's deliver modal does.
              onPress={() => setNotice('Dispatch needs the API — nothing was sent.')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.text, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Truck size={16} color={theme.background} />
              <Text style={[styles.primaryBtnText, { color: theme.background }]}>
                Mark as Dispatched
              </Text>
            </Pressable>
          ) : null}

          {canRelease ? (
            <Pressable
              // TODO(api): call the release mutation — this is the money move.
              onPress={() => setNotice('Release needs the API — no funds moved.')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <CheckCircle2 size={16} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Confirm Receipt &amp; Release</Text>
            </Pressable>
          ) : null}

          {canDispute && !disputeOpen ? (
            <Pressable
              onPress={() => setDisputeOpen(true)}
              style={({ pressed }) => [
                styles.disputeBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <AlertTriangle size={15} color="#b91c1c" />
              <Text style={styles.disputeBtnText}>Open Dispute</Text>
            </Pressable>
          ) : null}

          {canDispute && disputeOpen ? (
            <View style={styles.disputeForm}>
              <Text style={styles.disputeHead}>Open a Formal Dispute</Text>

              {/* The web's pre-dispute warning, kept verbatim */}
              <View style={styles.warnBox}>
                <AlertCircle size={16} color="#92400e" />
                <View style={styles.warnText}>
                  <Text style={styles.warnTitle}>Contact Counterparty First</Text>
                  <Text style={styles.warnBody}>
                    Please make sure you have attempted to message the other party via the deal chat.
                    Submit a formal dispute only if they are uncooperative, unresponsive, or refusing
                    to resolve the issue.
                  </Text>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Reason</Text>
              {DISPUTE_REASONS.map((reason) => {
                const on = disputeReason === reason.value;
                return (
                  <Pressable
                    key={reason.value}
                    onPress={() => setDisputeReason(reason.value)}
                    style={[
                      styles.reasonRow,
                      {
                        backgroundColor: on ? theme.primaryLight : theme.inputBackground,
                        borderColor: on ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.reasonText, { color: on ? theme.primary : theme.textSecondary }]}
                    >
                      {reason.label}
                    </Text>
                    {on ? <CheckCircle2 size={15} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                What went wrong?
              </Text>
              <TextInput
                value={disputeDesc}
                onChangeText={setDisputeDesc}
                placeholder="Describe the issue with dates and what you expected..."
                placeholderTextColor={theme.textTertiary}
                multiline
                textAlignVertical="top"
                style={[
                  styles.textarea,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                  },
                ]}
              />

              <View style={styles.disputeActions}>
                <Pressable
                  onPress={() => setDisputeOpen(false)}
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  // TODO(api): POST the dispute with reason + description.
                  onPress={() => {
                    setDisputeOpen(false);
                    setNotice('Disputes need the API — nothing was filed.');
                  }}
                  style={styles.submitDispute}
                >
                  <Text style={styles.submitDisputeText}>Submit Dispute</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {!canRelease && !canDispute && !canDeliver && !isDone ? (
            <View style={[styles.waitBox, { backgroundColor: theme.inputBackground }]}>
              <ShieldCheck size={15} color={theme.textTertiary} />
              <Text style={[styles.waitText, { color: theme.textSecondary }]}>
                Nothing to do on this deal right now.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Deal Details — the web's own heading, with its money grid. I'd
            titled this "Deal Terms" and left the amounts out entirely. */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.sectionHead}>
            <FileText size={17} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Deal Details</Text>
          </View>

          {deal.description ? (
            <View style={[styles.descBox, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Text style={[styles.body, { color: theme.text }]}>{deal.description}</Text>
            </View>
          ) : null}

          {deal.tracking ? (
            <View style={[styles.trackingBox, { backgroundColor: theme.inputBackground }]}>
              <Truck size={15} color={theme.textTertiary} />
              <Text style={[styles.termValue, { color: theme.text }]} numberOfLines={2}>
                <Text style={{ fontFamily: Fonts.sans[700] }}>{deal.tracking.carrier}:</Text>{' '}
                {deal.tracking.code}
              </Text>
            </View>
          ) : null}

          {/* Item Amount + what this side actually pays or receives */}
          <View style={styles.moneyGrid}>
            <View style={[styles.moneyCell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Text style={[styles.moneyLabel, { color: theme.textTertiary }]}>Item Amount</Text>
              <Text style={[styles.moneyValue, { color: theme.text }]}>
                {formatMoney(deal.amount, deal.currency)}
              </Text>
            </View>
            <View style={[styles.moneyCell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Text style={[styles.moneyLabel, { color: theme.textTertiary }]}>
                {isBuyer ? 'You Paid' : 'Your Payout'}
              </Text>
              <Text style={[styles.moneyValue, { color: theme.text }]}>
                {formatMoney(isBuyer ? money.fundingTotal : money.sellerPayout, deal.currency)}
              </Text>
            </View>
          </View>

          {/* Extra to the web: the mock carries a release condition and it's
              worth surfacing on a screen about releasing money. */}
          <View style={[styles.termRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.termLabel, { color: theme.textTertiary }]}>Release Condition</Text>
            <Text style={[styles.termValue, { color: theme.text }]}>{deal.releaseCondition}</Text>
          </View>
        </View>

        {/* Audit timeline */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Audit Timeline</Text>

          {deal.events.map((event, i) => {
            const last = i === deal.events.length - 1;
            return (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.eventRail}>
                  <View style={[styles.eventDot, { backgroundColor: theme.primary }]} />
                  {!last ? <View style={[styles.eventLine, { backgroundColor: theme.border }]} /> : null}
                </View>
                <View style={styles.eventBody}>
                  <Text style={[styles.eventType, { color: theme.text }]}>
                    {event.type.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={[styles.eventDesc, { color: theme.textSecondary }]}>
                    {event.description}
                  </Text>
                  <Text style={[styles.eventMeta, { color: theme.textTertiary }]}>
                    @{event.actor} · {formatStamp(event.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  backText: { fontSize: 13, fontFamily: Fonts.sans[700] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },

  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },
  code: { fontSize: 11.5, fontFamily: Fonts.sans[700] },

  // Heading uses the web's `font-display`.
  title: { fontSize: 19, fontFamily: Fonts.display[700], letterSpacing: -0.3, lineHeight: 25 },

  amountBlock: { gap: 2 },
  amountLabel: { fontSize: 11, fontFamily: Fonts.sans[500] },
  amount: { fontSize: 26, fontFamily: Fonts.display[700], letterSpacing: -0.5 },
  rail: { fontSize: 10.5, fontFamily: Fonts.sans[600] },

  parties: { flexDirection: 'row', gap: Spacing.three, borderTopWidth: 1, paddingTop: Spacing.three },
  party: { flex: 1, gap: 2 },
  partyLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  partyName: { fontSize: 12.5, fontFamily: Fonts.sans[700] },

  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  messageText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.display[700] },
  body: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  notFound: { fontSize: 17, fontFamily: Fonts.display[700] },

  termRow: { borderTopWidth: 1, paddingTop: Spacing.three, gap: 2 },
  termLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  termValue: { fontSize: 12.5, lineHeight: 17, fontFamily: Fonts.sans[500] },
  descBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  moneyGrid: { flexDirection: 'row', gap: Spacing.two },
  moneyCell: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 2 },
  moneyLabel: { fontSize: 10, fontFamily: Fonts.sans[500] },
  moneyValue: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  trackingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  trackingText: { flex: 1, gap: 2 },

  eventRow: { flexDirection: 'row', gap: Spacing.three },
  eventRail: { alignItems: 'center', width: 12 },
  eventDot: { height: 9, width: 9, borderRadius: Radius.full, marginTop: 3 },
  eventLine: { flex: 1, width: 1.5, marginTop: 2 },
  eventBody: { flex: 1, paddingBottom: Spacing.three, gap: 2 },
  eventType: { fontSize: 10.5, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },
  eventDesc: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },
  eventMeta: { fontSize: 10, fontFamily: Fonts.sans[500] },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  noticeText: { flex: 1, fontSize: 11.5, fontFamily: Fonts.sans[600] },

  doneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  doneText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: 13.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  disputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: Radius.md,
  },
  disputeBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#b91c1c' },

  disputeForm: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  disputeHead: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#b91c1c',
  },
  warnBox: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  warnText: { flex: 1, gap: 2 },
  warnTitle: { fontSize: 12, fontFamily: Fonts.sans[700], color: '#92400e' },
  warnBody: { fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[400], color: '#92400e' },

  fieldLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  reasonText: { flex: 1, fontSize: 12, fontFamily: Fonts.sans[600] },
  textarea: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    minHeight: 88,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,

  disputeActions: { flexDirection: 'row', gap: Spacing.two, marginTop: 2 },
  cancelBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  cancelText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  submitDispute: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#e11d48',
  },
  submitDisputeText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  waitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  waitText: { flex: 1, fontSize: 12, fontFamily: Fonts.sans[500] },
});
