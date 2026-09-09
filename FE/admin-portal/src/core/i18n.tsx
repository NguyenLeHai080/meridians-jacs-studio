import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "vi" | "en" | "jp";
export type SupportedLanguage = Language;

export type TranslationDictionary = Record<string, string>;

export interface ModuleTranslations {
  vi: TranslationDictionary;
  en: TranslationDictionary;
  jp: TranslationDictionary;
}

// Global registry of module-level translations
const moduleTranslationsRegistry: Record<string, ModuleTranslations> = {};

/**
 * Registers a module's language files (vn, en, jp) into the global i18n system.
 * This allows each module in `modules/[module_name]/lang/` to be completely self-contained.
 */
export function registerModuleTranslations(moduleName: string, translations: ModuleTranslations) {
  moduleTranslationsRegistry[moduleName] = translations;
}

// Base translations (shared across all modules)
export const baseTranslations: Record<Language, TranslationDictionary> = {
  vi: {
    // Brand & App
    appName: "JACS Studio",
    appSuite: "BUSINESS SUITE",
    superAdmin: "Super Admin",
    adminSuperuser: "Quản trị viên Hệ thống",
    logout: "Đăng xuất",

    // Sidebar Headings
    headingWorkspace: "KHÔNG GIAN LÀM VIỆC",
    headingOverview: "TỔNG QUAN",
    headingClientsLegal: "KHÁCH HÀNG & BẢN QUYỀN",
    headingAiServices: "DỊCH VỤ & MÔ HÌNH AI",
    headingBillingPayment: "CREDIT & THANH TOÁN",
    headingConfigSystem: "CẤU HÌNH & HỆ THỐNG",

    // Menus
    menuOverview: "Tổng quan hệ thống",
    menuLicenses: "Bản quyền & License",
    menuSessions: "Quản lý máy người dùng",
    menuTerms: "Phân quyền & Pháp lý",
    menuProviders: "Cấu hình AI Providers",
    menuPlans: "Cấu hình gói credit",
    menuModelPricing: "Cấu hình gói model",
    menuAiKeyGrants: "Cấp Quyền & Credit Key Tool",
    menuAiRequestLogs: "Nhật ký Requests AI",
    menuApiOperations: "Báo cáo vận hành API",
    menuBilling: "Ví & dòng tiền",
    menuBankConfig: "Ngân hàng & QR",
    menuRenewals: "Giao dịch nạp SePay",
    menuToolConfig: "Cài đặt công cụ",
    menuReleases: "Bản phát hành OTA",
    menuTelemetry: "Nhật ký cảnh báo",
    menuLogs: "Vết thao tác quản trị",
    menuSettings: "Cài đặt",

    // Promo Upgrade Card
    promoUpgradeTitle: "Nâng cấp doanh nghiệp",
    promoUpgradeDesc: "Mở khóa báo cáo nâng cao và tự động hóa.",
    promoUpgradeBtn: "Nâng cấp ngay",

    // Navbar
    onlineDevicesCount: "Máy Online",
    searchPlaceholder: "Tìm kiếm khách hàng, thiết bị, HWID, bản quyền...",
    searchPlaceholderMobile: "Tìm kiếm nhanh...",
    refreshData: "Làm mới dữ liệu",
    accountSettings: "Tài khoản & Bảo mật",

    // Action buttons
    refresh: "Làm mới",
    createLicense: "Thêm người dùng",
    addTransaction: "Ghi Nhận Giao Dịch",
    addProvider: "Thêm Provider Mới",
    createManualLog: "Tạo Log Test",
    clearLogs: "Xóa toàn bộ logs",
    saveChanges: "Lưu thay đổi",
    confirm: "Xác nhận",
    cancel: "Hủy bỏ",
    delete: "Xóa",
    edit: "Sửa",
    renew: "Gia hạn",
    resetHwid: "Đổi máy",
    copy: "Copy",
    copied: "Đã copy",
    terminateSession: "Ngắt phiên",
    testLatency: "⚡ Test Latency",
    close: "Đóng",

    // Status
    statusActive: "Hoạt động",
    statusLocked: "Đã khóa",
    statusExpired: "Hết hạn",
    statusOnline: "Online",
    statusOffline: "Offline",

    // Common Messages
    noLicensesFound: "Không tìm thấy người dùng nào",
    noTransactionsFound: "Không có giao dịch nào trong khoảng thời gian này",
    noSessionsFound: "Chưa có máy khách Desktop nào đang hoạt động",
    noProvidersFound: "Chưa có provider AI nào",
    noLogsFound: "Chưa có nhật ký sự cố nào",
    noReleasesFound: "Chưa có bản phát hành nào",
  },
  en: {
    // Brand & App
    appName: "JACS Studio",
    appSuite: "BUSINESS SUITE",
    superAdmin: "Super Admin",
    adminSuperuser: "System Administrator",
    logout: "Log out",

    // Sidebar Headings
    headingWorkspace: "WORKSPACE",
    headingOverview: "OVERVIEW",
    headingClientsLegal: "CLIENTS & LICENSING",
    headingAiServices: "AI SERVICES & MODELS",
    headingBillingPayment: "CREDIT & BILLING",
    headingConfigSystem: "SYSTEM CONFIGURATION",

    // Menus
    menuOverview: "System Overview",
    menuLicenses: "License Keys",
    menuSessions: "User & Device Management",
    menuTerms: "Permissions & Terms (EULA)",
    menuProviders: "AI Providers Gateway",
    menuPlans: "Credit Plans",
    menuModelPricing: "Model Packages",
    menuAiKeyGrants: "Tool Key Permissions & Grants",
    menuAiRequestLogs: "AI Request Logs",
    menuApiOperations: "API Operations Report",
    menuBilling: "Wallet & Cashflow",
    menuBankConfig: "Bank & QR Config",
    menuRenewals: "SePay Topup Transactions",
    menuToolConfig: "Tool Settings & Branding",
    menuReleases: "OTA Releases",
    menuTelemetry: "Alerts & Telemetry Logs",
    menuLogs: "Admin Audit Trails",
    menuSettings: "Settings",

    // Promo Upgrade Card
    promoUpgradeTitle: "Enterprise Upgrade",
    promoUpgradeDesc: "Unlock advanced analytics and real-time automation.",
    promoUpgradeBtn: "Upgrade Now",

    // Navbar
    onlineDevicesCount: "Devices Online",
    searchPlaceholder: "Search clients, devices, HWID, licenses...",
    searchPlaceholderMobile: "Quick search...",
    refreshData: "Refresh Data",
    accountSettings: "Account & Security",

    // Action buttons
    refresh: "Refresh",
    createLicense: "Add User",
    addTransaction: "Record Transaction",
    addProvider: "Add Provider",
    createManualLog: "Create Test Log",
    clearLogs: "Clear all logs",
    saveChanges: "Save changes",
    confirm: "Confirm",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    renew: "Renew",
    resetHwid: "Reset HWID",
    copy: "Copy",
    copied: "Copied",
    terminateSession: "Terminate",
    testLatency: "⚡ Test Latency",
    close: "Close",

    // Status
    statusActive: "Active",
    statusLocked: "Locked",
    statusExpired: "Expired",
    statusOnline: "Online",
    statusOffline: "Offline",

    // Common Messages
    noLicensesFound: "No users found",
    noTransactionsFound: "No transactions found in this period",
    noSessionsFound: "No desktop clients currently online",
    noProvidersFound: "No AI providers configured",
    noLogsFound: "No logs or telemetry events recorded",
    noReleasesFound: "No releases found",
  },
  jp: {
    // Brand & App
    appName: "JACS Studio",
    appSuite: "BUSINESS SUITE",
    superAdmin: "Super Admin",
    adminSuperuser: "システム管理者",
    logout: "ログアウト",

    // Sidebar Headings
    headingWorkspace: "ワークスペース",
    headingOverview: "全体概要",
    headingClientsLegal: "クライアント・ライセンス",
    headingAiServices: "AIサービス・モデル設定",
    headingBillingPayment: "クレジット・決済管理",
    headingConfigSystem: "システム環境設定",

    // Menus
    menuOverview: "システム概要",
    menuLicenses: "ライセンス管理",
    menuSessions: "クライアント端末管理",
    menuTerms: "権限・利用規約 (EULA)",
    menuProviders: "AIプロバイダ設定",
    menuPlans: "クレジットプラン設定",
    menuModelPricing: "モデルパッケージ設定",
    menuAiKeyGrants: "ツールキー権限・クレジット付与",
    menuAiRequestLogs: "AIリクエストログ",
    menuApiOperations: "API運用レポート",
    menuBilling: "ウォレット・資金移動",
    menuBankConfig: "銀行口座・QRコード設定",
    menuRenewals: "SePay入金トランザクション",
    menuToolConfig: "ツール設定・ブランディング",
    menuReleases: "OTAリリース管理",
    menuTelemetry: "アラート・テレメトリログ",
    menuLogs: "管理者操作監査ログ",
    menuSettings: "システム設定",

    // Promo Upgrade Card
    promoUpgradeTitle: "エンタープライズ版へアップグレード",
    promoUpgradeDesc: "高度な分析レポートと自動化機能をアンロックします。",
    promoUpgradeBtn: "今すぐアップグレード",

    // Navbar
    onlineDevicesCount: "台 オンライン",
    searchPlaceholder: "クライアント、端末、HWID、ライセンスを検索...",
    searchPlaceholderMobile: "クイック検索...",
    refreshData: "データを更新",
    accountSettings: "アカウント・セキュリティ",

    // Action buttons
    refresh: "更新",
    createLicense: "ユーザー追加",
    addTransaction: "取引記録",
    addProvider: "プロバイダ追加",
    createManualLog: "テストログ作成",
    clearLogs: "全ログ消去",
    saveChanges: "変更を保存",
    confirm: "確認",
    cancel: "キャンセル",
    delete: "削除",
    edit: "編集",
    renew: "更新",
    resetHwid: "HWIDリセット",
    copy: "コピー",
    copied: "コピー完了",
    terminateSession: "セッション切断",
    testLatency: "⚡ レイテンシ測定",
    close: "閉じる",

    // Status
    statusActive: "有効",
    statusLocked: "ロック中",
    statusExpired: "期限切れ",
    statusOnline: "オンライン",
    statusOffline: "オフライン",

    // Common Messages
    noLicensesFound: "ユーザーが見つかりません",
    noTransactionsFound: "取引データがありません",
    noSessionsFound: "オンラインのクライアントはいません",
    noProvidersFound: "AIプロバイダが設定されていません",
    noLogsFound: "ログイベントはありません",
    noReleasesFound: "リリースが見つかりません",
  },
};

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: "vi",
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("jacs.admin.lang") as Language;
    if (saved === "vi" || saved === "en" || saved === "jp") return saved;
    return "vi";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("jacs.admin.lang", lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    // 1. Check if the key contains a dot (e.g. "licenses.title", "billing.bankConfig")
    if (key.includes(".")) {
      const [moduleName, subKey] = key.split(".", 2);
      const mod = moduleTranslationsRegistry[moduleName];
      if (mod && mod[language] && mod[language][subKey]) {
        return mod[language][subKey];
      }
    }

    // 2. Check in all registered module translations
    for (const modName of Object.keys(moduleTranslationsRegistry)) {
      const mod = moduleTranslationsRegistry[modName];
      if (mod && mod[language] && mod[language][key]) {
        return mod[language][key];
      }
    }

    // 3. Check base translations
    const baseDict = baseTranslations[language] || baseTranslations.vi;
    if (baseDict[key]) {
      return baseDict[key];
    }

    // 4. Fallback to vi base translation
    if (baseTranslations.vi[key]) {
      return baseTranslations.vi[key];
    }

    return fallback !== undefined ? fallback : key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
