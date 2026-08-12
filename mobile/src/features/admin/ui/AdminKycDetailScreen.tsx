import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ban, Check, ShieldCheck } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAdminKyc, useApproveKyc, useRejectKyc } from '../data/adminApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  AdminButton,
  AdminCard,
  AdminError,
  AdminLoading,
  AdminScreen,
  DetailRow,
  StatusPill,
  shortDate,
} from './AdminScaffold';

/**
 * Phone version of `web/src/pages/AdminKycDetail.tsx`.
 *
 * One decision per screen: read the submission, then approve or reject with a
 * reason. Rejection requires the reason — it's what the seller is shown — so
 * the field appears inline rather than in a second modal.
 */

const PILL = {
  pending: { bg: '#fef9c3', fg: '#854d0e' },
  verified: { bg: '#dcfce7', fg: '#166534' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
} as const;

export function AdminKycDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();

  const query = useAdminKyc(id);
  const approve = useApproveKyc();
  const reject = useRejectKyc();

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const kyc = query.data;
  const busy = approve.isPending || reject.isPending;
  const actionError = approve.error ?? reject.error;

  return (
    <AdminScreen title="KYC Submission" subtitle={kyc ? kyc.storeName : undefined}>
      {query.isLoading ? (
        <AdminLoading />
      ) : query.isError || !kyc ? (
        <AdminError message={apiErrorMessage(query.error)} />
      ) : (
        <>
          {/* Applicant */}
          <AdminCard>
            <View style={styles.headRow}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{kyc.storeName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.headBody}>
                <Text style={[styles.store, { color: theme.text }]}>{kyc.storeName}</Text>
                <Text style={[styles.handle, { color: theme.textSecondary }]}>
                  @{kyc.user.username} · {kyc.user.email}
                </Text>
              </View>
              <StatusPill label={kyc.status} bg={PILL[kyc.status].bg} fg={PILL[kyc.status].fg} />
            </View>
            <Text style={[styles.submitted, { color: theme.textTertiary }]}>
              Submitted {shortDate(kyc.submittedAt)}
              {kyc.reviewedAt ? ` · reviewed ${shortDate(kyc.reviewedAt)}` : ''}
            </Text>
          </AdminCard>

          {/* Identity */}
          <AdminCard>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Identity</Text>
            <DetailRow label="Legal name" value={kyc.legalName} />
            <DetailRow label={kyc.idType} value={kyc.idNumber} />
            <DetailRow label="Country" value={kyc.country} />
            <DetailRow label="Address" value={kyc.address} />
            {kyc.taxId ? <DetailRow label="Tax ID" value={kyc.taxId} /> : null}
          </AdminCard>

          {/* Payout */}
          <AdminCard>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Payout destination</Text>
            {kyc.momoNumber ? <DetailRow label="Mobile money" value={kyc.momoNumber} /> : null}
            {kyc.trxAddress ? <DetailRow label="TRX address" value={kyc.trxAddress} /> : null}
            {!kyc.momoNumber && !kyc.trxAddress ? (
              <Text style={[styles.muted, { color: theme.textSecondary }]}>None on file.</Text>
            ) : null}
          </AdminCard>

          {kyc.rejectionReason ? (
            <View style={[styles.rejected, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
              <Text style={styles.rejectedLabel}>Rejected for</Text>
              <Text style={styles.rejectedText}>{kyc.rejectionReason}</Text>
            </View>
          ) : null}

          {actionError ? <AdminError message={apiErrorMessage(actionError)} /> : null}

          {/* Decision — only pending submissions can be ruled on */}
          {kyc.status === 'pending' ? (
            <AdminCard>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Decision</Text>

              {rejecting ? (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                    Reason for rejection
                  </Text>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={3}
                    editable={!busy}
                    placeholder="Explain what's wrong — the seller sees this."
                    placeholderTextColor={theme.textTertiary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                  />
                  <View style={styles.actions}>
                    <AdminButton
                      label="Cancel"
                      tone="secondary"
                      onPress={() => {
                        setRejecting(false);
                        setReason('');
                      }}
                      disabled={busy}
                      style={styles.action}
                    />
                    <AdminButton
                      label="Confirm rejection"
                      tone="danger"
                      icon={Ban}
                      loading={reject.isPending}
                      disabled={reason.trim().length < 3}
                      onPress={() =>
                        reject.mutate(
                          { id: kyc.id, reason: reason.trim() },
                          { onSuccess: () => router.back() },
                        )
                      }
                      style={styles.action}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.actions}>
                  <AdminButton
                    label="Reject"
                    tone="secondary"
                    icon={Ban}
                    onPress={() => setRejecting(true)}
                    disabled={busy}
                    style={styles.action}
                  />
                  <AdminButton
                    label="Approve"
                    tone="success"
                    icon={Check}
                    loading={approve.isPending}
                    onPress={() => approve.mutate({ id: kyc.id }, { onSuccess: () => router.back() })}
                    style={styles.action}
                  />
                </View>
              )}
            </AdminCard>
          ) : (
            <View style={[styles.done, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <ShieldCheck size={15} color={theme.textSecondary} />
              <Text style={[styles.doneText, { color: theme.textSecondary }]}>
                Already {kyc.status} — only pending submissions can be reviewed.
              </Text>
            </View>
          )}
        </>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 17, fontFamily: Fonts.display[700] },
  headBody: { flex: 1, gap: 2 },
  store: { fontSize: 15.5, fontFamily: Fonts.display[700] },
  handle: { fontSize: 12, fontFamily: Fonts.sans[400] },
  submitted: { fontSize: 11.5, fontFamily: Fonts.sans[400] },

  sectionTitle: { fontSize: 13, fontFamily: Fonts.display[700] },
  muted: { fontSize: 12.5, fontFamily: Fonts.sans[400] },

  rejected: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 3 },
  rejectedLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    color: '#991b1b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rejectedText: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[500], color: '#991b1b' },

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
    minHeight: 84,
    textAlignVertical: 'top',
  },

  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },

  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  doneText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.sans[500] },
});
