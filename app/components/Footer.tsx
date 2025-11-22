import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold text-cyan-400 mb-4">ReceiptX</h3>
            <p className="text-gray-400 text-sm">
              Turn your everyday receipts into crypto rewards.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/legal/privacy" className="text-gray-400 hover:text-cyan-400 text-sm transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="text-gray-400 hover:text-cyan-400 text-sm transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/cookie-policy" className="text-gray-400 hover:text-cyan-400 text-sm transition">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/program-terms" className="text-gray-400 hover:text-cyan-400 text-sm transition">
                  Program Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/legal/data-protection" className="text-gray-400 hover:text-cyan-400 text-sm transition">
                  Data Protection (GDPR)
                </Link>
              </li>
              <li>
                <Link href="/legal/ccpa" className="text-gray-400 hover:text-cyan-400 text-sm transition">
                  Your Privacy Rights (CCPA)
                </Link>
              </li>
              <li>
                <a href="mailto:privacy@receiptx.com" className="text-gray-400 hover:text-cyan-400 text-sm transition">
                  Contact Privacy Team
                </a>
              </li>
            </ul>
          </div>

          {/* Compliance Badges */}
          <div>
            <h4 className="text-white font-semibold mb-4">Compliance</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="px-2 py-1 bg-green-600/20 border border-green-600 rounded text-green-400">
                  GDPR Compliant
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="px-2 py-1 bg-blue-600/20 border border-blue-600 rounded text-blue-400">
                  CCPA Compliant
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="px-2 py-1 bg-purple-600/20 border border-purple-600 rounded text-purple-400">
                  SOC 2 Type II
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} ReceiptX. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs mt-2 md:mt-0">
            Digital rewards program. Tokens are loyalty points, not securities or investments.
          </p>
        </div>
      </div>
    </footer>
  );
}
