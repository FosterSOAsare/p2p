import { Routes, Route } from 'react-router-dom'
import { Layout } from './features/shared/ui/Layout'
import { Home } from './pages/Home'
import { StyleGuide } from './pages/StyleGuide'
import { Products } from './features/marketplace/ui/Products'
import { ProductDetail } from './features/marketplace/ui/ProductDetail'
import { Checkout } from './pages/Checkout'
import { PaymentCallback } from './pages/PaymentCallback'
import { Messages } from './pages/Messages'
import { Signup } from './features/auth/ui/Signup'
import { Login } from './features/auth/ui/Login'
import { VerifyEmail } from './features/auth/ui/VerifyEmail'
import { ForgotPassword } from './features/auth/ui/ForgotPassword'
import { ResetPassword } from './features/auth/ui/ResetPassword'
import { ChangePassword } from './features/auth/ui/ChangePassword'
import { Deals } from './pages/Deals'
import { NewEscrow } from './pages/NewEscrow'
import { EscrowDetail } from './pages/EscrowDetail'
import { JoinDeal } from './pages/JoinDeal'
import { Dashboard } from './pages/Dashboard'
import { UserSettings } from './pages/UserSettings'
import { Bookmarks } from './pages/Bookmarks'
import { SellerWallet } from './pages/SellerWallet'
import { MyListings } from './pages/MyListings'
import { ListingNew } from './pages/ListingNew'
import { ListingDetail } from './pages/ListingDetail'
import { SellerGuard } from './features/seller/ui/SellerGuard'
import { AdminGuard } from './features/admin/ui/AdminGuard'
import { VendorKyc } from './pages/VendorKyc'
import { SellerProfile } from './pages/SellerProfile'
import { AdminKycList } from './pages/AdminKycList'
import { AdminKycDetail } from './pages/AdminKycDetail'
import { AdminDisputesList } from './pages/AdminDisputesList'
import { AdminDisputeDetail } from './pages/AdminDisputeDetail'
import { AdminUsersList } from './pages/AdminUsersList'
import { AdminListingsList } from './pages/AdminListingsList'
import { AdminListingDetail } from './pages/AdminListingDetail'
import { AdminReportsList } from './pages/AdminReportsList'
import { AdminDashboard } from './pages/AdminDashboard'
import { NotFound } from './pages/NotFound'
import { Terms } from './pages/Terms'
import { Privacy } from './pages/Privacy'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="style-guide" element={<StyleGuide />} />
        <Route path="marketplace" element={<Products />} />
        <Route path="marketplace/:id" element={<ProductDetail />} />
        <Route path="checkout" element={<Checkout />} />
        {/* Return leg from the hosted payment page */}
        <Route path="wallet/deposit/callback" element={<PaymentCallback />} />
        <Route path="seller/:username" element={<SellerProfile />} />
        {/* Inbox — the open thread is selected by ?u=<username> */}
        <Route path="messages" element={<Messages />} />
        {/* Unified deals list — role-aware (buyer/seller → own deals, admin → all) */}
        <Route path="deals" element={<Deals />} />
        <Route path="escrow/new" element={<NewEscrow />} />
        <Route path="escrow/:id" element={<EscrowDetail />} />
        {/* Share-link / QR landing — public, so the deal is readable before signing in */}
        <Route path="join/:code" element={<JoinDeal />} />
        <Route path="sell" element={<VendorKyc />} />
        <Route path="vendor/kyc" element={<VendorKyc />} />
        {/* Single role-aware dashboard (admin → console, verified seller → store, buyer → overview) */}
        <Route path="dashboard" element={<Dashboard />} />
        {/* Listing management — SellerGuard layout (KYC-verified sellers & admins) */}
        <Route element={<SellerGuard />}>
          <Route path="listings" element={<MyListings />} />
          <Route path="listings/new" element={<ListingNew />} />
          <Route path="listings/:id" element={<ListingDetail />} />
        </Route>
        <Route path="settings" element={<UserSettings />} />
        <Route path="bookmarks" element={<Bookmarks />} />
        <Route path="wallet" element={<SellerWallet />} />
        {/* Admin console — AdminGuard layout */}
        <Route element={<AdminGuard />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/kyc" element={<AdminKycList />} />
          <Route path="admin/kyc/:id" element={<AdminKycDetail />} />
          <Route path="admin/disputes" element={<AdminDisputesList />} />
          <Route path="admin/disputes/:id" element={<AdminDisputeDetail />} />
          <Route path="admin/listings" element={<AdminListingsList />} />
          <Route path="admin/listings/:id" element={<AdminListingDetail />} />
          <Route path="admin/reports" element={<AdminReportsList />} />
          <Route path="admin/users" element={<AdminUsersList />} />
        </Route>
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="signup" element={<Signup />} />
        <Route path="login" element={<Login />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
