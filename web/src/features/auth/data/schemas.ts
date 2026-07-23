import { z } from 'zod'

/** Mirrors the server's reserved list (server/src/shared/constants/reserved-usernames.ts). */
export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'support',
  'help',
  'taas',
  'escrow',
  'payments',
  'api',
  'root',
  'system',
  'moderator',
  'arbitrator',
  'driver',
  'official',
  'security',
]

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'Username must be 3-20 chars: a-z, 0-9, underscore')
  .refine((u) => !RESERVED_USERNAMES.includes(u), 'This username is reserved')

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128)

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(100),
    username: usernameSchema,
    email: z.email('Enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
    agreed: z.boolean().refine((v) => v, 'You must agree to the Terms of Service and Escrow Rules'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type SignupForm = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or username'),
  password: z.string().min(1, 'Enter your password'),
  rememberMe: z.boolean(),
})

export type LoginForm = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
})

export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  })

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>
