import { Link } from 'react-router-dom'
import { ShieldCheck, Lock, Wallet } from 'lucide-react'
import logo from '../../../assets/logo.svg'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-950 text-white mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <Link to="/" className="inline-flex w-fit items-center">
              <img src={logo} alt="P2P Trust Market" className="h-11 w-auto" />
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The trust-first P2P marketplace and standalone escrow platform. Built on a rail-agnostic ledger supporting both Fiat and self-custody Crypto transactions.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck size={14} /> 100% KYC Verified Sellers
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <Lock size={14} /> Append-Only Ledger
              </span>
            </div>
          </div>

          {/* Sitemap Links */}
          <div className="md:col-span-8 grid grid-cols-2 gap-8 sm:grid-cols-3">
            {/* Column 1: Marketplace & Escrow */}
            <div className="space-y-3">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
                Platform Services
              </h3>
              <ul className="space-y-2 text-xs font-medium text-slate-300">
                <li>
                  <Link to="/marketplace" className="hover:text-white transition-colors">
                    Browse Marketplace
                  </Link>
                </li>
                <li>
                  <Link to="/deals" className="hover:text-white transition-colors">
                    Standalone Escrow Deals
                  </Link>
                </li>
                <li>
                  <Link to="/escrow/new" className="hover:text-white transition-colors text-primary-400 font-semibold">
                    Start New Escrow Contract
                  </Link>
                </li>
                <li>
                  <Link to="/sell" className="hover:text-white transition-colors">
                    Apply to Become a Vendor
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Account & Legal */}
            <div className="space-y-3">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
                Account & Legal
              </h3>
              <ul className="space-y-2 text-xs font-medium text-slate-300">
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    Privacy & Encryption
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Sign In to Portal
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-white transition-colors">
                    Create Free Account
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Trust & Infrastructure */}
            <div className="space-y-3">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
                Trust & Infrastructure
              </h3>
              <ul className="space-y-2 text-xs font-medium text-slate-300">
                <li className="flex items-center gap-1.5 text-slate-400">
                  <Wallet size={13} /> Fiat Rail: Stripe Connect
                </li>
                <li className="flex items-center gap-1.5 text-slate-400">
                  <Wallet size={13} /> Crypto Rail: USDC / USDT
                </li>
                <li className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck size={13} /> Dispute Mediation SLA
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} P2P Trust Market. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Escrow Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
