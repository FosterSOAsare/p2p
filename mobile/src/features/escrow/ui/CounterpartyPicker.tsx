import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ShieldCheck, User, X } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCounterpartySearch, type CounterpartyMatch } from '@/features/user/data/usersApi';

/**
 * Who the other side of a deal is — suggest-as-you-type, the phone version of
 * `web/src/features/escrow/ui/CounterpartyPicker.tsx`.
 *
 * Three states, and they are not the same thing:
 *
 * - **empty** — valid. The deal is created one-sided and handed over with the
 *   share link on the deal page. Nothing here may treat this as an error.
 * - **picked** — a confirmed account, shown as a chip. Only this is ever sent.
 * - **typed but unconfirmed** — invalid, and the reason this exists. Free text
 *   used to go straight to the server, which refused it after a round trip with
 *   the form already gone.
 *
 * No dropdown overlay: a floating list inside a scrolling form fights the
 * keyboard on a phone. The matches render inline underneath instead, which
 * pushes the rest of the form down and is always reachable.
 */

interface CounterpartyPickerProps {
  value: CounterpartyMatch | null;
  onChange: (value: CounterpartyMatch | null) => void;
  /** Raw text, lifted so the parent can block submit on an unconfirmed entry. */
  query: string;
  onQueryChange: (query: string) => void;
  disabled?: boolean;
  onFocus?: () => void;
}

export function CounterpartyPicker({
  value,
  onChange,
  query,
  onQueryChange,
  disabled,
  onFocus,
}: CounterpartyPickerProps) {
  const theme = useTheme();
  const search = useCounterpartySearch(query);
  const matches = search.data ?? [];
  const searching = query.replace(/^@/, '').trim().length >= 2;

  // A confirmed pick is a chip, not an editable field — editing in place would
  // silently drop the form back into the ambiguous unconfirmed state.
  if (value) {
    return (
      <View style={[styles.chip, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
          {value.avatarUrl ? (
            <Image source={{ uri: value.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <User size={14} color={theme.textTertiary} />
          )}
        </View>
        <View style={styles.chipBody}>
          <View style={styles.nameRow}>
            <Text style={[styles.username, { color: theme.text }]} numberOfLines={1}>
              @{value.username}
            </Text>
            {value.verified ? <ShieldCheck size={12} color={theme.primary} /> : null}
          </View>
          {value.storeName ? (
            <Text style={[styles.storeName, { color: theme.textSecondary }]} numberOfLines={1}>
              {value.storeName}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            onChange(null);
            onQueryChange('');
          }}
          disabled={disabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove @${value.username}`}
        >
          <X size={16} color={theme.textSecondary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
        ]}
      >
        <User size={16} color={theme.textTertiary} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          onFocus={onFocus}
          editable={!disabled}
          placeholder="Search a username, or leave blank"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text }]}
        />
        {search.isFetching ? <ActivityIndicator size="small" color={theme.textTertiary} /> : null}
      </View>

      {searching ? (
        <View style={[styles.results, { borderColor: theme.border, backgroundColor: theme.card }]}>
          {matches.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              {search.isFetching
                ? 'Searching…'
                : 'No matching account. Check the spelling, or leave it blank to invite by link.'}
            </Text>
          ) : (
            matches.map((m, i) => (
              <Pressable
                key={m.username}
                onPress={() => {
                  onChange(m);
                  onQueryChange(m.username);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.row,
                  i > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : null,
                  pressed ? { backgroundColor: theme.backgroundSelected } : null,
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
                  {m.avatarUrl ? (
                    <Image source={{ uri: m.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <User size={14} color={theme.textTertiary} />
                  )}
                </View>
                <View style={styles.chipBody}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.username, { color: theme.text }]} numberOfLines={1}>
                      @{m.username}
                    </Text>
                    {m.verified ? <ShieldCheck size={12} color={theme.primary} /> : null}
                  </View>
                  {m.storeName ? (
                    <Text style={[styles.storeName, { color: theme.textSecondary }]} numberOfLines={1}>
                      {m.storeName}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 46,
  },
  input: { flex: 1, fontSize: 13, fontFamily: Fonts.sans[400], outlineStyle: 'none' } as never,

  results: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  empty: { fontSize: 11.5, lineHeight: 17, fontFamily: Fonts.sans[400], padding: Spacing.three },

  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 46,
  },
  chipBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  username: { fontSize: 13, fontFamily: Fonts.sans[700] },
  storeName: { fontSize: 11, fontFamily: Fonts.sans[400] },

  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
});
