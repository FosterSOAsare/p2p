import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';

import { Ban, CheckCircle2, Clock, Gavel } from '@/components/icons';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme, useTones } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useEnsureVisible } from '@/features/shared/ui/KeyboardAwareScroll';
import { useSubmitListingDispute, type ListingRemoval } from '../data/listingsApi';

/**
 * Shown on a seller's own removed listing — the phone version of
 * `web/src/features/seller/ui/ListingDisputePanel.tsx`.
 *
 * Same three states as the web: the takedown reason always; then either the
 * appeal form, the status of an appeal already filed, or a plain note that this
 * particular removal can't be disputed.
 *
 * The appeal is an argument, not a resubmission — a removed listing is frozen,
 * so the admin rules on exactly what they took down.
 *
 * The panel's rose surfaces come from `Tones`, so they invert with the scheme
 * rather than dropping a near-white card onto the dark app background.
 */
export function ListingDisputePanel({
  listingId,
  removal,
}: {
  listingId: string;
  removal: ListingRemoval;
}) {
  const theme = useTheme();
  const tones = useTones();
  const rose = tones.danger;
  const submit = useSubmitListingDispute();
  const ensureVisible = useEnsureVisible();
  const fieldRow = useRef<View>(null);
  const [explanation, setExplanation] = useState('');

  const dispute = removal.dispute;
  // The server's minimum. Checked here so the button is visibly unavailable
  // rather than failing after a round trip.
  const canSubmit = explanation.trim().length >= 10;

  return (
    <View style={[styles.panel, { backgroundColor: rose.surface, borderColor: rose.border }]}>
      <View style={styles.head}>
        <View style={[styles.headIcon, { backgroundColor: rose.chip }]}>
          <Ban size={18} color={rose.icon} />
        </View>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: theme.text }]}>Removed by an administrator</Text>
          <Text style={[styles.reason, { color: rose.text }]}>{removal.reasonText}</Text>
        </View>
      </View>

      {dispute ? (
        /* Already appealed — show where it stands. */
        <View
          style={[styles.statusBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={styles.statusRow}>
            {dispute.status === 'open' ? (
              <Clock size={14} color={tones.warning.icon} />
            ) : dispute.status === 'approved' ? (
              <CheckCircle2 size={14} color={tones.success.icon} />
            ) : (
              <Ban size={14} color={theme.textTertiary} />
            )}
            <Text style={[styles.statusText, { color: theme.text }]}>
              {dispute.status === 'open'
                ? 'Dispute under review'
                : dispute.status === 'approved'
                  ? 'Dispute approved'
                  : 'Dispute rejected'}
            </Text>
          </View>

          <Text style={[styles.explanation, { color: theme.textSecondary }]}>
            {dispute.explanation}
          </Text>

          {dispute.reviewNote ? (
            <View style={[styles.reviewNote, { borderTopColor: theme.border }]}>
              <Text style={[styles.explanation, { color: theme.textSecondary }]}>
                <Text style={{ fontFamily: Fonts.sans[700] }}>Reviewer: </Text>
                {dispute.reviewNote}
              </Text>
            </View>
          ) : null}
        </View>
      ) : removal.disputeAllowed ? (
        /* The appeal form. */
        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Why should this listing be reinstated?
          </Text>
          {/* The panel sits near the bottom of a long edit screen, so the
              keyboard opens straight over this box. `ListingEditScreen`
              already wraps everything in a KeyboardAwareScroll — this just
              asks it to lift the field. `collapsable={false}` keeps the View
              measurable on Android, where a layout-only View is optimised away
              and `measureInWindow` then reports nothing. */}
          <View ref={fieldRow} collapsable={false}>
          <TextInput
            value={explanation}
            onChangeText={setExplanation}
            onFocus={() => ensureVisible(fieldRow.current)}
            editable={!submit.isPending}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            placeholder="Explain why this listing follows the rules..."
            placeholderTextColor={theme.textTertiary}
            style={[
              styles.textarea,
              {
                color: theme.text,
                backgroundColor: theme.inputBackground,
                borderColor: theme.inputBorder,
                opacity: submit.isPending ? 0.5 : 1,
              },
            ]}
          />
          </View>

          {/* Counts up to the minimum, then stops nagging — without it a
              disabled button gives no clue what it's waiting for. */}
          {!canSubmit ? (
            <Text style={[styles.hint, { color: theme.textTertiary }]}>
              {explanation.trim().length}/10 characters minimum
            </Text>
          ) : null}

          {submit.isError ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: rose.chip, borderColor: rose.border },
              ]}
            >
              <Text style={[styles.errorText, { color: rose.text }]}>
                {apiErrorMessage(submit.error)}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => submit.mutate({ id: listingId, explanation: explanation.trim() })}
            disabled={submit.isPending || !canSubmit}
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: theme.primary,
                opacity: submit.isPending || !canSubmit ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {submit.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Gavel size={14} color="#ffffff" />
            )}
            <Text style={styles.submitText}>Submit dispute</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.explanation, { color: theme.textSecondary }]}>
          This removal can&apos;t be disputed.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },

  head: { flexDirection: 'row', gap: Spacing.three },
  headIcon: {
    height: 40,
    width: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1, gap: 2 },
  title: { fontSize: 13.5, fontFamily: Fonts.display[700] },
  reason: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },

  statusBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },
  explanation: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[400] },
  reviewNote: { borderTopWidth: 1, paddingTop: Spacing.two },

  form: { gap: Spacing.two },
  label: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    minHeight: 88,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,
  hint: { fontSize: 10.5, fontFamily: Fonts.sans[500] },

  errorBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  errorText: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[600] },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  submitText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
