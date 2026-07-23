import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './features/shared/ui/Layout'
import { Home } from './pages/Home'
import { StyleGuide } from './pages/StyleGuide'
import { Products } from './features/marketplace/ui/Products'
import { ProductDetail } from './features/marketplace/ui/ProductDetail'
import { Signup } from './features/auth/ui/Signup'
import { Login } from './features/auth/ui/Login'
import { VerifyEmail } from './features/auth/ui/VerifyEmail'
import { ForgotPassword } from './features/auth/ui/ForgotPassword'
import { ResetPassword } from './features/auth/ui/ResetPassword'
import { ChangePassword } from './features/auth/ui/ChangePassword'
import { Escrow } from './pages/Escrow'
import { NewEscrow } from './pages/NewEscrow'
import { EscrowDetail } from './pages/EscrowDetail'
import { EscrowMessages } from './features/escrow/ui/EscrowMessages'
import { Dashboard } from './pages/Dashboard'
import { UserOrders } from './pages/UserOrders'
import { UserSettings } from './pages/UserSettings'
import { UserProducts } from './pages/UserProducts'
import { ListingDetail } from './pages/ListingDetail'
import { SellerGuard } from './features/seller/ui/SellerGuard'
import { VendorKyc } from './pages/VendorKyc'
import { SellerProfile } from './pages/SellerProfile'
import { Messages } from './pages/Messages'
import { MessageThread } from './pages/MessageThread'
import { AdminKycList } from './pages/AdminKycList'
import { AdminKycDetail } from './pages/AdminKycDetail'
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
        <Route path="seller/:username" element={<SellerProfile />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:username" element={<MessageThread />} />
        <Route path="escrow" element={<Escrow />} />
        <Route path="escrow/new" element={<NewEscrow />} />
        <Route path="escrow/:id" element={<EscrowDetail />} />
        <Route path="escrow/:id/messages" element={<EscrowMessages />} />
        <Route path="escrow/messages" element={<EscrowMessages />} />
        <Route path="sell" element={<VendorKyc />} />
        <Route path="vendor/kyc" element={<VendorKyc />} />
        {/* Single role-aware dashboard (admin → console, verified seller → store, buyer → overview) */}
        <Route path="dashboard" element={<Dashboard />} />
        {/* Listing management — sellers & admins only */}
        <Route path="listings" element={<SellerGuard><UserProducts /></SellerGuard>} />
        <Route path="listings/:id" element={<SellerGuard><ListingDetail /></SellerGuard>} />
        <Route path="user/orders" element={<UserOrders />} />
        <Route path="user/settings" element={<UserSettings />} />
        {/* Legacy route redirects */}
        <Route path="user/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="vendor/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="seller/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="user/products" element={<Navigate to="/listings" replace />} />
        <Route path="admin/kyc" element={<AdminKycList />} />
        <Route path="admin/kyc/:id" element={<AdminKycDetail />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="signup" element={<Signup />} />
        <Route path="login" element={<Login />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="*" element={<div className="py-12 text-center text-slate-600 dark:text-slate-400">Page not found</div>} />
      </Route>
    </Routes>
  )
}

export default App
