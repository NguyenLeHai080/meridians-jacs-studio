import { useState, useEffect, useCallback } from "react";
import { getToken } from "../../core/session";
import { apiRequest } from "../../core/api";
import { Toast } from "../../components/common/Toast";
import { Sidebar, MenuKey } from "../../components/layout/Sidebar";
import { Navbar } from "../../components/layout/Navbar";

// Feature Pages
import { OverviewPage } from "../overview";
import { LicensesPage } from "../licenses";
import { BillingPage } from "../billing";
import { PlansPage } from "../plans";
import { RenewalsPage } from "../renewals";
import { SessionsPage } from "../sessions";
import { ProvidersPage } from "../ai-providers";
import { TelemetryPage } from "../telemetry";
import { ReleasesPage } from "../releases";
import { ToolConfigPage } from "../tool-config";
import { TermsPage } from "../terms";
import { SettingsPage, AccountSecurityModal } from "../settings";

const VALID_MENUS: MenuKey[] = [
  "overview",
  "licenses",
  "sessions",
  "billing",
  "plans",
  "renewals",
  "providers",
  "telemetry",
  "releases",
  "terms",
  "tool_branding",
  "settings",
];

function getInitialMenu(): MenuKey {
  if (typeof window === "undefined") return "overview";
  const saved = (localStorage.getItem("jacs.admin.activeMenu") || "").toLowerCase() as MenuKey;
  if (VALID_MENUS.includes(saved)) return saved;
  const params = new URLSearchParams(window.location.search);
  const tab = (params.get("tab") || "").toLowerCase() as MenuKey;
  if (VALID_MENUS.includes(tab)) return tab;
  return "overview";
}

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const token = getToken() ?? "";
  const [activeMenu, setActiveMenuState] = useState<MenuKey>(getInitialMenu);
  const [billingSubTab, setBillingSubTab] = useState<"transactions" | "bank_config">("transactions");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Global counts for badges
  const [onlineCount, setOnlineCount] = useState(0);
  const [activeLicenseCount, setActiveLicenseCount] = useState(0);

  const setActiveMenu = (menu: MenuKey, subTab?: "transactions" | "bank_config") => {
    setActiveMenuState(menu);
    if (subTab) {
      setBillingSubTab(subTab);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("jacs.admin.activeMenu", menu);
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  };

  const fetchGlobalStats = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [sessionsRes, licensesRes] = await Promise.allSettled([
        apiRequest<any[]>("/api/v1/sessions", {}, token),
        apiRequest<any[]>("/api/v1/licenses", {}, token),
      ]);

      if (sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value)) {
        setOnlineCount(sessionsRes.value.filter((s: any) => s?.is_online).length);
      }
      if (licensesRes.status === "fulfilled" && Array.isArray(licensesRes.value)) {
        setActiveLicenseCount(licensesRes.value.filter((l: any) => l?.status === "active").length);
      }
    } catch {
      // Background count fetch error handled gracefully
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          type={toastType}
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* Account & Security Modal */}
      {showAccountModal && (
        <AccountSecurityModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          onSuccess={(msg) => showToast(msg, "success")}
        />
      )}

      {/* Left Sidebar */}
      <Sidebar
        activeMenu={activeMenu}
        billingTab={billingSubTab}
        onSelectMenu={setActiveMenu}
        onlineCount={onlineCount}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenAccountModal={() => setShowAccountModal(true)}
      />

      {/* Main Content Body */}
      <div className="main-content">
        {/* Top Navbar */}
        <Navbar
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={fetchGlobalStats}
          loading={loading}
          onOpenAccountModal={() => setShowAccountModal(true)}
          onOpenTerms={() => setActiveMenu("terms")}
          onLogout={onLogout}
          activeLicensesCount={activeLicenseCount}
          onlineSessionsCount={onlineCount}
        />

        {/* Dynamic Module Page Router */}
        <main className="content-body">
          {activeMenu === "overview" && (
            <OverviewPage
              onNavigate={setActiveMenu}
              searchTerm={searchTerm}
            />
          )}

          {activeMenu === "licenses" && (
            <LicensesPage
              searchTerm={searchTerm}
              onNotify={showToast}
            />
          )}

          {activeMenu === "sessions" && (
            <SessionsPage
              searchTerm={searchTerm}
              onNotify={showToast}
            />
          )}

          {activeMenu === "billing" && (
            <BillingPage
              initialTab={billingSubTab}
              searchTerm={searchTerm}
              onNotify={showToast}
            />
          )}

          {activeMenu === "plans" && (
            <PlansPage
              searchTerm={searchTerm}
              onNotify={showToast}
            />
          )}

          {activeMenu === "renewals" && (
            <RenewalsPage
              searchTerm={searchTerm}
              onNotify={showToast}
            />
          )}

          {activeMenu === "providers" && (
            <ProvidersPage
              searchTerm={searchTerm}
              onNotify={showToast}
            />
          )}

          {activeMenu === "telemetry" && (
            <TelemetryPage
              searchTerm={searchTerm}
              onNotify={showToast}
            />
          )}

          {activeMenu === "releases" && (
            <ReleasesPage
              onNotify={showToast}
            />
          )}

          {activeMenu === "tool_branding" && (
            <ToolConfigPage
              onNotify={showToast}
            />
          )}

          {activeMenu === "terms" && (
            <TermsPage
              onNotify={showToast}
            />
          )}

          {activeMenu === "settings" && (
            <SettingsPage
              onNotify={showToast}
              onOpenAccountModal={() => setShowAccountModal(true)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
