import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Loader2 } from 'lucide-react'
import { listingSchema, CONDITIONS, type ListingForm as ListingFormValues } from '../data/schemas'
import { useCategories } from '../../marketplace/data/marketplaceApi'
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

  const {
    register,
    handleSubmit,
    watch,
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

  const firstImage = watch('imagesText')?.split('\n').map((s) => s.trim()).filter(Boolean)[0]

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

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-images">
          Image URLs <span className="text-slate-400 normal-case">(one per line, up to 8)</span>
        </label>
        <div className="flex gap-3">
          <textarea
            id="listing-images"
            rows={5}
            {...register('imagesText')}
            placeholder={'https://images.unsplash.com/photo-...\nhttps://...'}
            className={`${inputClass} resize-y font-mono text-[11px] flex-1`}
          />
          {firstImage && (
            <img src={firstImage} alt="Cover preview" className="h-20 w-20 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0" />
          )}
        </div>
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
