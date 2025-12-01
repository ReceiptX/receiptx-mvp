export const metadata = {
  title: "Terms of Service • ReceiptX",
};

export default function TermsOfService() {
  return (
    <main className="min-h-screen rx-body px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-10">

        <h1 className="text-3xl font-bold">Terms of Service</h1>

        <p className="text-slate-300">
          By using ReceiptX, you agree to these terms governing user accounts, receipt submission,
          token rewards, and data usage.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Eligibility</h2>
          <p className="text-slate-300">
            Users must be at least 18 and reside in a region that permits digital rewards systems.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Prohibited Activity</h2>
          <ul className="list-disc pl-6 text-slate-400 space-y-1">
            <li>Submitting fake or altered receipts</li>
            <li>Automating receipt submissions</li>
            <li>Attempting to manipulate rewards</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Reward Program</h2>
          <p className="text-slate-300">
            RWT and AIA tokens are internal reward units with no cash value, unless explicitly stated
            by the program in the future.
          </p>
        </section>

      </div>
    </main>
  );
}
