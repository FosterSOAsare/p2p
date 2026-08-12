import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gavel, MessageSquare, Paperclip } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useAdminDisputeDetail,
  useResolveDispute,
  type DisputeMessage,
} from '../data/adminDisputesApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  AdminButton,
  AdminCard,
  AdminError,
  AdminLoading,
  AdminScreen,
  DetailRow,
  StatusPill,
  money,
  shortDate,
} from './AdminScaffold';

/**
 * Phone version of `web/src/pages/AdminDisputeDetail.tsx` — the ruling screen.
 *
 * A ruling moves real money, so the order here is deliberate: the money at
 * stake, then each side's case, then the evidence, and only then the decision.
 * The split option asks for the buyer's share explicitly and shows what the
 * seller is left with, so nobody rules on a number they didn't see.
 */

type Outcome = 'release' | 'refund' | 'split';

const REASON_LABELS: Record<string, string> = {
  not_delivered: 'Not delivered',
  not_as_described: 'Not as described',
  wrong_item: 'Wrong item',
  service_not_done: 'Service not done',
  other: 'Other',
};

const OUTCOMES: { id: Outcome; label: string; hint: string }[] = [
  { id: 'release', label: 'Release to seller', hint: 'Buyer’s claim not upheld' },
  { id: 'refund', label: 'Refund the buyer', hint: 'Full refund of what they paid' },
  { id: 'split', label: 'Split', hint: 'Partial refund, rest to the seller' },
];

