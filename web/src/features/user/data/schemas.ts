import { z } from 'zod'

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{9,15}$/, 'Enter a valid phone number')
    .or(z.literal('')),
})

export type ProfileForm = z.infer<typeof profileSchema>
