import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import RequireAuth from './components/RequireAuth';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; 
import CreatePostPage from './pages/CreatePostPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage'; 
import InboxPage from './pages/InboxPage'; 
import FavoritesPage from './pages/FavoritesPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import EditPostPage from './pages/EditPostPage';
import HaiPayReturn from './pages/HaiPayReturn';
import HaiPayLayout from './pages/haipay/HaiPayLayout';
import HaiPayDashboard from './pages/haipay/HaiPayDashboard';
import HaiPayLogin from './pages/haipay/HaiPayLogin';
import HaiPayRegister from './pages/haipay/HaiPayRegister';
import HaiPayAuthGuard from './pages/haipay/HaiPayAuthGuard';
import PublicProfile from './pages/PublicProfile';
import FollowPage from './pages/FollowPage';
import ProductListPage from './pages/ProductListPage';
import FloatingAdminChat from './components/FloatingAdminChat';
import FloatingAIChat from './components/FloatingAIChat';


// Seller Channel Components
import SellerRegistration from './pages/SellerRegistration';
import SellerProtectedRoute from './components/SellerProtectedRoute';
import SellerLayout from './pages/seller/SellerLayout';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProducts from './pages/seller/SellerProducts';
import SellerAddEditProduct from './pages/seller/SellerAddEditProduct';
import SellerOrders from './pages/seller/SellerOrders';
import SellerSettings from './pages/seller/SellerSettings';

import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HelpCenterPage from './pages/HelpCenterPage';
import SafeBuyingGuidePage from './pages/SafeBuyingGuidePage';
import DisputeResolutionPage from './pages/DisputeResolutionPage';
import FAQPage from './pages/FAQPage';
import AboutPage from './pages/AboutPage';
import CareersPage from './pages/CareersPage';
import CommunityStandardsPage from './pages/CommunityStandardsPage';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import EnvironmentalImpactPage from './pages/EnvironmentalImpactPage';
import FeeStructurePage from './pages/FeeStructurePage';

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <div className="App">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/post/:id" element={<ProductDetailPage />} />
                <Route path="/products" element={<ProductListPage />} />
                <Route path="/public-profile/:userId" element={<PublicProfile />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/help-center" element={<HelpCenterPage />} />
                <Route path="/safe-buying-guide" element={<SafeBuyingGuidePage />} />
                <Route path="/dispute-resolution" element={<DisputeResolutionPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/careers" element={<CareersPage />} />
                <Route path="/community-standards" element={<CommunityStandardsPage />} />
                <Route path="/environmental-impact" element={<EnvironmentalImpactPage />} />
                <Route path="/fee-structure" element={<FeeStructurePage />} />
                <Route path="/register-seller" element={<SellerRegistration />} />
                <Route path="/seller-register" element={<SellerRegistration />} />
                <Route path="/haipay/return" element={<HaiPayReturn />} />
                <Route path="/payment-result" element={<HaiPayReturn />} />
                <Route path="/haipay-result" element={<HaiPayReturn />} />

                {/* Protected routes - require login */}
                <Route path="/create-post" element={<RequireAuth><CreatePostPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
                <Route path="/inbox" element={<RequireAuth><InboxPage /></RequireAuth>} />
                <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
                <Route path="/cart" element={<RequireAuth><CartPage /></RequireAuth>} />
                <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
                <Route path="/edit-post/:id" element={<RequireAuth><EditPostPage /></RequireAuth>} />
                <Route path="/followed/followed" element={<RequireAuth><FollowPage /></RequireAuth>} />

                {/* Standalone HaiPay Wallet Module */}
                <Route path="/haipay" element={<HaiPayLayout />}>
                  <Route index element={<Navigate to="/haipay/dashboard" replace />} />
                  <Route path="login" element={<HaiPayLogin />} />
                  <Route path="register" element={<HaiPayRegister />} />
                  <Route path="dashboard" element={
                    <HaiPayAuthGuard>
                      <HaiPayDashboard />
                    </HaiPayAuthGuard>
                  } />
                </Route>

                {/* Dedicated B2C Seller Channel */}
                <Route path="/seller-channel" element={<SellerProtectedRoute />}>
                  <Route element={<SellerLayout />}>
                    <Route index element={<SellerDashboard />} />
                    <Route path="products" element={<SellerProducts />} />
                    <Route path="products/create" element={<SellerAddEditProduct />} />
                    <Route path="products/edit/:id" element={<SellerAddEditProduct />} />
                    <Route path="orders" element={<SellerOrders />} />
                    <Route path="settings" element={<SellerSettings />} />
                  </Route>
                </Route>

              </Routes>

          
          <FloatingAdminChat />
          <FloatingAIChat />
        </div>
        </Router>
          </SocketProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;