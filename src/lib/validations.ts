import { z } from 'zod';

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .max(254, 'Email too long');

export const SubscribeSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().max(200).optional(),
});

export const ContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: EmailSchema,
  company: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000),
  budget: z
    .enum(['under_500', '500_2000', '2000_5000', '5000_plus', 'not_sure'])
    .optional(),
});

export const CheckoutSchema = z.object({
  productSlug: z.enum(['it-helpdesk-starter-kit']),
});

export const DeleteAccountSchema = z.object({
  confirm: z.literal('DELETE'),
});

export type SubscribeInput = z.infer<typeof SubscribeSchema>;
export type ContactInput = z.infer<typeof ContactSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
