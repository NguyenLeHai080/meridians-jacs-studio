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

    // Sidebar Headings & Menus
    workspaceSection: "KHÔNG GIAN LÀM VIỆC",
    accessSection: "TÀI KHOẢN & TRUY CẬP",
    billingSection: "CREDIT & THANH TOÁN",
    serviceSection: "CẤU HÌNH DỊCH VỤ",
    operationSection: "VẬN HÀNH",

    menuOverview: "Tổng quan",
    menuLicenses: "Quản lý người dùng",
    menuSessions: "Máy khách Online",
    menuBilling: "Ví & dòng tiền",
    menuBankConfig: "Ngân hàng & QR",
    menuPlans: "Cấu hình Credit",
    menuRenewals: "Giao dịch nạp SePay",
    menuProviders: "AI Providers Gateway",
    menuTelemetry: "Nhật ký hệ thống",
    menuReleases: "Bản phát hành OTA",
    menuToolBranding: "Cài đặt công cụ",
    menuTerms: "Phân quyền",
    menuSettings: "Cài đặt hệ thống",

    // Topbar
    searchPlaceholder: "Tìm nhân viên, dự án, hợp đồng...",
    langVi: "Tiếng Việt",
    langEn: "English",
    langJp: "日本語",
    quickActionCreate: "Tạo mới",
    quickActionCreateLicense: "Thêm người dùng",
    helpSupport: "Trợ giúp & Hỗ trợ",
    notifications: "Thông báo",

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

    // Sidebar Headings & Menus
    workspaceSection: "WORKSPACE",
    accessSection: "ACCOUNTS & ACCESS",
    billingSection: "CREDIT & BILLING",
    serviceSection: "SERVICE CONFIGURATION",
    operationSection: "OPERATIONS",

    menuOverview: "Overview",
    menuLicenses: "User Management",
    menuSessions: "Online Clients",
    menuBilling: "Wallet & Cashflow",
    menuBankConfig: "Bank & QR",
    menuPlans: "Credit Plans",
    menuRenewals: "SePay Topups",
    menuProviders: "AI Providers Gateway",
    menuTelemetry: "System Logs",
    menuReleases: "OTA Releases",
    menuToolBranding: "Tool Settings",
    menuTerms: "Permissions & Terms",
    menuSettings: "System Settings",

    // Topbar
    searchPlaceholder: "Search users, projects, keys...",
    langVi: "Tiếng Việt",
    langEn: "English",
    langJp: "日本語",
    quickActionCreate: "Create New",
    quickActionCreateLicense: "Add User",
    helpSupport: "Help & Support",
    notifications: "Notifications",

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

    // Sidebar Headings & Menus
    workspaceSection: "ワークスペース",
    accessSection: "アカウントとアクセス",
    billingSection: "クレジットと決済",
    serviceSection: "サービス設定",
    operationSection: "運用管理",

    menuOverview: "概要",
    menuLicenses: "ユーザー管理",
    menuSessions: "オンラインクライアント",
    menuBilling: "ウォレットと入出金",
    menuBankConfig: "銀行とQR決済",
    menuPlans: "プラン設定",
    menuRenewals: "SePay入金トランザクション",
    menuProviders: "AIゲートウェイ",
    menuTelemetry: "システムログ",
    menuReleases: "OTAリリース",
    menuToolBranding: "ツール設定",
    menuTerms: "権限と規約",
    menuSettings: "システム設定",

    // Topbar
    searchPlaceholder: "ユーザー、プロジェクト、キーを検索...",
    langVi: "Tiếng Việt",
    langEn: "English",
    langJp: "日本語",
    quickActionCreate: "新規作成",
    quickActionCreateLicense: "ユーザー追加",
    helpSupport: "ヘルプとサポート",
    notifications: "通知",

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
