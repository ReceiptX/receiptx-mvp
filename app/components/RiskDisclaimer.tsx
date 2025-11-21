"use client";

export default function RiskDisclaimer() {
  return (
    <div className="bg-yellow-600/10 border-l-4 border-yellow-600 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-400">Investment Risk Warning</h3>
          <div className="mt-2 text-sm text-yellow-200">
            <p>
              <strong>ReceiptX involves cryptocurrency rewards and NFTs.</strong> Please be aware:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Cryptocurrency values can be volatile and may fluctuate significantly</li>
              <li>Past performance does not guarantee future results</li>
              <li>You may lose some or all of your staked tokens</li>
              <li>This is not financial advice - consult a professional advisor</li>
              <li>Only participate with funds you can afford to lose</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
