import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Banknote, Check, CheckCircle2, Clock, XCircle } from '@/components/icons';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  useAdminWithdrawals,
  useCompleteWithdrawal,
  useRejectWithdrawal,
  type AdminWithdrawal,
  type WithdrawalFilter,
  type WithdrawalStatus,
} from '../data/adminWithdrawalsApi';
import {
  AdminButton,
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminScreen,
  DetailRow,
  FilterChips,
  StatusPill,
  money,
  shortDate,
} from './AdminScaffold';

/**
 * The payout review queue — the phone version of
 * `web/src/pages/AdminWithdrawalsList.tsx`.
 *
 * The asymmetry between the two verdicts is the thing to keep in mind here, and
 * why the copy says it out loud: the money left the user's balance when they
 * asked for it, so completing is only bookkeeping, and rejecting is the action
 * that actually moves money — back to them.
 *
 * Rejection reasons are collected inline rather than in a modal, matching the
 * KYC screen. `AdminScreen` already scrolls keyboard-aware, so an input this
 * far down the page lifts clear on its own.
 */

const TABS: { id: WithdrawalFilter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const PILL: Record<WithdrawalStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Awaiting review', bg: '#fef3c7', fg: '#92400e' },
  completed: { label: 'Sent', bg: '#dcfce7', fg: '#166534' },
  rejected: { label: 'Rejected', bg: '#fee2e2', fg: '#991b1b' },
};

const STATUS_ICON: Record<WithdrawalStatus, typeof Clock> = {
  pending: Clock,
  completed: CheckCircle2,
  rejected: XCircle,
};

export function AdminWithdrawalsScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<WithdrawalFilter>('pending');

  const query = `status=${tab}&page=1&limit=20`;
  const withdrawalsQuery = useAdminWithdrawals(query);
  const complete = useCompleteWithdrawal();
  const reject = useRejectWithdrawal();

  /** Which row has its reason box open, and what has been typed into it. */
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const rows = withdrawalsQuery.data?.withdrawals ?? [];
  const busy = complete.isPending || reject.isPending;
  const actionError = complete.error ?? reject.error;

  const startReject = (id: string) => {
    setRejectingId(id);
    setReason('');
  };

  const confirmReject = (id: string) => {
    reject.mutate(
      { id, reason: reason.trim() },
      {
        onSuccess: () => {
          setRejectingId(null);
          setReason('');
        },
      },
    );
  };

  return (
    <AdminScreen
      title="Withdrawal Queue"
      subtitle="Requests are already debited. Completing records the money as sent; rejecting returns it."
      onRefresh={() => void withdrawalsQuery.refetch()}
      refreshing={withdrawalsQuery.isFetching && !withdrawalsQuery.isLoading}
    >
      <FilterChips options={TABS} value={tab} onChange={setTab} />

      {actionError ? <AdminError message={apiErrorMessage(actionError)} /> : null}

      {withdrawalsQuery.isLoading ? (
        <AdminLoading />
      ) : withdrawalsQuery.error ? (
        <AdminError message={apiErrorMessage(withdrawalsQuery.error)} />
      ) : rows.length === 0 ? (
        <AdminEmpty
          icon={Banknote}
          title={tab === 'pending' ? 'No payouts waiting' : 'Nothing here'}
          hint={
            tab === 'pending'
              ? 'Requests appear here the moment a seller asks to cash out.'
              : 'No payouts match this filter.'
          }
        />
      ) : (
        rows.map((w) => (
          <WithdrawalRow
            key={w.id}
            withdrawal={w}
            busy={busy}
            rejecting={rejectingId === w.id}
            reason={reason}
            onReasonChange={setReason}
            onStartReject={() => startReject(w.id)}
            onCancelReject={() => setRejectingId(null)}
            onConfirmReject={() => confirmReject(w.id)}
            onComplete={() => complete.mutate(w.id)}
            completing={complete.isPending}
            rejectPending={reject.isPending}
            theme={theme}
          />
        ))
      )}
    </AdminScreen>
  );
}

function WithdrawalRow({
  withdrawal: w,
  busy,
  rejecting,
  reason,
  onReasonChange,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  onComplete,
  completing,
  rejectPending,
  theme,
}: {
  withdrawal: AdminWithdrawal;
  busy: boolean;
  rejecting: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
  onComplete: () => void;
  completing: boolean;
  rejectPending: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  const pill = PILL[w.status];
  const Icon = STATUS_ICON[w.status];

  return (
    <AdminCard>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Icon size={15} color={pill.fg} />
          <Text style={[styles.amount, { color: theme.text }]}>{money(w.amount, w.currency)}</Text>
        </View>
        <StatusPill label={pill.label} bg={pill.bg} fg={pill.fg} />
      </View>

      <DetailRow label="Requested by" value={`@${w.user.username} · ${w.user.fullName}`} />
      {/* Wraps rather than truncates — a TRON address is 34 characters and an
          admin checking one against a KYC record needs all of it. */}
      <DetailRow
        label={w.currency === 'GHS' ? 'Mobile money number' : 'TRX address'}
        value={
          <Text style={[styles.destination, { color: theme.text }]} selectable>
            {w.destination}
          </Text>
        }
      />
      <DetailRow label="Requested" value={shortDate(w.createdAt)} />

      {w.status === 'rejected' && w.reviewNote ? (
        <View style={[styles.note, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
          <Text style={styles.noteLabel}>Rejected for</Text>
          <Text style={styles.noteText}>{w.reviewNote}</Text>
        </View>
      ) : null}

      {w.status === 'pending' ? (
        rejecting ? (
          <View style={styles.rejectBox}>
            <Text style={[styles.reasonLabel, { color: theme.textSecondary }]}>
              Reason for rejection
            </Text>
            {/* Said plainly, because it is the part an admin most needs to be
                sure of before tapping. */}
            <Text style={[styles.reasonHint, { color: theme.textTertiary }]}>
              {money(w.amount, w.currency)} goes back to @{w.user.username}, and they are shown this
              reason.
            </Text>
            <TextInput
              value={reason}
              onChangeText={onReasonChange}
              placeholder="e.g. The momo number doesn't match the name on the KYC record."
              placeholderTextColor={theme.textTertiary}
              multiline
              maxLength={300}
              textAlignVertical="top"
              style={[
                styles.reasonInput,
                {
                  color: theme.text,
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.inputBorder,
                },
              ]}
            />
            <View style={styles.actions}>
              <AdminButton
                label="Cancel"
                tone="secondary"
                onPress={onCancelReject}
                disabled={busy}
                style={styles.action}
              />
              <AdminButton
                label="Reject & refund"
                tone="danger"
                icon={XCircle}
                onPress={onConfirmReject}
                loading={rejectPending}
                disabled={reason.trim().length < 3}
                style={styles.action}
              />
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <AdminButton
              label="Reject"
              tone="secondary"
              onPress={onStartReject}
              disabled={busy}
              style={styles.action}
            />
            <AdminButton
              label="Mark sent"
              tone="success"
              icon={Check}
              onPress={onComplete}
              loading={completing}
              disabled={busy}
              style={styles.action}
            />
          </View>
        )
      ) : null}
    </AdminCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  amount: { fontSize: 17, fontFamily: Fonts.display[700], letterSpacing: -0.3 },

  destination: { fontSize: 13, fontFamily: Fonts.sans[600], lineHeight: 19 },

  note: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 3 },
  noteLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#991b1b',
  },
  noteText: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400], color: '#991b1b' },

  rejectBox: { gap: Spacing.two },
  reasonLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reasonHint: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[400] },
  reasonInput: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
  },

  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
