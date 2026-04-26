import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata = { title: 'Privacy Policy' };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F1A]">
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <div className="prose prose-invert prose-sm max-w-none">
          <h1 className="text-3xl font-bold text-[#F9FAFB] mb-2">Privacy Policy</h1>
          <p className="text-[#6B7280] text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-CA')}</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">1. Data Controller</h2>
            <p className="text-[#9CA3AF] text-sm leading-relaxed">
              TaskPilot is operated by Michael Twagirayezu, Toronto, Ontario, Canada.
              Contact: <a href="mailto:privacy@taskpilot.dev" className="text-sky-400">privacy@taskpilot.dev</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">2. Data We Collect</h2>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Account data:</strong> Email address (required to log in and receive your purchase).</li>
              <li><strong className="text-[#F9FAFB]">Purchase data:</strong> Email, Stripe session ID, product purchased, amount paid, purchase date. We never store card numbers.</li>
              <li><strong className="text-[#F9FAFB]">Newsletter:</strong> Email address, subscription date, confirmation status.</li>
              <li><strong className="text-[#F9FAFB]">Contact requests:</strong> Name, email, company (optional), message, budget range (optional).</li>
              <li><strong className="text-[#F9FAFB]">Analytics:</strong> Page views via Vercel Analytics — cookie-free, no personal identifiers collected.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">3. Legal Basis (GDPR Article 6)</h2>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Contract performance:</strong> Processing your purchase and delivering your download.</li>
              <li><strong className="text-[#F9FAFB]">Legitimate interests:</strong> Fraud prevention, security monitoring.</li>
              <li><strong className="text-[#F9FAFB]">Consent:</strong> Newsletter subscription (you can withdraw at any time).</li>
              <li><strong className="text-[#F9FAFB]">Legal obligation:</strong> Retaining transaction records for 7 years (Canadian tax law).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">4. Data Retention</h2>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Purchase records:</strong> 7 years (anonymized — PII removed on account deletion, transaction amounts retained for tax compliance).</li>
              <li><strong className="text-[#F9FAFB]">Account / profile:</strong> Until you delete your account.</li>
              <li><strong className="text-[#F9FAFB]">Newsletter:</strong> Until you unsubscribe.</li>
              <li><strong className="text-[#F9FAFB]">Contact requests:</strong> 2 years.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">5. Third Parties</h2>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Supabase</strong> (Supabase Inc.) — database and authentication. <a href="https://supabase.com/privacy" className="text-sky-400">Privacy policy</a></li>
              <li><strong className="text-[#F9FAFB]">Stripe</strong> (Stripe, Inc.) — payment processing. We never see card data. <a href="https://stripe.com/privacy" className="text-sky-400">Privacy policy</a></li>
              <li><strong className="text-[#F9FAFB]">Resend</strong> (Resend, Inc.) — transactional email. <a href="https://resend.com/privacy" className="text-sky-400">Privacy policy</a></li>
              <li><strong className="text-[#F9FAFB]">Vercel</strong> (Vercel, Inc.) — hosting and analytics. <a href="https://vercel.com/legal/privacy-policy" className="text-sky-400">Privacy policy</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">6. Cookies</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              We use one functional cookie set by Supabase to maintain your login session. Vercel Analytics is cookie-free.
              We do not use advertising cookies or third-party tracking cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">7. Your Rights</h2>
            <p className="text-sm text-[#9CA3AF] mb-3 leading-relaxed">Under GDPR, you have the right to:</p>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Access</strong> your data — available via Dashboard → Account → Export my data.</li>
              <li><strong className="text-[#F9FAFB]">Portability</strong> (Article 20) — download your data as JSON from your account settings.</li>
              <li><strong className="text-[#F9FAFB]">Erasure</strong> (Article 17) — delete your account from Dashboard → Account → Delete account.</li>
              <li><strong className="text-[#F9FAFB]">Withdraw consent</strong> — unsubscribe from any email using the link in the footer.</li>
              <li><strong className="text-[#F9FAFB]">Rectification</strong> — contact us at privacy@taskpilot.dev.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">8. Contact</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              For any privacy-related questions or requests:{' '}
              <a href="mailto:privacy@taskpilot.dev" className="text-sky-400">privacy@taskpilot.dev</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
