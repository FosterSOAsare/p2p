import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ImagePlus, Loader2, Trash2 } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEnsureVisible } from '@/features/shared/ui/KeyboardAwareScroll';
import { SelectField } from '@/features/shared/ui/SelectField';
import { type ImageRef } from '@/constants/appTypes';
import { apiErrorMessage } from '@/features/shared/data/api';
import { toPickedAsset, useUploadFiles } from '@/features/upload/data/uploadApi';
import { useCategories } from '../data/listingsApi';

/**
 * Listing form — the phone version of
 * `web/src/features/seller/ui/ListingForm.tsx`.
 *
 * Shared by create and edit, exactly as the web shares it between
 * `ListingNew` and `ListingDetail`, so the two can't drift apart. Same fields,
 * labels and validation messages; the web's `<select>`s become `SelectField`
 * sheets, and its "paste image URLs" box becomes the device photo picker,
 * since typing a Cloudinary URL on a phone is not a real workflow.
 */

export const CONDITIONS = ['Brand New', 'Like New', 'Good', 'Fair'] as const;

export interface ListingFormValues {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: (typeof CONDITIONS)[number];
  quantity: string;
  location: string;
  /**
   * `ImageRef`, not `string`, because a listing being edited may carry bundled
   * mock assets (`require(...)` → number) alongside picked on-device URIs.
   * Newly picked photos are always strings.
   */
  images: ImageRef[];
  status: 'active' | 'draft' | 'out_of_stock';
}

export interface ListingFormProps {
  initial?: Partial<ListingFormValues>;
  submitLabel: string;
  pendingLabel: string;
  isPending?: boolean;
  /** The web hides Status on create — a new listing publishes as active. */
  showStatus?: boolean;
  onSubmit: (values: ListingFormValues) => void;
}

