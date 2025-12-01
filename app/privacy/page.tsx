export const metadata = {
  title: "Privacy Policy • ReceiptX",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen rx-body px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-10">

        <h1 className="text-3xl font-bold">Privacy Policy</h1>

        <p className="text-slate-300">
          ReceiptX is committed to protecting your privacy. We collect only the minimum data required
          to provide rewards, process receipts, and generate anonymized purchase analytics.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">1. Data We Collect</h2>
          <ul className="list-disc pl-6 text-slate-400 space-y-1">
            <li>Email for authentication</li>
            <li>Receipt images for OCR processing</li>
            <li>Anonymized purchase data (non-PII)</li>
            <li>Reward activity and balances</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. How We Use Data</h2>
          <ul className="list-disc pl-6 text-slate-400 space-y-1">
            <li>Reward calculation</li>
            <li>Referral bonuses</li>
            <li>Anonymized business analytics</li>
            <li>Security and fraud prevention</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Data We DO NOT Collect</h2>
          <p className="text-slate-300">
            ReceiptX does not store PII such as credit card numbers, names on receipts, or payment
            information. All OCR pipelines scrub PII before analytics storage.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Contact</h2>
          <p className="text-cyan-400">privacy@receiptx.app</p>
        </section>

      </div>
    </main>
  );
}
