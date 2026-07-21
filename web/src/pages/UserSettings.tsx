import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  ArrowLeft,
  CheckCircle2,
  Save,
} from 'lucide-react'
import { mockUserProfile } from '../features/user/data/userProfile'

export function UserSettings() {
  const [profile, setProfile] = useState(mockUserProfile)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Back link */}
      <Link
        to="/user/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Account Settings & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Manage your personal details, KYC identity verification, and escrow notification preferences.
        </p>
      </div>

      {savedSuccess && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          Your account settings have been saved successfully!
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar Menu */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-1 text-xs font-semibold">
            {[
              { id: 'profile', label: 'Personal Information', icon: User },
              { id: 'security', label: 'Security & Password', icon: Lock },
              { id: 'notifications', label: 'Escrow Notifications', icon: Bell },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-all text-left cursor-pointer ${
                  activeTab === id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* KYC Status Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              KYC Verification Status
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={13} /> Level 2 Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Your government ID and proof of address are verified. You have un-capped escrow purchasing power.
            </p>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-8">
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Personal Information
              </h3>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="user-fullname">
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="user-fullname"
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="user-username">
                  Username
                </label>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="user-username"
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="user-email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="user-email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="user-phone">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="user-phone"
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 transition-all cursor-pointer shadow-md"
              >
                <Save size={15} /> Save Changes
              </button>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Security & Password Management
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                To update your account password, click below to launch the secure password change flow.
              </p>
              <Link
                to="/change-password"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all"
              >
                <Lock size={15} /> Change Account Password
              </Link>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Escrow Notification Preferences
              </h3>
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer text-slate-800 dark:text-slate-200">
                  <span>Receive Email on order shipment & tracking update</span>
                  <input type="checkbox" defaultChecked className="rounded text-primary-600" />
                </label>
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer text-slate-800 dark:text-slate-200">
                  <span>SMS alert when funds are ready for release</span>
                  <input type="checkbox" defaultChecked className="rounded text-primary-600" />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