export function ListingForm({
  initial,
  submitLabel,
  pendingLabel,
  isPending = false,
  showStatus = false,
  onSubmit,
}: ListingFormProps) {
  const theme = useTheme();
  const ensureVisible = useEnsureVisible();
  const rows = useRef<Record<string, View | null>>({});

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>(
    initial?.condition ?? 'Brand New',
  );
  const [quantity, setQuantity] = useState(initial?.quantity ?? '1');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [images, setImages] = useState<ImageRef[]>(initial?.images ?? []);
  const [status, setStatus] = useState<ListingFormValues['status']>(initial?.status ?? 'active');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoError, setPhotoError] = useState<string | null>(null);
  const uploadFiles = useUploadFiles();
  const categoriesQuery = useCategories();

  /** The web's `listingSchema`, message for message. */
  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (title.trim().length < 3) next.title = 'Title must be at least 3 characters';
    const priceValue = Number.parseFloat(price);
    if (!Number.isFinite(priceValue) || priceValue <= 0) next.price = 'Enter a valid GH₵ price';
    if (!category) next.category = 'Pick a category';

    const qty = Number.parseInt(quantity, 10);
    if (!Number.isFinite(qty)) next.quantity = 'Enter a quantity';
    else if (qty < 1) next.quantity = 'At least 1 unit';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      price,
      category,
      condition,
      quantity,
      location: location.trim(),
      images,
      status,
    });
  };

  const addPhoto = async () => {
    setPhotoError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError('Photo access is off. Enable it for Expo Go in system settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.8,
      });
      if (result.canceled) return;

      /**
       * Upload immediately, and keep the returned URLs — not the device paths.
       *
       * The server stores a URL and rejects `file:///…`, so holding on to the
       * local path would mean the photo silently disappeared on save. Doing it
       * here rather than at submit also means the thumbnail you see is the
       * uploaded image, so a failed upload is obvious at once.
       */
      const assets = result.assets.slice(0, 6).map((a, i) => toPickedAsset(a.uri, i));
      try {
        const uploaded = await uploadFiles.mutateAsync(assets);
        setImages((prev) => [...prev, ...uploaded.map((u) => u.url)].slice(0, 6));
      } catch (err) {
        setPhotoError(apiErrorMessage(err));
      }
    } catch {
      setPhotoError("Couldn't open the gallery on this device.");
    }
  };

  const field = (
    key: string,
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    placeholder: string,
    extra?: { hint?: string; multiline?: boolean; keyboardType?: 'decimal-pad' | 'number-pad' },
  ) => (
    <View
      ref={(node) => {
        rows.current[key] = node;
      }}
      collapsable={false}
      style={styles.field}
    >
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label}
        {extra?.hint ? (
          <Text style={[styles.labelHint, { color: theme.textTertiary }]}> {extra.hint}</Text>
        ) : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={(v) => {
          onChangeText(v);
          setErrors((e) => ({ ...e, [key]: '' }));
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        multiline={extra?.multiline}
        keyboardType={extra?.keyboardType}
        textAlignVertical={extra?.multiline ? 'top' : 'center'}
        onFocus={() => ensureVisible(rows.current[key])}
        style={[
          styles.input,
          extra?.multiline ? styles.textarea : null,
          {
            color: theme.text,
            backgroundColor: theme.inputBackground,
            borderColor: errors[key] ? '#fca5a5' : theme.inputBorder,
          },
        ]}
      />
      {errors[key] ? <Text style={styles.error}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <View style={styles.form}>
      {field('title', 'Title', title, setTitle, 'Apple MacBook Pro M3 (16-inch)...')}

      {field(
        'description',
        'Description',
        description,
        setDescription,
        "Condition details, what's included, warranty, delivery notes...",
        { multiline: true },
      )}

      <View style={styles.row}>
        <View style={styles.rowItem}>
          {field('price', 'Price (GH₵)', price, setPrice, '0.00', {
            keyboardType: 'decimal-pad',
          })}
        </View>
        <View style={styles.rowItem}>
          {field('quantity', 'Quantity', quantity, setQuantity, '1', {
            keyboardType: 'number-pad',
          })}
        </View>
      </View>

      <SelectField
        label="Condition"
        value={condition}
        options={CONDITIONS.map((c) => ({ value: c, label: c }))}
        onSelect={(v) => setCondition(v as (typeof CONDITIONS)[number])}
        sheetTitle="Select condition"
      />

      <View>
        <SelectField
          label="Category"
          value={category}
          /* The server's own list, so a seller can only pick a category the
             server will accept on publish. */
          options={(categoriesQuery.data ?? []).map((c) => ({ value: c.name, label: c.name }))}
          onSelect={(v) => {
            setCategory(v);
            setErrors((e) => ({ ...e, category: '' }));
          }}
          sheetTitle="Select a category"
        />
        {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
      </View>

      {field('location', 'Location', location, setLocation, 'Accra • Ships nationwide', {
        hint: '(optional)',
      })}

      {/* Photos — the web pastes image URLs; a phone picks from the gallery. */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Product Photos</Text>

        <View style={styles.photoGrid}>
          {images.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.thumbWrap}>
              <Image source={uri} style={styles.thumb} contentFit="cover" />
              <Pressable
                onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                hitSlop={6}
                accessibilityLabel="Remove photo"
                style={styles.thumbRemove}
              >
                <Trash2 size={12} color="#ffffff" />
              </Pressable>
            </View>
          ))}

          {images.length < 6 ? (
            <Pressable
              onPress={addPhoto}
              disabled={uploadFiles.isPending}
              style={({ pressed }) => [
                styles.addPhoto,
                {
                  borderColor: theme.inputBorder,
                  backgroundColor: pressed ? theme.backgroundSelected : theme.inputBackground,
                },
              ]}
            >
              {uploadFiles.isPending ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <ImagePlus size={20} color={theme.textTertiary} />
              )}
              <Text style={[styles.addPhotoText, { color: theme.textTertiary }]}>
                {uploadFiles.isPending ? 'Uploading' : 'Add'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.labelHint, { color: theme.textTertiary }]}>
          First photo is the cover. Up to 6.
        </Text>
        {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
      </View>

      {showStatus ? (
        <SelectField
          label="Status"
          value={status}
          options={[
            { value: 'active', label: 'Active (visible)' },
            { value: 'draft', label: 'Draft (hidden)' },
            { value: 'out_of_stock', label: 'Out of Stock' },
          ]}
          onSelect={(v) => setStatus(v as ListingFormValues['status'])}
          sheetTitle="Listing status"
        />
      ) : null}

      <Pressable
        onPress={submit}
        disabled={isPending}
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: theme.primary, opacity: isPending ? 0.5 : pressed ? 0.85 : 1 },
        ]}
      >
        {isPending ? <Loader2 size={16} color="#ffffff" /> : null}
        <Text style={styles.submitText}>{isPending ? pendingLabel : submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },

  field: { gap: 5 },
  label: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  labelHint: { fontFamily: Fonts.sans[400], textTransform: 'none', letterSpacing: 0, fontSize: 10.5 },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 13.5,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,
  textarea: { height: 100, paddingTop: Spacing.three },
  error: { fontSize: 11, fontFamily: Fonts.sans[600], color: '#b91c1c' },

  row: { flexDirection: 'row', gap: Spacing.two },
  rowItem: { flex: 1 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumbWrap: { position: 'relative' },
  thumb: { height: 76, width: 76, borderRadius: Radius.md },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    height: 24,
    width: 24,
    borderRadius: Radius.full,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    height: 76,
    width: 76,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  addPhotoText: { fontSize: 10.5, fontFamily: Fonts.sans[600] },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  submitText: { flexShrink: 1, fontSize: 13.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
