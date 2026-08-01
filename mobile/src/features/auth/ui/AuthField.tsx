import { useRef, type ComponentType, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEnsureVisible } from '@/features/shared/ui/KeyboardAwareScroll';

/**
 * One labelled input for the auth screens.
 *
 * Replaces the `inputClass` string the web app reuses across its auth forms
 * (`web/src/features/auth/ui/*.tsx`) — same look: uppercase mini-label, leading
 * icon, rounded bordered box, green border on focus, error line beneath.
 *
 * The whole box (and the label) is tappable, not just the text itself, so
 * tapping the icon or the padding raises the keyboard — what users expect from
 * a native app. Pass a `ref` to focus it from outside, which is how the screens
 * chain the keyboard's "next" key from one field to the following one.
 *
 * `rightSlot` is for trailing controls like the password eye toggle.
 * `headerRight` is for a link beside the label, e.g. "Forgot password?".
 */

type IconType = ComponentType<{ size?: number; color?: string }>;

export interface AuthFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: IconType;
  error?: string;
  rightSlot?: ReactNode;
  headerRight?: ReactNode;
  /** Focused state is owned by the parent so only one field highlights at a time. */
  focused?: boolean;
  /** React 19 takes `ref` as a normal prop — no forwardRef needed. */
  ref?: Ref<TextInput>;
}

export function AuthField({
  label,
  icon: Icon,
  error,
  rightSlot,
  headerRight,
  focused,
  ref,
  onFocus,
  ...inputProps
}: AuthFieldProps) {
  const theme = useTheme();
  // Local ref drives tap-to-focus; the forwarded `ref` is merged onto the same
  // element so a parent can still focus this field itself.
  const inputRef = useRef<TextInput>(null);
  // The outer row is what we measure — it includes the label, so the whole
  // field ends up visible rather than just the input box.
  const rowRef = useRef<View>(null);
  const ensureVisible = useEnsureVisible();

  const focusInput = () => inputRef.current?.focus();

  /**
   * Lift this field clear of the keyboard, then run the caller's onFocus.
   * The handler type is derived from TextInput's own props so it stays correct
   * across React Native versions instead of being hand-written.
   */
  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    ensureVisible(rowRef.current);
    onFocus?.(e);
  };

  const attachRef = (node: TextInput | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: TextInput | null }).current = node;
  };

  return (
    <View ref={rowRef} style={styles.field} collapsable={false}>
      <View style={styles.labelRow}>
        {/* Tapping the label focuses the field too, like a web <label for>. */}
        <Text
          style={[styles.label, { color: theme.textSecondary }]}
          onPress={focusInput}
          suppressHighlighting
        >
          {label}
        </Text>
        {headerRight}
      </View>

      {/* Pressable wrapper: taps on the icon or the empty padding focus the
          input and raise the keyboard. Taps landing on the input or on
          `rightSlot` are handled by those children instead. */}
      <Pressable
        onPress={focusInput}
        accessibilityRole="none"
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.inputBackground,
            borderColor: focused ? theme.inputFocusBorder : theme.inputBorder,
          },
        ]}
      >
        <Icon size={16} color={theme.textTertiary} />
        <TextInput
          ref={attachRef}
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.textTertiary}
          // Explicit, though it's the default — focusing must raise the keyboard.
          showSoftInputOnFocus
          onFocus={handleFocus}
          {...inputProps}
        />
        {rightSlot}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Web uses `space-y-1` (4px) between label, input and error.
  field: { gap: 4 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    // Web's `py-2.5` input is ~42px tall; 46 keeps a comfortable touch target
    // on a phone without looking loose.
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.sans[400],
    // Kills the blue focus outline react-native-web adds by default.
    outlineStyle: 'none',
  } as never,
  error: {
    fontSize: 11,
    fontFamily: Fonts.sans[600],
    color: '#e11d48',
  },
});
