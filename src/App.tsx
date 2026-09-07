import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { Footer } from './components/layout/Footer';
import { AiAssistant } from './components/common/AiAssistant';
import { Button } from './components/common/Button';
import { AuthModal } from './components/auth/AuthModal';
import { AdminSupportModal } from './components/common/AdminSupportModal';
import { BuyerPaymentModal } from './components/transactions/BuyerPaymentModal';
import { MarketplaceView } from './views/MarketplaceView';
import { CommunityView } from './views/CommunityView';
import { DashboardView } from './views/DashboardView';
import { OrderView } from './views/OrderView';
import { SellView } from './views/SellView';
import { AccountView } from './views/AccountView';
import { AdminPortalView } from './views/AdminPortalView';
import { Order, Transaction, AppTab } from './types';
import { apiClient } from './api/client';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [currentTab, setCurrentTab] = useState<AppTab>('marketplace');
  const [isAdminSupportOpen, setIsAdminSupportOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<Order | null>(null);
  const [activePaymentTx, setActivePaymentTx] = useState<Transaction | null>(null);

  const handleTabChange = (tab: AppTab) => {
    if (!isAuthenticated && tab !== 'marketplace') {
      openAuthModal('signin', `Please sign in to access ${tab}`);
      return;
    }
    setCurrentTab(tab);
  };

  const handleOrderCreated = async (order: Order) => {
    // Fetch the server-created transaction. Never read transaction state from a browser-local service.
    try {
      const tx = await apiClient.get<Transaction>(`/transactions/order/${order.id}`);
      if (!tx) throw new Error('Escrow transaction was not created for this order.');
      setActivePaymentOrder(order);
      setActivePaymentTx(tx);
      setCurrentTab('order');
    } catch (error) {
      console.error('Failed to load the escrow transaction after order creation:', error);
      setActivePaymentOrder(null);
      setActivePaymentTx(null);
      setCurrentTab('order');
    }
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case 'marketplace':
        return <MarketplaceView onOrderCreated={handleOrderCreated} />;
      case 'community':
        return <CommunityView />;
      case 'dashboard':
        return isAuthenticated ? <DashboardView onNavigateToTab={setCurrentTab} /> : <MarketplaceView onOrderCreated={handleOrderCreated} />;
      case 'order':
        return isAuthenticated ? <OrderView /> : <MarketplaceView onOrderCreated={handleOrderCreated} />;
      case 'sell':
        return isAuthenticated ? <SellView /> : <MarketplaceView onOrderCreated={handleOrderCreated} />;
      case 'account':
        return isAuthenticated ? (
          <AccountView
            onOpenAdminSupport={() => setIsAdminSupportOpen(true)}
            onNavigateToTab={setCurrentTab}
          />
        ) : <MarketplaceView onOrderCreated={handleOrderCreated} />;
      case 'admin':
        if (user?.role !== 'ADMIN' && user?.authRole !== 'admin') {
          return (
            <div className="p-8 text-center space-y-4 max-w-md mx-auto my-12 bg-[#121824] border border-rose-500/30 rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Access Restricted</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The Admin Control Center is strictly restricted to authorized Ethio Online Market Escrow Officers and Administrators (@mr_ebek & @EXO_SMM).
              </p>
              <Button variant="secondary" size="md" onClick={() => setCurrentTab('marketplace')}>
                Return to Marketplace
              </Button>
            </div>
          );
        }
        return <AdminPortalView />;
      default:
        return <MarketplaceView onOrderCreated={handleOrderCreated} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#05070A] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#05070A] to-[#05070A] text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <Header
        activeTab={currentTab}
        onSelectTab={handleTabChange}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {renderActiveView()}
      </main>

      {/* Desktop / Global Footer */}
      <Footer onOpenAdminSupport={() => setIsAdminSupportOpen(true)} />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={currentTab}
        onSelectTab={handleTabChange}
      />

      <AiAssistant />

      {/* Global Auth Modal */}
      <AuthModal />

      {/* Admin Escrow Support & Bank Info Modal */}
      <AdminSupportModal
        isOpen={isAdminSupportOpen}
        onClose={() => setIsAdminSupportOpen(false)}
      />

      {/* Quick Buyer Payment Deposit Modal */}
      {activePaymentOrder && activePaymentTx && (
        <BuyerPaymentModal
          isOpen={Boolean(activePaymentOrder)}
          onClose={() => {
            setActivePaymentOrder(null);
            setActivePaymentTx(null);
          }}
          transaction={activePaymentTx!}
          onPaymentSubmitted={() => {
            setActivePaymentOrder(null);
            setActivePaymentTx(null);
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
