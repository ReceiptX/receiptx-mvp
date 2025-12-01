export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-gray-300">Last Updated: December 1, 2025</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. What Are Cookies</h2>
            <p className="text-gray-300">
              Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Types of Cookies We Use</h2>
            <p className="text-gray-300">
              <strong>Essential Cookies:</strong> Required for authentication and basic functionality.
            </p>
            <p className="text-gray-300">
              <strong>Functional Cookies:</strong> Remember your preferences and settings.
            </p>
            <p className="text-gray-300">
              <strong>Analytics Cookies:</strong> Help us understand how users interact with our platform (anonymized).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Managing Cookies</h2>
            <p className="text-gray-300">
              You can control and delete cookies through your browser settings. However, disabling essential cookies may affect site functionality.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Third-Party Cookies</h2>
            <p className="text-gray-300">
              We use Privy for authentication and Supabase for data storage, which may set their own cookies. See their privacy policies for details.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Contact</h2>
            <p className="text-gray-300">
              For questions about our cookie usage, contact privacy@receiptx.io
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
