import { describe, it, expect } from 'vitest';
import {
  EmailSchema,
  SubscribeSchema,
  ContactSchema,
  CheckoutSchema,
  DeleteAccountSchema,
} from '@/lib/validations';

describe('EmailSchema', () => {
  it('trims and lowercases', () => {
    expect(EmailSchema.parse('  User@Example.COM ')).toBe('user@example.com');
  });

  it.each(['nope', '@example.com', 'a@', 'a b@example.com', ''])('rejects %j', (bad) => {
    expect(EmailSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects emails over 254 chars', () => {
    expect(EmailSchema.safeParse(`${'a'.repeat(250)}@example.com`).success).toBe(false);
  });
});

describe('SubscribeSchema', () => {
  it('accepts an email with an optional name', () => {
    expect(SubscribeSchema.parse({ email: 'a@b.com', name: ' Mike ' })).toEqual({
      email: 'a@b.com',
      name: 'Mike',
    });
  });

  it('accepts an email alone', () => {
    expect(SubscribeSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('rejects an over-long name', () => {
    expect(SubscribeSchema.safeParse({ email: 'a@b.com', name: 'x'.repeat(201) }).success).toBe(false);
  });
});

describe('ContactSchema', () => {
  const valid = {
    name: 'Mike',
    email: 'a@b.com',
    message: 'This is a long enough message.',
  };

  it('accepts a valid submission', () => {
    expect(ContactSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a message of at least 10 characters', () => {
    expect(ContactSchema.safeParse({ ...valid, message: 'short' }).success).toBe(false);
  });

  it('caps the message at 5000 characters', () => {
    expect(ContactSchema.safeParse({ ...valid, message: 'x'.repeat(5001) }).success).toBe(false);
  });

  it('requires a non-empty name', () => {
    expect(ContactSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('accepts only the known budget values', () => {
    expect(ContactSchema.safeParse({ ...valid, budget: '500_2000' }).success).toBe(true);
    expect(ContactSchema.safeParse({ ...valid, budget: 'a_lot' }).success).toBe(false);
  });
});

describe('CheckoutSchema', () => {
  it('accepts the known product slug', () => {
    expect(CheckoutSchema.safeParse({ productSlug: 'it-helpdesk-starter-kit' }).success).toBe(true);
  });

  // The enum is what stops a caller from checking out an arbitrary slug.
  it('rejects any other slug', () => {
    expect(CheckoutSchema.safeParse({ productSlug: 'free-stuff' }).success).toBe(false);
    expect(CheckoutSchema.safeParse({ productSlug: '' }).success).toBe(false);
  });
});

describe('DeleteAccountSchema', () => {
  it('requires the exact DELETE confirmation string', () => {
    expect(DeleteAccountSchema.safeParse({ confirm: 'DELETE' }).success).toBe(true);
    for (const bad of ['delete', 'Delete', 'DELETE ', 'yes']) {
      expect(DeleteAccountSchema.safeParse({ confirm: bad }).success).toBe(false);
    }
  });
});
