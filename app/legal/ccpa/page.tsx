export default function CCPA() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">California Consumer Privacy Act (CCPA) Notice</h1>
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-gray-300">Effective Date: December 1, 2025</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Your California Privacy Rights</h2>
            <p className="text-gray-300">
              California residents have specific rights regarding their personal information under the CCPA, including the right to know, delete, and opt-out of the sale of personal information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Categories of Information Collected</h2>
            <p className="text-gray-300">
              We collect: identifiers (email addresses), commercial information (receipt data), and internet activity (usage patterns).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Right to Know</h2>
            <p className="text-gray-300">
              You have the right to request information about the personal data we've collected about you in the past 12 months.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Right to Delete</h2>
            <p className="text-gray-300">
              You may request deletion of your personal information, subject to certain exceptions required by law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. No Sale of Personal Information</h2>
            <p className="text-gray-300">
              ReceiptX does not sell your personal information to third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Exercising Your Rights</h2>
            <p className="text-gray-300">
              To exercise your CCPA rights, contact us at privacy@receiptx.io with "CCPA Request" in the subject line.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
