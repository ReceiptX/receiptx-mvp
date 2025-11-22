"use client";

export default function RiskDisclaimer() {
  return (
    <div className="bg-blue-600/10 border-l-4 border-blue-600 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-400">Important Information</h3>
          <div className="mt-2 text-sm text-blue-200">
            <p>
              <strong>ReceiptX is a rewards program.</strong> By participating, you understand:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Reward tokens (RWT/AIA) are loyalty points with no guaranteed monetary value</li>
              <li>NFTs are digital collectibles earned through participation, not investments</li>
              <li>We do not offer financial products, securities, or investment advice</li>
              <li>Tokens cannot be purchased - they are earned only through uploading receipts</li>
              <li>Program terms may change; rewards are subject to availability</li>
            </ul>
            <p className="mt-2 text-xs text-blue-300">
              By using ReceiptX, you acknowledge this is a rewards program similar to airline miles or credit card points.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