export function AdminDisputeDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();

  const query = useAdminDisputeDetail(id);
  const resolve = useResolveDispute();

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [buyerRefund, setBuyerRefund] = useState('');
  const [note, setNote] = useState('');

  const dispute = query.data;
  const escrow = dispute?.escrow;

  const fundingTotal = escrow?.fundingTotal ?? 0;
  const refundValue = Number.parseFloat(buyerRefund);
  const refundValid =
    outcome !== 'split' || (Number.isFinite(refundValue) && refundValue >= 0 && refundValue <= fundingTotal);
  const canRule = Boolean(outcome) && note.trim().length >= 5 && refundValid;

  return (
    <AdminScreen title="Dispute" subtitle={escrow?.title}>
      {query.isLoading ? (
        <AdminLoading />
      ) : query.isError || !dispute || !escrow ? (
        <AdminError message={apiErrorMessage(query.error)} />
      ) : (
        <>
          {/* Money at stake */}
          <AdminCard>
            <View style={styles.headRow}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Escrow {escrow.code}</Text>
              <StatusPill
                label={dispute.status}
                bg={dispute.status === 'open' ? '#fee2e2' : '#dcfce7'}
                fg={dispute.status === 'open' ? '#991b1b' : '#166534'}
              />
            </View>
            <Text style={[styles.amount, { color: theme.text }]}>
              {money(escrow.amount, escrow.currency)}
            </Text>
            <View style={styles.pairRow}>
              <DetailRow label="Buyer paid" value={money(escrow.fundingTotal, escrow.currency)} />
              <DetailRow label="Seller would get" value={money(escrow.sellerPayout, escrow.currency)} />
            </View>
            <View style={styles.pairRow}>
              <DetailRow label="Buyer" value={escrow.buyer ? `@${escrow.buyer.username}` : '—'} />
              <DetailRow label="Seller" value={escrow.seller ? `@${escrow.seller.username}` : '—'} />
            </View>
          </AdminCard>

          {/* The claim */}
          <AdminCard>
            <Text style={[styles.cardTitle, { color: theme.text }]}>The claim</Text>
            <DetailRow label="Reason" value={REASON_LABELS[dispute.reason] ?? dispute.reason} />
            <DetailRow
              label={`Opened by @${dispute.openedBy.username}`}
              value={shortDate(dispute.createdAt)}
            />
            <Text style={[styles.body, { color: theme.text }]}>{dispute.description}</Text>
          </AdminCard>

          {/* Evidence */}
          <AdminCard>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Evidence · {escrow.messages.length} message{escrow.messages.length === 1 ? '' : 's'}
            </Text>
            {escrow.messages.length === 0 ? (
              <View style={styles.emptyRow}>
                <MessageSquare size={15} color={theme.textTertiary} />
                <Text style={[styles.muted, { color: theme.textSecondary }]}>
                  No messages were exchanged on this deal.
                </Text>
              </View>
            ) : (
              <View style={styles.transcript}>
                {escrow.messages.map((m: DisputeMessage) => (
                  <View
                    key={m.id}
                    style={[styles.msg, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                  >
                    <Text style={[styles.msgWho, { color: theme.textSecondary }]}>
                      @{m.senderUsername} · {shortDate(m.createdAt)}
                    </Text>
                    {m.attachment ? (
                      <View style={styles.attachment}>
                        {m.attachment.mime?.startsWith('image/') ? (
                          <Image source={{ uri: m.attachment.url }} style={styles.thumb} resizeMode="cover" />
                        ) : (
                          <Paperclip size={14} color={theme.textSecondary} />
                        )}
                        <Text style={[styles.msgBody, { color: theme.text }]} numberOfLines={2}>
                          {m.attachment.name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.msgBody, { color: theme.text }]}>{m.body}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </AdminCard>

          {resolve.isError ? <AdminError message={apiErrorMessage(resolve.error)} /> : null}

          {/* Ruling */}
          {dispute.status === 'open' ? (
            <AdminCard>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Ruling</Text>

              {OUTCOMES.map((opt) => {
                const active = outcome === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setOutcome(opt.id)}
                    style={[
                      styles.option,
                      {
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? theme.primaryLight : 'transparent',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        { borderColor: active ? theme.primary : theme.inputBorder },
                      ]}
                    >
                      {active ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
                    </View>
                    <View style={styles.optionBody}>
                      <Text style={[styles.optionLabel, { color: theme.text }]}>{opt.label}</Text>
                      <Text style={[styles.optionHint, { color: theme.textSecondary }]}>{opt.hint}</Text>
                    </View>
                  </Pressable>
                );
              })}

              {outcome === 'split' ? (
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                    Refund to buyer (max {money(fundingTotal, escrow.currency)})
                  </Text>
                  <TextInput
                    value={buyerRefund}
                    onChangeText={setBuyerRefund}
                    keyboardType="decimal-pad"
                    editable={!resolve.isPending}
                    placeholder="0.00"
                    placeholderTextColor={theme.textTertiary}
                    style={[
                      styles.input,
                      { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text },
                    ]}
                  />
                  <Text style={[styles.helper, { color: refundValid ? theme.textSecondary : '#b91c1c' }]}>
                    {refundValid
                      ? `Seller keeps about ${money(Math.max(0, fundingTotal - (refundValue || 0)), escrow.currency)} before fees.`
                      : `Enter an amount between 0 and ${money(fundingTotal, escrow.currency)}.`}
                  </Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Ruling note (both parties see this)
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  editable={!resolve.isPending}
                  placeholder="Explain the decision."
                  placeholderTextColor={theme.textTertiary}
                  style={[
                    styles.input,
                    styles.multiline,
                    { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text },
                  ]}
                />
              </View>

              <AdminButton
                label="Submit ruling"
                icon={Gavel}
                tone="primary"
                loading={resolve.isPending}
                disabled={!canRule}
                onPress={() =>
                  outcome &&
                  resolve.mutate(
                    {
                      id: dispute.id,
                      outcome,
                      rulingNote: note.trim(),
                      ...(outcome === 'split' ? { buyerRefund: refundValue } : {}),
                    },
                    { onSuccess: () => router.back() },
                  )
                }
              />
            </AdminCard>
          ) : (
            <AdminCard>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Ruling</Text>
              <DetailRow label="Outcome" value={dispute.outcome ?? '—'} />
              {dispute.rulingNote ? <DetailRow label="Note" value={dispute.rulingNote} /> : null}
              {dispute.resolvedAt ? (
                <DetailRow label="Resolved" value={shortDate(dispute.resolvedAt)} />
              ) : null}
            </AdminCard>
          )}
        </>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  cardTitle: { fontSize: 13, fontFamily: Fonts.display[700] },
  amount: { fontSize: 24, fontFamily: Fonts.display[700], letterSpacing: -0.5 },
  pairRow: { flexDirection: 'row', gap: Spacing.four },
  body: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans[400] },
  muted: { flex: 1, fontSize: 12.5, fontFamily: Fonts.sans[400] },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

  transcript: { gap: Spacing.two },
  msg: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 3 },
  msgWho: { fontSize: 10.5, fontFamily: Fonts.sans[700] },
  msgBody: { flex: 1, fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  thumb: { width: 40, height: 40, borderRadius: Radius.sm },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  optionBody: { flex: 1, gap: 1 },
  optionLabel: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  optionHint: { fontSize: 11.5, fontFamily: Fonts.sans[400] },

  field: { gap: 6 },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  helper: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[400] },
});
