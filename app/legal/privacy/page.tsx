export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-gray-300">Last Updated: December 1, 2025</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
            <p className="text-gray-300">
              We collect information you provide directly to us, including email addresses, receipt images, 
              and wallet addresses when you use ReceiptX services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
            <p className="text-gray-300">
              We use the information we collect to provide, maintain, and improve our services, 
              process your receipts, award tokens, and communicate with you about your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Data Storage and Security</h2>
            <p className="text-gray-300">
              Your data is stored securely using industry-standard encryption. Receipt images and 
              OCR data are processed and stored in compliance with applicable data protection regulations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Your Rights</h2>
            <p className="text-gray-300">
              You have the right to access, update, or delete your personal information. Contact us 
              at privacy@receiptx.io for any data-related requests.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Cookies and Tracking</h2>
            <p className="text-gray-300">
              We use essential cookies to maintain your session and preferences. See our Cookie Policy 
              for more details.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Contact Us</h2>
            <p className="text-gray-300">
              If you have questions about this Privacy Policy, please contact us at privacy@receiptx.io
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
