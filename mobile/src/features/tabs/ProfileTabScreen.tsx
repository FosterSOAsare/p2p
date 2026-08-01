import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, CheckCircle2, Lock, User as UserIcon } from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useAuth } from '@/context/AuthContext';
import { KeyboardAwareScroll, useEnsureVisible } from '@/features/shared/ui/KeyboardAwareScroll';

/**
 * Profile tab — the phone version of `web/src/pages/UserSettings.tsx`.
 *
 * Same three sections behind the same section switch: Personal Information,
 * Security & Password, Escrow Notifications, plus the KYC status card the web
 * keeps in its sidebar. The web lays this out as sidebar + form column; a phone
 * stacks the switch above the active section.
 *
 * The mock AuthContext has no update call, so Save and the notification
 * toggles hold local state only — nothing persists yet.
 */

type SectionId = 'profile' | 'security' | 'notifications';

const SECTIONS: { id: SectionId; label: string; icon: typeof UserIcon }[] = [
  { id: 'profile', label: 'Personal', icon: UserIcon },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Alerts', icon: Bell },
];

/** Mirrors the web's KYC status pill copy. */
function kycPill(status: string) {
  switch (status) {
    case 'verified':
      return { label: 'Verified Seller', bg: '#dcfce7', text: '#166534' };
    case 'pending':
      return { label: 'Pending Review', bg: '#fef3c7', text: '#92400e' };
    case 'rejected':
      return { label: 'Rejected', bg: '#fee2e2', text: '#991b1b' };
    default:
      return { label: 'Not Verified', bg: '#e5e7eb', text: '#374151' };
  }
}

function kycNote(status: string) {
  if (status === 'verified') return 'Your identity is verified — marketplace selling is unlocked.';
  if (status === 'pending')
    return 'Your KYC submission is with our review team. You can buy and use escrow deals while you wait.';
  return 'Verify your identity to unlock marketplace selling. Buying and standalone escrow deals need no KYC.';
}

