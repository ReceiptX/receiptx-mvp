export default function DataProtection() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Data Protection Policy</h1>
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-gray-300">Last Updated: December 1, 2025</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Our Commitment</h2>
            <p className="text-gray-300">
              ReceiptX is committed to protecting your personal data and complying with applicable data protection regulations including GDPR and CCPA.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Data Security Measures</h2>
            <p className="text-gray-300">
              We implement industry-standard security measures including encryption at rest and in transit, secure authentication via Privy, and regular security audits.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Data Retention</h2>
            <p className="text-gray-300">
              We retain your data only as long as necessary for service provision or as required by law. Receipt images are processed and stored securely in Supabase.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Data Processing</h2>
            <p className="text-gray-300">
              Receipt data is processed using OCR.space API. We do not share your data with third parties except as necessary for service operation (authentication, storage, OCR processing).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Your Rights</h2>
            <p className="text-gray-300">
              You have the right to access, correct, delete, or export your data. You may also object to certain processing activities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Data Breach Notification</h2>
            <p className="text-gray-300">
              In the event of a data breach, we will notify affected users within 72 hours as required by law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Contact</h2>
            <p className="text-gray-300">
              For data protection inquiries, contact our Data Protection Officer at privacy@receiptx.io
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
