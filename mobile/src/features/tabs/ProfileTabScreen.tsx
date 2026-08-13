import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  User as UserIcon,
  XCircle,
} from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePersona } from '@/hooks/use-persona';
import { useAuth } from '@/context/AuthContext';
import { KeyboardAwareScroll, useEnsureVisible } from '@/features/shared/ui/KeyboardAwareScroll';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useUpdateMe, useUpdateNotificationPrefs } from '@/features/user/data/usersApi';
import { toPickedAsset, useUploadFile } from '@/features/upload/data/uploadApi';

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

/** How each persona presents on the identity card. */
const PERSONA_BADGE = {
  buyer: { label: 'Buyer', icon: ShoppingBag, bg: '#dbeafe', text: '#1e40af' },
  seller: { label: 'Verified Seller', icon: Store, bg: '#dcfce7', text: '#166534' },
  admin: { label: 'Administrator', icon: ShieldAlert, bg: '#ffe4e6', text: '#be123c' },
} as const;

const SECTIONS: { id: SectionId; label: string; icon: typeof UserIcon }[] = [
  { id: 'profile', label: 'Personal', icon: UserIcon },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Alerts', icon: Bell },
];

/** Pill label, icon and tones per KYC state — same set as the web's card. */
function kycPill(status: string) {
  switch (status) {
    case 'verified':
      return { label: 'Verified Seller', icon: CheckCircle2, bg: '#dcfce7', text: '#166534' };
    case 'pending':
      return { label: 'Under Review', icon: Clock, bg: '#fef3c7', text: '#92400e' };
    case 'rejected':
      return { label: 'Rejected', icon: XCircle, bg: '#fee2e2', text: '#991b1b' };
    default:
      return { label: 'Not Verified', icon: null, bg: '#e5e7eb', text: '#374151' };
  }
}

/** The web's explanatory line for each state, kept verbatim. */
function kycNote(status: string) {
  switch (status) {
    case 'verified':
      return 'Your identity is verified. You can create marketplace listings and receive payouts.';
    case 'pending':
      return 'Your KYC submission is with our review team. You can buy and use escrow deals while you wait.';
    case 'rejected':
      return 'Your submission was rejected. Review the reason and resubmit from the seller verification page.';
    default:
      return 'Verify your identity to unlock marketplace selling. Buying and standalone escrow deals need no KYC.';
  }
}

