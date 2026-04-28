import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <div className="prose prose-invert prose-sm max-w-none">
          <h1 className="text-3xl font-bold text-[#F9FAFB] mb-2">Terms of Service</h1>
          <p className="text-[#6B7280] text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-CA')}</p>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">1. Acceptance</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              By purchasing or using TaskPilot products, you agree to these terms. TaskPilot is
              operated by Michael Twagirayezu, Toronto, Ontario, Canada.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">2. Digital Products</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Purchases are for digital downloads. Due to the nature of digital goods, all sales
              are final and non-refundable once the download has been accessed. If you experience
              a technical issue preventing download, contact us and we will resolve it.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">3. License</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              A single purchase grants you a personal, non-transferable license to use the scripts
              in your own IT environment. You may not resell, redistribute, or sublicense the
              scripts. MSPs or consultants deploying these for clients require a commercial license —
              contact us.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">4. Acceptable Use</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Scripts are provided for legitimate IT administration in environments you are
              authorized to manage. You must not use them to access systems you do not own or
              have explicit authorization to administer.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">5. Disclaimer of Warranties</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Scripts are provided &quot;as is.&quot; Always test in a non-production environment before
              deploying. We make no warranty of fitness for a particular purpose. Review scripts
              before running them in your environment.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">6. Limitation of Liability</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Our total liability is limited to the amount paid for the product. We are not liable
              for consequential, indirect, or incidental damages.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">7. Governing Law</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              These terms are governed by the laws of Ontario, Canada.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-3">8. Contact</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Questions:{' '}
              <a href="mailto:hello@taskpilot.dev" className="text-red-400">hello@taskpilot.dev</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
