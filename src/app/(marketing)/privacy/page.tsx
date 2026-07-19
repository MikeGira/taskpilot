import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata = { title: 'Privacy Policy' };

const CONTACT_EMAIL = 'byosekumbuga@gmail.com';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <div className="prose prose-invert prose-sm max-w-none">
          <h1 className="text-3xl font-bold text-[#F9FAFB] mb-2">Privacy Policy</h1>
          <p className="text-[#6B7280] text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-CA')}</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">1. Who we are</h2>
            <p className="text-[#9CA3AF] text-sm leading-relaxed">
              TaskPilot is operated by Michael Twagirayezu (sole proprietor), Toronto, Ontario, Canada,
              the data controller for the personal data described here. For any privacy question or to
              exercise your rights, contact{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-white">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">2. Data we collect</h2>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Account data:</strong> Email address and authentication identifiers (required to log in and receive your purchase).</li>
              <li><strong className="text-[#F9FAFB]">Purchase data:</strong> Email, Stripe IDs, product purchased, amount paid, status, and purchase date. We never see or store card numbers.</li>
              <li><strong className="text-[#F9FAFB]">AI generator &amp; assistant inputs:</strong> The task descriptions you enter in the script generator and the messages you send to the in-app assistant. These are processed by our AI provider (Anthropic) to produce a response.</li>
              <li><strong className="text-[#F9FAFB]">Feedback &amp; usage data:</strong> When you rate a generated script we store the chosen OS, environment, language, rating, any comment, and a one-way <strong className="text-[#F9FAFB]">hashed</strong> IP address (we do not store your raw IP).</li>
              <li><strong className="text-[#F9FAFB]">Newsletter:</strong> Email address, subscription date, confirmation status.</li>
              <li><strong className="text-[#F9FAFB]">Contact requests:</strong> Name, email, company (optional), message, budget range (optional).</li>
              <li><strong className="text-[#F9FAFB]">Analytics:</strong> Aggregate page views via Vercel Analytics (cookie-free, no personal identifiers).</li>
            </ul>
            <p className="text-sm text-[#9CA3AF] mt-3 leading-relaxed">
              We do not intentionally collect special-category data. Please do not enter sensitive
              personal data, secrets, or credentials into the generator, assistant, or free-text fields.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">3. Legal basis (GDPR Article 6)</h2>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Contract performance:</strong> Operating TaskPilot, processing your purchase, and delivering your download.</li>
              <li><strong className="text-[#F9FAFB]">Legitimate interests:</strong> Security monitoring, fraud and abuse prevention, and improving the product.</li>
              <li><strong className="text-[#F9FAFB]">Consent:</strong> Newsletter subscription (you can withdraw at any time).</li>
              <li><strong className="text-[#F9FAFB]">Legal obligation:</strong> Retaining transaction records for 7 years (Canadian tax law).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">4. Sharing &amp; subprocessors</h2>
            <p className="text-sm text-[#9CA3AF] mb-3 leading-relaxed">
              We share data only with service providers that process it on our instructions. We do not
              sell personal data.
            </p>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Supabase</strong> (Supabase Inc.): database, authentication, and storage. <a href="https://supabase.com/privacy" className="text-white">Privacy policy</a></li>
              <li><strong className="text-[#F9FAFB]">Stripe</strong> (Stripe, Inc.): payment processing. Card data is handled solely by Stripe. <a href="https://stripe.com/privacy" className="text-white">Privacy policy</a></li>
              <li><strong className="text-[#F9FAFB]">Anthropic</strong> (Anthropic, PBC): AI inference for the script generator and assistant. Your prompts are sent to Anthropic to generate a response. <a href="https://www.anthropic.com/legal/privacy" className="text-white">Privacy policy</a></li>
              <li><strong className="text-[#F9FAFB]">Resend</strong> (Resend, Inc.): transactional email. <a href="https://resend.com/legal/privacy-policy" className="text-white">Privacy policy</a></li>
              <li><strong className="text-[#F9FAFB]">Vercel</strong> (Vercel, Inc.): hosting and cookie-free analytics. <a href="https://vercel.com/legal/privacy-policy" className="text-white">Privacy policy</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">5. International transfers</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Our providers process data in the United States (our database is hosted in AWS
              us-west-2, Oregon). Where required, these transfers rely on appropriate safeguards such
              as Standard Contractual Clauses offered by each provider.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">6. Data retention</h2>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Purchase records:</strong> 7 years (personal fields removed on account deletion; transaction amounts retained for tax compliance).</li>
              <li><strong className="text-[#F9FAFB]">Account / profile:</strong> Until you delete your account; then purged, with backups expiring within 30 days.</li>
              <li><strong className="text-[#F9FAFB]">Feedback &amp; usage data:</strong> 24 months, then deleted.</li>
              <li><strong className="text-[#F9FAFB]">Operational logs:</strong> 90 days.</li>
              <li><strong className="text-[#F9FAFB]">Newsletter:</strong> Until you unsubscribe.</li>
              <li><strong className="text-[#F9FAFB]">Contact requests:</strong> 2 years.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">7. Cookies</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              We use one functional cookie set by Supabase to maintain your login session. Vercel
              Analytics is cookie-free. We do not use advertising or third-party tracking cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">8. Your rights</h2>
            <p className="text-sm text-[#9CA3AF] mb-3 leading-relaxed">
              Depending on your location (GDPR/UK GDPR, PIPEDA, and others) you may have the right to:
            </p>
            <ul className="text-sm text-[#9CA3AF] space-y-2 list-disc list-inside">
              <li><strong className="text-[#F9FAFB]">Access &amp; portability</strong> (GDPR Articles 15, 20): download a copy of your data from Dashboard &gt; Account &gt; Export your data.</li>
              <li><strong className="text-[#F9FAFB]">Erasure</strong> (Article 17): delete your account from Dashboard &gt; Account &gt; Delete account.</li>
              <li><strong className="text-[#F9FAFB]">Withdraw consent:</strong> unsubscribe from any email using the link in the footer.</li>
              <li><strong className="text-[#F9FAFB]">Rectification &amp; objection:</strong> contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-white">{CONTACT_EMAIL}</a>.</li>
            </ul>
            <p className="text-sm text-[#9CA3AF] mt-3 leading-relaxed">
              We respond within the legally required time (GDPR: 1 month). You may also lodge a
              complaint with your supervisory authority, in Canada the{' '}
              <a href="https://www.priv.gc.ca/" className="text-white">Office of the Privacy Commissioner of Canada</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">9. Security</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              We protect your data with encryption in transit and at rest, row-level access controls,
              least privilege, and continuous monitoring. No method is 100% secure, but we work to
              enterprise-grade standards.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">10. Children</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              TaskPilot is a tool for IT professionals and is not directed to children under 16. We do
              not knowingly collect their personal data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">11. Changes</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              We may update this policy; material changes will be reflected by the &ldquo;last
              updated&rdquo; date above and, where appropriate, notified by email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">12. Contact</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              For any privacy-related question or request:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-white">{CONTACT_EMAIL}</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
