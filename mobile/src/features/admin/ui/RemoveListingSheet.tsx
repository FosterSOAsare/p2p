import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, X } from 'lucide-react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  REMOVAL_REASONS,
  useRemoveListing,
  type AdminListingRow,
  type RemovalReason,
} from '../data/adminListingsApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import { AdminButton, AdminError } from './AdminScaffold';

/**
 * Takedown confirmation — the phone version of the web's RemoveListingDialog.
 *
 * The reason is what the seller is told, so it's required. "Allow dispute" is
 * the admin's call per takedown: correctable listings can be appealed, severe
 * violations shouldn't be.
 */
export function RemoveListingSheet({
  listing,
  onClose,
}: {
  listing: AdminListingRow;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const remove = useRemoveListing();

  const [reason, setReason] = useState<RemovalReason | null>(null);
  const [note, setNote] = useState('');
  const [disputeAllowed, setDisputeAllowed] = useState(true);

  const needsNote = reason === 'other';
  const canSubmit = reason !== null && (!needsNote || note.trim().length >= 3);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Pressable style={styles.backdropTap} onPress={remove.isPending ? undefined : onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingBottom: insets.bottom + Spacing.four,
            },
          ]}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.head}>
            <View style={styles.headText}>
              <Text style={[styles.title, { color: theme.text }]}>Remove this listing?</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>
                “{listing.title}” leaves the marketplace and the seller is notified.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} disabled={remove.isPending}>
              <X size={19} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.label, { color: theme.textSecondary }]}>Reason for removal</Text>
            {REMOVAL_REASONS.map((opt) => {
              const active = reason === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setReason(opt.id)}
                  style={[
                    styles.option,
                    {
                      borderColor: active ? '#ef4444' : theme.border,
                      backgroundColor: active ? '#fee2e2' : 'transparent',
                    },
                  ]}
                >
                  <View style={[styles.radio, { borderColor: active ? '#ef4444' : theme.inputBorder }]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={[styles.optionLabel, { color: active ? '#991b1b' : theme.text }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}

            {needsNote ? (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Specify the reason</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={500}
                  editable={!remove.isPending}
                  placeholder="The seller will see this."
                  placeholderTextColor={theme.textTertiary}
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text },
                  ]}
                />
              </View>
            ) : null}

            <View style={[styles.toggle, { borderColor: theme.border }]}>
              <View style={styles.toggleText}>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Allow dispute</Text>
                <Text style={[styles.toggleHint, { color: theme.textSecondary }]}>
                  The seller can appeal. Turn off for severe violations.
                </Text>
              </View>
              <Switch
                value={disputeAllowed}
                onValueChange={setDisputeAllowed}
                disabled={remove.isPending}
                trackColor={{ true: theme.primary, false: theme.backgroundSelected }}
              />
            </View>

            {remove.isError ? <AdminError message={apiErrorMessage(remove.error)} /> : null}
          </ScrollView>

          <View style={styles.actions}>
            <AdminButton label="Cancel" tone="secondary" onPress={onClose} disabled={remove.isPending} style={styles.action} />
            <AdminButton
              label="Remove listing"
              tone="danger"
              icon={Trash2}
              loading={remove.isPending}
              disabled={!canSubmit}
              onPress={() =>
                reason &&
                remove.mutate(
                  {
                    id: listing.id,
                    reason,
                    disputeAllowed,
                    ...(needsNote ? { note: note.trim() } : {}),
                  },
                  { onSuccess: onClose },
                )
              }
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    maxHeight: '88%',
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
  },
  handleRow: { alignItems: 'center', paddingVertical: Spacing.two },
  handle: { width: 38, height: 4, borderRadius: Radius.full },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingBottom: Spacing.three },
  headText: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontFamily: Fonts.display[700] },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  scroll: { flexGrow: 0 },
  scrollBody: { gap: Spacing.two, paddingBottom: Spacing.three },

  label: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  optionLabel: { flex: 1, fontSize: 13, fontFamily: Fonts.sans[600] },

  field: { gap: 6, marginTop: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    minHeight: 76,
    textAlignVertical: 'top',
  },

  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginTop: Spacing.one,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  toggleHint: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[400] },

  actions: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.three },
  action: { flex: 1 },
});
