import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata = { title: 'Terms of Service' };

const CONTACT_EMAIL = 'byosekumbuga@gmail.com';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <div className="prose prose-invert prose-sm max-w-none">
          <h1 className="text-3xl font-bold text-[#F9FAFB] mb-2">Terms of Service</h1>
          <p className="text-[#6B7280] text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-CA')}</p>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">1. Agreement</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              These Terms govern your use of TaskPilot, operated by Michael Twagirayezu (sole
              proprietor), Toronto, Ontario, Canada. By using the service you agree to these Terms and
              our <Link href="/privacy" className="text-white">Privacy Policy</Link>.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">2. The service</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              TaskPilot sells a downloadable PowerShell automation kit and provides a free AI script
              generator and an in-app assistant for IT administrators. We may update, change, or
              discontinue features.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">3. Accounts</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              You are responsible for your account, credentials, and the activity under it. Provide
              accurate information and keep your credentials secure.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">4. Digital products &amp; refunds</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Purchases are for digital downloads. Due to the nature of digital goods, all sales are
              final and non-refundable once the download has been accessed. If a technical issue
              prevents your download, contact us and we will resolve it.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">5. License</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              A single purchase grants you a personal, non-transferable license to use the scripts in
              your own IT environment. You may not resell, redistribute, or sublicense the scripts.
              MSPs or consultants deploying these for clients require a commercial license; contact us
              via the contact form.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">6. Acceptable use</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Use the scripts and AI features only for legitimate IT administration in environments you
              are authorized to manage. You must not: break the law; attempt to breach security or
              disrupt the service; reverse engineer except as permitted by law; misuse the AI features
              to generate harmful or illegal content; or use the service to access systems you do not
              own or have explicit authorization to administer.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">7. Payments</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Paid features are billed via Stripe-hosted checkout. Card details are entered directly
              into Stripe and handled solely by Stripe; we never see or store card numbers. Applicable
              taxes may be added at checkout.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">8. AI-generated output</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Scripts and responses produced by the AI generator and assistant are provided for your
              review and may contain errors. You are responsible for reviewing and testing all output
              in a non-production environment before running it. You retain rights to the content you
              submit and to the scripts you generate.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">9. Disclaimer of warranties</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              The service and all scripts are provided &quot;as is&quot; without warranties to the
              extent permitted by law. Always test in a non-production environment before deploying. We
              make no warranty of fitness for a particular purpose.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">10. Limitation of liability</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Our total liability is limited to the amount you paid for the product. We are not liable
              for consequential, indirect, or incidental damages. Nothing here limits liability that
              cannot be excluded by law.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">11. Termination &amp; governing law</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              You may stop using the service at any time. We may suspend or terminate accounts that
              violate these Terms. These Terms are governed by the laws of Ontario, Canada.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">12. Contact</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Questions:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-white">{CONTACT_EMAIL}</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