export function ProfileTabScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { user, logout } = useAuth();

  const ensureVisible = useEnsureVisible();
  // One wrapper node per field, so focus can scroll the right row into view.
  const fieldRefs = useRef<Record<string, View | null>>({});

  const [section, setSection] = useState<SectionId>('profile');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [emailShipmentUpdates, setEmailShipmentUpdates] = useState(true);
  const [smsReleaseAlerts, setSmsReleaseAlerts] = useState(false);
  const [saved, setSaved] = useState(false);

  const kyc = kycPill(user?.kycStatus ?? 'unverified');

  /**
   * One labelled input. Deliberately a function returning JSX rather than a
   * nested component — a component declared in here would be a new type every
   * render, so React would remount the input on each keystroke and the keyboard
   * would close.
   *
   * The wrapper is measured on focus so the scroll view can lift it clear of
   * the keyboard, the same way AuthField does on the auth forms.
   */
  const field = (
    key: string,
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    placeholder: string,
    extra?: { keyboardType?: 'email-address'; autoCapitalize?: 'none' },
  ) => (
    <View
      ref={(node) => {
        fieldRefs.current[key] = node;
      }}
      collapsable={false}
      style={styles.field}
    >
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => {
          onChangeText(v);
          setSaved(false);
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        autoCorrect={false}
        keyboardType={extra?.keyboardType}
        autoCapitalize={extra?.autoCapitalize}
        onFocus={() => ensureVisible(fieldRefs.current[key])}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.inputBackground,
            borderColor: theme.inputBorder,
          },
        ]}
      />
    </View>
  );

  const toggleRow = (label: string, value: boolean, onValueChange: (v: boolean) => void) => (
    <View
      style={[
        styles.toggleRow,
        { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
      ]}
    >
      <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor="#ffffff"
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAwareScroll
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + Spacing.four }]}
      >
        {/* Heading */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Account Settings</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Manage your personal details, KYC identity verification, and escrow notification
            preferences.
          </Text>
        </View>

        {/* Identity card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.identityRow}>
            {user?.avatarUrl ? (
              <Image source={user.avatarUrl} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarLetter}>{(user?.fullName ?? 'U').charAt(0)}</Text>
              </View>
            )}
            <View style={styles.identityText}>
              <Text style={[styles.identityName, { color: theme.text }]} numberOfLines={1}>
                {user?.fullName ?? 'User'}
              </Text>
              <Text style={[styles.identityHandle, { color: theme.textSecondary }]} numberOfLines={1}>
                @{user?.username ?? 'user'}
              </Text>
            </View>
          </View>

          <View style={[styles.kycBox, { borderTopColor: theme.border }]}>
            <Text style={[styles.kycTitle, { color: theme.textSecondary }]}>
              KYC Verification Status
            </Text>
            <View style={[styles.kycPill, { backgroundColor: kyc.bg }]}>
              {user?.kycStatus === 'verified' ? <CheckCircle2 size={12} color={kyc.text} /> : null}
              <Text style={[styles.kycPillText, { color: kyc.text }]}>{kyc.label}</Text>
            </View>
            <Text style={[styles.kycNote, { color: theme.textTertiary }]}>
              {kycNote(user?.kycStatus ?? 'unverified')}
            </Text>
            {user?.kycStatus !== 'verified' ? (
              <Pressable
                onPress={() => router.push('/vendor/kyc')}
                style={({ pressed }) => [
                  styles.kycBtn,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.kycBtnText}>Verify My Identity</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Section switch — the web's sidebar nav */}
        <View style={styles.sectionSwitch}>
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const on = section === id;
            return (
              <Pressable
                key={id}
                onPress={() => setSection(id)}
                style={[
                  styles.sectionChip,
                  {
                    backgroundColor: on ? theme.primary : theme.backgroundElement,
                    borderColor: on ? theme.primary : theme.border,
                  },
                ]}
              >
                <Icon size={14} color={on ? '#ffffff' : theme.textSecondary} />
                <Text
                  style={[styles.sectionChipText, { color: on ? '#ffffff' : theme.textSecondary }]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Active section */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {section === 'profile' ? (
            <>
              <Text style={[styles.cardTitle, { color: theme.text, borderBottomColor: theme.border }]}>
                Personal Information
              </Text>
              {field('fullName', 'Full Name', fullName, setFullName, 'Kofi Mensah')}
              {field('username', 'Username', username, setUsername, 'kofi_buyer', {
                autoCapitalize: 'none',
              })}
              {field('email', 'Email Address', email, setEmail, 'you@example.com', {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
              })}
              {field('phone', 'Phone', phone, setPhone, '+233 24 000 0000')}

              {saved ? (
                <View style={styles.savedNote}>
                  <CheckCircle2 size={14} color="#166534" />
                  <Text style={styles.savedNoteText}>
                    Saved on this device — not sent to the server yet.
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => setSaved(true)}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.primaryBtnText}>Save Changes</Text>
              </Pressable>
            </>
          ) : section === 'security' ? (
            <>
              <Text style={[styles.cardTitle, { color: theme.text, borderBottomColor: theme.border }]}>
                Security &amp; Password Management
              </Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                To update your account password, tap below to launch the secure password change flow.
              </Text>
              <Pressable
                onPress={() => router.push('/change-password')}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.text, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Lock size={15} color={theme.background} />
                <Text style={[styles.primaryBtnText, { color: theme.background }]}>
                  Change Account Password
                </Text>
              </Pressable>
              <Pressable
                onPress={logout}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.logoutText}>Log Out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: theme.text, borderBottomColor: theme.border }]}>
                Escrow Notification Preferences
              </Text>
              {toggleRow(
                'Receive Email on order shipment & tracking update',
                emailShipmentUpdates,
                setEmailShipmentUpdates,
              )}
              {toggleRow('Receive SMS when escrow funds are released', smsReleaseAlerts, setSmsReleaseAlerts)}
            </>
          )}
        </View>

      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },

  header: { borderBottomWidth: 1, paddingBottom: Spacing.three, gap: 4 },
  // Heading uses the web's `font-display`.
  title: { fontSize: 20, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  cardTitle: { fontSize: 13, fontFamily: Fonts.display[700], borderBottomWidth: 1, paddingBottom: Spacing.two },
  body: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { height: 56, width: 56, borderRadius: Radius.md },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 17, fontFamily: Fonts.sans[700], color: '#ffffff' },
  identityText: { flex: 1, gap: 2 },
  identityName: { fontSize: 15, fontFamily: Fonts.display[700] },
  identityHandle: { fontSize: 12, fontFamily: Fonts.sans[500] },

  kycBox: { borderTopWidth: 1, paddingTop: Spacing.three, gap: 6 },
  kycTitle: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kycPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  kycPillText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },
  kycNote: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[400] },
  kycBtn: {
    alignSelf: 'flex-start',
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    marginTop: 2,
  },
  kycBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  sectionSwitch: { flexDirection: 'row', gap: Spacing.two },
  sectionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  sectionChipText: { fontSize: 12, fontFamily: Fonts.sans[700] },

  field: { gap: 5 },
  label: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  toggleLabel: { flex: 1, fontSize: 12.5, lineHeight: 17, fontFamily: Fonts.sans[500] },

  savedNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedNoteText: { fontSize: 11.5, fontFamily: Fonts.sans[600], color: '#166534' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 46,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },
  logoutBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  logoutText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#e11d48' },
});
