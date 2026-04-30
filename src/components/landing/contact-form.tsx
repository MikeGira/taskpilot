'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2 } from 'lucide-react';

const BUDGETS = [
  { value: 'under_500', label: 'Under $500' },
  { value: '500_2000', label: '$500 to $2,000' },
  { value: '2000_5000', label: '$2,000 to $5,000' },
  { value: '5000_plus', label: '$5,000+' },
  { value: 'not_sure', label: 'Not sure yet' },
];

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '', budget: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', company: '', message: '', budget: '' });
      } else {
        setStatus('error');
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-white/12 bg-white/5 px-6 py-5 text-white">
        <CheckCircle2 className="h-6 w-6 shrink-0" />
        <div>
          <p className="font-semibold">Message received!</p>
          <p className="text-sm text-white/80 mt-0.5">I&apos;ll reply within one business day.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#9CA3AF]" htmlFor="name">Name *</label>
          <Input id="name" value={form.name} onChange={set('name')} required maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#9CA3AF]" htmlFor="email">Email *</label>
          <Input id="email" type="email" value={form.email} onChange={set('email')} required maxLength={254} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#9CA3AF]" htmlFor="company">Company</label>
          <Input id="company" value={form.company} onChange={set('company')} maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#9CA3AF]" htmlFor="budget">Budget</label>
          <select
            id="budget"
            value={form.budget}
            onChange={set('budget')}
            className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <option value="" className="bg-[#0D0D0D]">Select budget...</option>
            {BUDGETS.map((b) => (
              <option key={b.value} value={b.value} className="bg-[#0D0D0D]">{b.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#9CA3AF]" htmlFor="message">
          Describe what you want to automate *
        </label>
        <Textarea
          id="message"
          value={form.message}
          onChange={set('message')}
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder="E.g., I need to auto-disable accounts that haven't logged in for 90 days and notify the manager..."
        />
      </div>
      <p className="text-xs text-[#6B7280]">
        By submitting, you agree to our{' '}
        <a href="/privacy" className="text-[#6B7280] hover:text-[#9CA3AF] underline">privacy policy</a>.
      </p>
      {errorMsg && <p className="text-sm text-white">{errorMsg}</p>}
      <Button type="submit" disabled={status === 'loading'} size="lg" className="w-full">
        {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Message'}
      </Button>
    </form>
  );
}