export function ProfileTabScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();

  const ensureVisible = useEnsureVisible();
  // One wrapper node per field, so focus can scroll the right row into view.
  const fieldRefs = useRef<Record<string, View | null>>({});

  const [section, setSection] = useState<SectionId>('profile');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [emailShipmentUpdates, setEmailShipmentUpdates] = useState(true);
  const [smsReleaseAlerts, setSmsReleaseAlerts] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateMe = useUpdateMe();
  const updatePrefs = useUpdateNotificationPrefs();
  const uploadFile = useUploadFile();
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * Sends only what the server accepts: `fullName` and `phone`. Username and
   * email aren't in `updateMe`'s schema — the server refuses to change them —
   * so editing those fields here would look like it worked and quietly do
   * nothing. The avatar is left out too: it needs an uploaded URL, and the
   * picker only gives an on-device path.
   */
  const saveProfile = async () => {
    setSaveError(null);
    try {
      await updateMe.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(apiErrorMessage(err));
    }
  };

  /** Both flags go on every write — the endpoint is a PUT and requires both. */
  const savePrefs = (next: Partial<{ email: boolean; sms: boolean }>) => {
    const email = next.email ?? emailShipmentUpdates;
    const sms = next.sms ?? smsReleaseAlerts;
    setEmailShipmentUpdates(email);
    setSmsReleaseAlerts(sms);
    updatePrefs.mutate(
      { emailShipmentUpdates: email, smsReleaseAlerts: sms },
      { onError: (err) => setSaveError(apiErrorMessage(err)) },
    );
  };

  const kyc = kycPill(user?.kycStatus ?? 'unverified');
  const persona = PERSONA_BADGE[usePersona()];

  /**
   * Opens the gallery, uploads the photo, then saves the returned URL.
   *
   * Both steps happen here rather than waiting for Save Changes: the avatar is
   * the one field where you expect the new picture to stick as soon as you pick
   * it, and `PATCH /api/users/me` only accepts a URL — so the upload has to
   * come first either way.
   */
  const pickAvatar = async () => {
    setPhotoError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError('Photo access is off. Enable it for Expo Go in system settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      try {
        const uploaded = await uploadFile.mutateAsync(toPickedAsset(result.assets[0].uri));
        await updateMe.mutateAsync({ avatarUrl: uploaded.url });
        // Show the hosted image, not the device path — so what's on screen is
        // what everyone else will see.
        setAvatarUri(uploaded.url);
        setSaved(true);
      } catch (err) {
        setPhotoError(apiErrorMessage(err));
      }
    } catch {
      setPhotoError("Couldn't open the gallery on this device.");
    }
  };

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
      {/* Pushed over the tab bar rather than sitting inside it, so it needs no
          tab-bar clearance — just breathing room at the bottom. */}
      <KeyboardAwareScroll
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.eight }]}
      >
        {/* Back — this screen is pushed from the home app bar's avatar, not a
            tab any more, so it needs its own way out. `canGoBack` guards the
            case where it was opened directly from a link with no history. */}
        {/* Back and Log Out share one row — the two ways off this screen, so
            they sit at the same level rather than Log Out hiding down on the
            title line. */}
        <View style={styles.topRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [
              styles.backRow,
              {
                backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <ArrowLeft size={20} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
          </Pressable>

          <Pressable
            onPress={logout}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Log out"
            style={({ pressed }) => [
              styles.logoutBtn,
              { backgroundColor: pressed ? '#fee2e2' : '#fef2f2' },
            ]}
          >
            <LogOut size={16} color="#e11d48" />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>

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
            {/* Reflects a freshly picked photo, not just the stored one */}
            {avatarUri ? (
              <Image source={avatarUri} style={styles.avatar} contentFit="cover" />
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

              {/* Which face of the app this account gets — the same persona the
                  Home tab branches on, so it's never a guess who you're in as. */}
              <View style={[styles.personaPill, { backgroundColor: persona.bg }]}>
                <persona.icon size={11} color={persona.text} />
                <Text style={[styles.personaText, { color: persona.text }]}>{persona.label}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.kycBox, { borderTopColor: theme.border }]}>
            <View style={styles.kycTitleRow}>
              <ShieldCheck size={16} color={theme.primary} />
              <Text style={[styles.kycTitle, { color: theme.text }]}>KYC Verification Status</Text>
            </View>

            <View style={[styles.kycPill, { backgroundColor: kyc.bg }]}>
              {kyc.icon ? <kyc.icon size={13} color={kyc.text} /> : null}
              <Text style={[styles.kycPillText, { color: kyc.text }]}>{kyc.label}</Text>
            </View>

            <Text style={[styles.kycNote, { color: theme.textTertiary }]}>
              {kycNote(user?.kycStatus ?? 'unverified')}
            </Text>

            {/* The web only offers this while there's something to do — hidden
                once verified, and while a submission is under review. */}
            {user?.kycStatus !== 'verified' && user?.kycStatus !== 'pending' ? (
              <Pressable onPress={() => router.push('/sell')} hitSlop={6}>
                <Text style={[styles.kycLink, { color: theme.primary }]}>
                  Start seller verification →
                </Text>
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

              {/* Profile photo — mirrors the web's avatar block */}
              <View style={styles.photoRow}>
                {avatarUri ? (
                  <Image source={avatarUri} style={styles.photo} contentFit="cover" />
                ) : (
                  <View style={[styles.photo, styles.photoFallback, { backgroundColor: theme.primary }]}>
                    <Text style={styles.photoLetter}>
                      {(user?.username ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.photoActions}>
                  <View style={styles.photoButtons}>
                    <Pressable
                      onPress={pickAvatar}
                      style={({ pressed }) => [
                        styles.photoBtn,
                        {
                          borderColor: theme.inputBorder,
                          backgroundColor: pressed ? theme.backgroundSelected : theme.inputBackground,
                        },
                      ]}
                    >
                      <Camera size={14} color={theme.text} />
                      <Text style={[styles.photoBtnText, { color: theme.text }]}>
                        {avatarUri ? 'Change photo' : 'Upload photo'}
                      </Text>
                    </Pressable>

                    {avatarUri ? (
                      <Pressable
                        onPress={() => {
                          setAvatarUri(null);
                          setSaved(false);
                        }}
                        style={styles.removeBtn}
                      >
                        <Trash2 size={14} color="#e11d48" />
                        <Text style={styles.removeText}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <Text style={[styles.photoHint, { color: theme.textTertiary }]}>
                    JPG or PNG, up to 10MB. Shown on your profile, listings, and deals.
                  </Text>
                  {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
                </View>
              </View>

              {field('fullName', 'Full Name', fullName, setFullName, 'Kofi Mensah')}
              {field('username', 'Username', username, setUsername, 'kofi_buyer', {
                autoCapitalize: 'none',
              })}
              {field('email', 'Email Address', email, setEmail, 'you@example.com', {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
              })}
              {field('phone', 'Phone', phone, setPhone, '+233 24 000 0000')}

              {saveError ? (
                <View
                  style={[styles.savedNote, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
                >
                  <Text style={[styles.savedNoteText, { color: '#b91c1c' }]}>{saveError}</Text>
                </View>
              ) : null}

              {saved ? (
                <View style={styles.savedNote}>
                  <CheckCircle2 size={14} color="#166534" />
                  <Text style={styles.savedNoteText}>Saved.</Text>
                </View>
              ) : null}

              <Pressable
                onPress={saveProfile}
                disabled={updateMe.isPending}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: updateMe.isPending ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {updateMe.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
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
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: theme.text, borderBottomColor: theme.border }]}>
                Escrow Notification Preferences
              </Text>
              {/* Each toggle saves immediately, as the web's does — there's no
                  separate Save for this section. */}
              {toggleRow(
                'Receive Email on order shipment & tracking update',
                emailShipmentUpdates,
                (v) => savePrefs({ email: v }),
              )}
              {toggleRow('Receive SMS when escrow funds are released', smsReleaseAlerts, (v) =>
                savePrefs({ sms: v }),
              )}
            </>
          )}
        </View>

        <Text style={[styles.signedInAs, { color: theme.textTertiary }]}>
          Signed in as @{user?.username ?? 'user'}
        </Text>
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

  // Back on the left, Log Out pushed to the right edge, vertically centred.
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 44,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  backText: { fontSize: 13, fontFamily: Fonts.sans[700] },

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
  personaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 5,
  },
  personaText: { fontSize: 10, fontFamily: Fonts.sans[700] },

  kycBox: { borderTopWidth: 1, paddingTop: Spacing.three, gap: 6 },
  kycTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kycTitle: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  kycLink: { fontSize: 11.5, fontFamily: Fonts.sans[700], marginTop: 2 },
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

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  photo: { height: 76, width: 76, borderRadius: Radius.lg },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  photoLetter: { fontSize: 26, fontFamily: Fonts.sans[700], color: '#ffffff' },
  photoActions: { flex: 1, gap: 6 },
  photoButtons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  photoBtnText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  removeText: { fontSize: 11.5, fontFamily: Fonts.sans[700], color: '#e11d48' },
  photoHint: { fontSize: 10.5, lineHeight: 14, fontFamily: Fonts.sans[400] },
  photoError: { fontSize: 10.5, lineHeight: 14, fontFamily: Fonts.sans[600], color: '#b91c1c' },

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
  /**
   * Same 44 height and pill radius as `backRow`, so the two read as one row of
   * controls rather than two unrelated buttons that happen to be side by side.
   */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.full,
  },
  logoutText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#e11d48' },
  signedInAs: {
    fontSize: 11,
    fontFamily: Fonts.sans[500],
    textAlign: 'center',
    marginTop: -Spacing.one,
  },
});
