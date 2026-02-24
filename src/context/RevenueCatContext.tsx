import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

const RC_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';
const ENTITLEMENT = 'premium';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RevenueCatContextValue {
  isPremium: boolean;
  offering: PurchasesOffering | null;
  loading: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const RevenueCatContext = createContext<RevenueCatContextValue>({
  isPremium: false,
  offering: null,
  loading: true,
  purchasePackage: async () => false,
  restorePurchases: async () => false,
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive premium status from CustomerInfo
  const updatePremiumStatus = (info: CustomerInfo) => {
    const active = info.entitlements.active;
    setIsPremium(ENTITLEMENT in active);
  };

  useEffect(() => {
    const init = async () => {
      try {
        Purchases.configure({ apiKey: RC_IOS_KEY });

        // Fetch current customer info
        const info = await Purchases.getCustomerInfo();
        updatePremiumStatus(info);

        // Fetch the Main Offering from RevenueCat dashboard
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setOffering(offerings.current);
        }
      } catch (e) {
        console.warn('[RevenueCat] init error:', e);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Keep premium status in sync if the customer info changes elsewhere
    Purchases.addCustomerInfoUpdateListener((info) => {
      updatePremiumStatus(info);
    });

    // No removal needed — listener lives for the app lifetime
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      updatePremiumStatus(customerInfo);
      return ENTITLEMENT in customerInfo.entitlements.active;
    } catch (e: any) {
      // User cancelled — not an error worth surfacing
      if (!e.userCancelled) console.warn('[RevenueCat] purchase error:', e);
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      updatePremiumStatus(info);
      return ENTITLEMENT in info.entitlements.active;
    } catch (e) {
      console.warn('[RevenueCat] restore error:', e);
      return false;
    }
  };

  return (
    <RevenueCatContext.Provider
      value={{ isPremium, offering, loading, purchasePackage, restorePurchases }}>
      {children}
    </RevenueCatContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRevenueCat() {
  return useContext(RevenueCatContext);
}
