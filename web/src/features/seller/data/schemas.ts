import { z } from 'zod'

export const ID_TYPES = ['Passport', 'National ID', 'Drivers License'] as const

export const kycSchema = z
  .object({
    legalName: z.string().trim().min(2, 'Enter your legal name').max(100),
    storeName: z.string().trim().min(2, 'Enter your store name').max(100),
    taxId: z.string().trim().max(50).or(z.literal('')),
    country: z.string().min(2, 'Select your country'),
    address: z.string().trim().min(5, 'Enter your business address').max(200),
    idType: z.enum(ID_TYPES),
    idNumber: z.string().trim().min(4, 'Enter your document number').max(50),
    momoNumber: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{9,15}$/, 'Enter a valid mobile money number')
      .or(z.literal('')),
    trxAddress: z
      .string()
      .trim()
      .regex(/^T[1-9A-HJ-NP-Za-km-z]{33}$/, 'Enter a valid TRX address (starts with T)')
      .or(z.literal('')),
  })
  .refine((d) => d.momoNumber !== '' || d.trxAddress !== '', {
    message: 'Provide at least one payout account (mobile money or TRX address)',
    path: ['momoNumber'],
  })

export type KycForm = z.infer<typeof kycSchema>

// ---------- Listing create/edit ----------

export const CONDITIONS = ['Brand New', 'Like New', 'Good', 'Fair'] as const

export const listingSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().trim().max(4000).or(z.literal('')),
  price: z.coerce.number().positive('Enter a valid GH₵ price').max(10_000_000),
  category: z.string().min(1, 'Pick a category'),
  condition: z.enum(CONDITIONS),
  quantity: z.coerce.number().int('Whole numbers only').min(1, 'At least 1 unit').max(10_000),
  imagesText: z
    .string()
    .trim()
    .refine(
      (v) =>
        v === '' ||
        v
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .every((s) => /^https?:\/\/.+/.test(s)),
      'Each line must be a valid image URL (https://...)',
    )
    .refine((v) => v.split('\n').filter((s) => s.trim()).length <= 8, 'Maximum 8 images'),
  location: z.string().trim().max(120).or(z.literal('')),
  status: z.enum(['draft', 'active', 'out_of_stock']),
})

export type ListingForm = z.infer<typeof listingSchema>

export function imagesFromText(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

