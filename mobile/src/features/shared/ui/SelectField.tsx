import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A labelled field that opens its options in a bottom sheet — the native
 * stand-in for the web's `<select>`.
 *
 * Collapsed it reads like the text inputs beside it, so a long option list
 * doesn't take over the form the way a row of chips does.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  /** Optional muted note beside the label, e.g. "(optional)". */
  hint?: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  /** Sheet heading; defaults to the field label. */
  sheetTitle?: string;
}

export function SelectField({
  label,
  hint,
  value,
  options,
  onSelect,
  sheetTitle,
}: SelectFieldProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label}
        {hint ? <Text style={[styles.labelHint, { color: theme.textTertiary }]}> {hint}</Text> : null}
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'choose'}`}
        style={({ pressed }) => [
          styles.control,
          {
            backgroundColor: pressed ? theme.backgroundSelected : theme.inputBackground,
            borderColor: theme.inputBorder,
          },
        ]}
      >
        <Text
          style={[styles.value, { color: selected ? theme.text : theme.textTertiary }]}
          numberOfLines={1}
        >
          {selected?.label ?? 'Choose an option'}
        </Text>
        <ChevronDown size={18} color={theme.textTertiary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {/* Tapping the dimmed area closes, as a sheet should */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            // Swallows taps so pressing inside the sheet doesn't close it.
            onPress={() => {}}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                paddingBottom: insets.bottom + Spacing.three,
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: theme.border }]} />
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{sheetTitle ?? label}</Text>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const on = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: on
                          ? theme.primaryLight
                          : pressed
                            ? theme.backgroundSelected
                            : 'transparent',
                        borderColor: on ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: on ? theme.primary : theme.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {on ? <Check size={16} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 5 },
  label: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  labelHint: { fontFamily: Fonts.sans[400], textTransform: 'none', letterSpacing: 0 },

  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    height: 46,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  value: { flex: 1, fontSize: 13, fontFamily: Fonts.sans[500] },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    maxHeight: '70%',
  },
  grabber: { alignSelf: 'center', height: 4, width: 40, borderRadius: Radius.full },
  sheetTitle: { fontSize: 15, fontFamily: Fonts.display[700] },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.two,
  },
  optionText: { flex: 1, fontSize: 13, fontFamily: Fonts.sans[600] },
});
