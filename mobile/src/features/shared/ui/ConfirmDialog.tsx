import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { AlertTriangle } from '@/components/icons';
import { Pressable } from '@/components/ui/pressable';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme, useTones } from '@/hooks/use-theme';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What is about to happen, in plain words. */
  description?: string;
  /**
   * The consequence of confirming, called out separately from `description`.
   *
   * Split out because the two answer different questions — "what am I doing"
   * and "what will that do to me" — and the second is the one worth pausing
   * over. Rendered in a tinted panel so it reads as the warning rather than
   * more prose.
   */
  consequence?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = destructive styling (default), primary = brand styling */
  tone?: 'danger' | 'primary';
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for destructive, irreversible or financially significant
 * actions — the phone counterpart of `web/src/features/shared/ui/ConfirmDialog`.
 *
 * Same props and the same wording contract, so a given action reads the same on
 * both clients.
 *
 * Two behaviours matter more than the styling:
 *
 * - cancelling never runs the action. `onCancel` is the only thing wired to the
 *   backdrop and the hardware back button, and neither path can reach
 *   `onConfirm`.
 * - `isPending` disables both buttons. These dialogs sit in front of payouts and
 *   escrow releases, where a second tap on an unresponsive button is a second
 *   attempt at moving money.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  consequence,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const tones = useTones();
  const accent = tone === 'danger' ? tones.danger : tones.success;

  // While a confirmed action is in flight, dismissing would leave the caller
  // with a running mutation and no dialog explaining it — so it stays put.
  const dismiss = isPending ? undefined : onCancel;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      // Android hardware back — cancels, never confirms.
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Pressable
        onPress={dismiss}
        accessibilityLabel="Dismiss"
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
      >
        {/* Swallows taps so pressing the card itself doesn't dismiss it. */}
        <Pressable
          onPress={() => {}}
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={styles.head}>
            <View style={[styles.iconWrap, { backgroundColor: accent.chip }]}>
              <AlertTriangle size={20} color={accent.icon} />
            </View>
            <View style={styles.headText}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              {description ? (
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  {description}
                </Text>
              ) : null}
            </View>
          </View>

          {consequence ? (
            <View
              style={[
                styles.consequence,
                { backgroundColor: accent.surface, borderColor: accent.border },
              ]}
            >
              <Text style={[styles.consequenceText, { color: accent.text }]}>{consequence}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={isPending}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.btn,
                styles.cancelBtn,
                {
                  borderColor: theme.inputBorder,
                  backgroundColor: pressed ? theme.backgroundElement : 'transparent',
                  opacity: isPending ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: theme.textSecondary }]}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isPending}
              accessibilityRole="button"
              accessibilityState={{ disabled: isPending, busy: isPending }}
              style={({ pressed }) => [
                styles.btn,
                styles.confirmBtn,
                {
                  backgroundColor: tone === 'danger' ? accent.icon : theme.primary,
                  opacity: isPending ? 0.6 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {isPending ? <ActivityIndicator size="small" color="#ffffff" /> : null}
              <Text style={[styles.btnText, styles.confirmText]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    // Matches the web's `max-w-sm`; on a tablet the dialog stays a dialog
    // rather than stretching into a banner.
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    gap: Spacing.four,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1, gap: Spacing.one },
  title: { fontSize: 16, fontFamily: Fonts.display[700] },
  description: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  consequence: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  consequenceText: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[600] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  cancelBtn: { borderWidth: 1 },
  confirmBtn: {},
  btnText: { fontSize: 13, fontFamily: Fonts.sans[700] },
  confirmText: { color: '#ffffff' },
});
