export default function ProgramTerms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Rewards Program Terms</h1>
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-gray-300">Effective Date: December 1, 2025</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Program Overview</h2>
            <p className="text-gray-300">
              The ReceiptX Rewards Program allows users to earn Reward Tokens (RWT) and Analytics Tokens (AIA) by uploading valid receipts. Milestone NFTs are awarded based on participation.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Token Allocation</h2>
            <p className="text-gray-300">
              <strong>RWT (Reward Tokens):</strong> Base amount calculated from receipt total with brand and tier multipliers applied.
            </p>
            <p className="text-gray-300">
              <strong>AIA (Analytics Tokens):</strong> 10% of RWT earned, used for staking to unlock higher tiers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Eligibility Requirements</h2>
            <p className="text-gray-300">
              Valid receipts must be legible, show total amount, date, and merchant information. Fraudulent or duplicate receipts will be rejected and may result in account suspension.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Staking Tiers</h2>
            <p className="text-gray-300">
              <strong>Bronze:</strong> 0 AIA staked (1.0x multiplier)<br/>
              <strong>Silver:</strong> 100 AIA staked (1.1x multiplier)<br/>
              <strong>Gold:</strong> 1,000 AIA staked (1.25x multiplier)<br/>
              <strong>Premium:</strong> 10,000 AIA staked (1.5x multiplier)
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. NFT Milestones</h2>
            <p className="text-gray-300">
              Milestone NFTs are auto-minted at 5, 15, 40, and 100 receipts. Brand "Warrior" NFTs awarded for loyalty to specific brands.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Token Value Disclaimer</h2>
            <p className="text-gray-300">
              RWT and AIA tokens have no monetary value and cannot be exchanged for cash. They are platform utility tokens only.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Program Changes</h2>
            <p className="text-gray-300">
              ReceiptX reserves the right to modify token allocation rates, tier requirements, and program terms with 30 days notice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Referral Program</h2>
            <p className="text-gray-300">
              Earn 10% bonus RWT from receipts uploaded by users you refer. Referral codes provided in user dashboard.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Contact</h2>
            <p className="text-gray-300">
              For program questions, contact support@receiptx.io
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
