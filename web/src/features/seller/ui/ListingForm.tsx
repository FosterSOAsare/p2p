import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Loader2, Upload, X } from 'lucide-react'
import { listingSchema, CONDITIONS, type ListingForm as ListingFormValues } from '../data/schemas'
import { useCategories } from '../../marketplace/data/marketplaceApi'
import { useUploadMultipleFiles } from '../../upload/data/uploadApi'
import { apiErrorMessage } from '../../shared/libs/api'

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none'

const selectClass = `${inputClass} cursor-pointer`

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{message}</p>
}

interface ListingFormProps {
  defaultValues?: Partial<ListingFormValues>
  submitLabel: string
  pendingLabel: string
  isPending: boolean
  error?: unknown
  onSubmit: (values: ListingFormValues) => void
  showStatus?: boolean
}

export function ListingForm({ defaultValues, submitLabel, pendingLabel, isPending, error, onSubmit, showStatus = true }: ListingFormProps) {
  const categoriesQuery = useCategories()
  const uploadMultiple = useUploadMultipleFiles()
  const [uploadError, setUploadError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      condition: 'Brand New',
      quantity: 1,
      status: 'active',
      description: '',
      imagesText: '',
      location: '',
      ...defaultValues,
    },
  })

  const currentImagesText = watch('imagesText') || ''
  const imageUrlsList = currentImagesText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    uploadMultiple.mutate(files, {
      onSuccess: (uploadedFiles) => {
        const newUrls = uploadedFiles.map((f) => f.url)
        const combined = [...imageUrlsList, ...newUrls].join('\n')
        setValue('imagesText', combined, { shouldValidate: true })
      },
      onError: (err) => {
        setUploadError(apiErrorMessage(err))
      },
    })
  }

  const removeImage = (indexToRemove: number) => {
    const updated = imageUrlsList.filter((_, idx) => idx !== indexToRemove).join('\n')
    setValue('imagesText', updated, { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {error != null && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(error)}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-title">
          Title
        </label>
        <input id="listing-title" type="text" {...register('title')} placeholder="Apple MacBook Pro M3 (16-inch)..." className={inputClass} />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-desc">
          Description
        </label>
        <textarea
          id="listing-desc"
          rows={7}
          {...register('description')}
          placeholder="Condition details, what's included, warranty, delivery notes..."
          className={`${inputClass} resize-y`}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-price">
            Price (GH₵)
          </label>
          <input id="listing-price" type="number" step="0.01" min={0} {...register('price', { valueAsNumber: true })} className={inputClass} />
          <FieldError message={errors.price?.message} />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-qty">
            Quantity
          </label>
          <input id="listing-qty" type="number" min={1} {...register('quantity', { valueAsNumber: true })} className={inputClass} />
          <FieldError message={errors.quantity?.message} />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-condition">
            Condition
          </label>
          <select id="listing-condition" {...register('condition')} className={selectClass}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError message={errors.condition?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-category">
            Category
          </label>
          <select id="listing-category" {...register('category')} className={selectClass}>
            <option value="">Select a category...</option>
            {(categoriesQuery.data?.categories ?? []).map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <FieldError message={errors.category?.message} />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-location">
            Location <span className="text-slate-400 normal-case">(optional)</span>
          </label>
          <input id="listing-location" type="text" {...register('location')} placeholder="Accra • Ships nationwide" className={inputClass} />
          <FieldError message={errors.location?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-images">
            Product Photos & Image URLs
          </label>

          {/* Cloudinary File Upload Button */}
          <label className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-all cursor-pointer">
            {uploadMultiple.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {uploadMultiple.isPending ? 'Uploading to Cloudinary...' : 'Upload Photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploadMultiple.isPending}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {uploadError && (
          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{uploadError}</p>
        )}

        <div className="flex gap-3">
          <textarea
            id="listing-images"
            rows={4}
            {...register('imagesText')}
            placeholder={'https://res.cloudinary.com/...\nhttps://images.unsplash.com/...'}
            className={`${inputClass} resize-y font-mono text-[11px] flex-1`}
          />
        </div>

        {/* Thumbnail Previews */}
        {imageUrlsList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {imageUrlsList.map((url, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={url}
                  alt={`Preview ${idx + 1}`}
                  className="h-16 w-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-all"
                  title="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <FieldError message={errors.imagesText?.message} />
      </div>

      {showStatus && (
        <div className="space-y-1 sm:max-w-[200px]">
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-status">
            Status
          </label>
          <select id="listing-status" {...register('status')} className={selectClass}>
            <option value="active">Active (visible)</option>
            <option value="draft">Draft (hidden)</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <FieldError message={errors.status?.message} />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-primary-700 transition-all cursor-pointer shadow-md disabled:opacity-50"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {isPending ? pendingLabel : submitLabel}
      </button>
    </form>
  )
}
