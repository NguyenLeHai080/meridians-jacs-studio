import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "vi" | "en";

export const translations = {
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

    menuOverview: "Tổng quan hệ thống",
    menuLicenses: "Quản lý License Keys",
    menuSessions: "Máy khách Desktop",
    menuBilling: "Doanh thu & Dòng tiền",
    menuPlans: "Quản lý gói cước",
    menuRenewals: "Quản lý gia hạn",
    menuProviders: "AI Providers Gateway",
    menuTelemetry: "Báo cáo vận hành & Logs",
    menuReleases: "Bản phát hành & OTA",
    menuSettings: "Cài đặt hệ thống",

    // Topbar
    searchPlaceholder: "Tìm kiếm nhân viên, dự án, license, khách hàng...",
    langVi: "Tiếng Việt",
    langEn: "English",
    quickActionCreateLicense: "Cấp License Mới",
    helpSupport: "Trợ giúp & Hỗ trợ",
    notifications: "Thông báo",

    // Page Headers
    overviewTitle: "Tổng quan hệ thống 👋",
    overviewSubtitle: "Dữ liệu tài chính và vận hành API theo thời gian thực.",
    licensesTitle: "Quản lý License Keys 🔑",
    licensesSubtitle: "Quản lý cấp phát, phân quyền, khóa/mở khóa, gia hạn và đổi mã máy.",
    sessionsTitle: "Giám sát Desktop Realtime 💻",
    sessionsSubtitle: "Theo dõi tín hiệu heartbeat và thiết bị máy khách online.",
    billingTitle: "Doanh thu & Dòng tiền 💳",
    billingSubtitle: "Hồ sơ thu chi, lịch sử nạp tiền, phân bổ gói và doanh thu thời gian thực.",
    providersTitle: "Cấu hình AI Gateway 🤖",
    providersSubtitle: "Quản lý kết nối OpenAI, Gemini và Custom Endpoints.",
    telemetryTitle: "Báo cáo vận hành & Logs 📄",
    telemetrySubtitle: "Báo cáo sự cố, nhật ký phân tích và telemetry từ Desktop Tool.",
    settingsTitle: "Cài đặt & Quản trị hệ thống ⚙️",
    settingsSubtitle: "Cấu hình thương hiệu studio, mặc định license, sao lưu dữ liệu và môi trường runtime.",

    // Action buttons
    refresh: "Làm mới",
    createLicense: "Cấp License Mới",
    addTransaction: "Thêm Giao Dịch",
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

    // KPI Cards
    kpiBalanceLabel: "Số dư API / Doanh thu tháng",
    kpiBalanceSub1: "↗ Trực tiếp",
    kpiBalanceSub2: "Số dư khả dụng",
    kpiTotalRevenueLabel: "Tổng tiền nạp / Doanh thu",
    kpiTotalRevenueSub1: "↗ Ví",
    kpiTotalRevenueSub2: "Theo giao dịch ví",
    kpiActiveKeysLabel: "License đang hoạt động",
    kpiActiveKeysSub1: "hết hạn / bị khóa",
    kpiActiveKeysSub2: "tổng số key",
    kpiDesktopOnlineLabel: "Máy khách Desktop Online",
    kpiDesktopOnlineSub1: "online",
    kpiDesktopOnlineSub2: "thiết bị đã cài",

    // Charts
    chartApiUsageTitle: "Chi phí và request API",
    chartApiUsageSubtitle: "Dựa trên request log 7 ngày gần nhất",
    chartCostLegend: "Chi phí API",
    chartRequestLegend: "Tổng API request",
    chartKeyStatusTitle: "Trạng thái API key",
    chartKeyStatusSub: "key đang quản lý",
    donutStatusActive: "Đang hoạt động",
    donutStatusOther: "Khác / Hết hạn",
    donutStatusLifetime: "Bản quyền Vĩnh viễn",

    // Days of week
    dayThu: "Thứ 5",
    dayFri: "Thứ 6",
    daySat: "Thứ 7",
    daySun: "CN",
    dayMon: "Thứ 2",
    dayTue: "Thứ 3",
    dayWed: "Thứ 4",

    // Table Headers
    thCustomer: "Khách hàng & Logo",
    thKeyHwid: "Key Hint & Device ID (HWID)",
    thExpiryLimits: "Hạn Dùng & Giới Hạn",
    thDeviceLastSeen: "Thiết Bị & Lần Cuối Online",
    thStatus: "Trạng Thái",
    thActions: "Thao Tác",
    thTxId: "Mã Giao Dịch",
    thPlan: "Gói Dịch Vụ",
    thTxType: "Loại Giao Dịch",
    thAmount: "Số Tiền",
    thMethod: "Phương Thức",
    thTime: "Thời Gian",
    thIp: "Địa Chỉ IP",
    thOsVersion: "Hệ Điều Hành & Bản Tool",

    // Filter & Statuses
    allStatus: "Tất cả trạng thái",
    statusActive: "Đang hoạt động (Active)",
    statusBlocked: "Đang bị khóa (Blocked)",
    statusExpired: "Đã hết hạn (Expired)",
    statusOnline: "Online",
    statusOffline: "Offline",
    lifetime: "Vĩnh viễn",
    unlimited: "Không giới hạn",

    // Empty states
    noLicensesFound: "Không tìm thấy license nào phù hợp.",
    noSessionsFound: "Chưa có thiết bị nào kích hoạt và gửi heartbeat.",
    noTransactionsFound: "Chưa có giao dịch nạp tiền nào được ghi nhận.",
    noProvidersFound: "Chưa có provider nào được cấu hình.",
    noLogsFound: "Không có sự cố nào được ghi nhận. Hệ thống vận hành hoàn toàn ổn định.",

    // Modals
    modalCreateLicenseTitle: "Cấp License Khách Hàng Mới",
    modalEditLicenseTitle: "Chỉnh Sửa Thông Tin License",
    modalRenewLicenseTitle: "Gia Hạn Bản Quyền License",
    modalResetHwidTitle: "Đổi Mã Máy (HWID Reset)",
    modalDeleteLicenseTitle: "Xác Nhận Xóa License",
    modalCreatedSuccessTitle: "Cấp License Thành Công!",
    modalAddTransactionTitle: "Thêm Giao Dịch / Nạp Tiền Thủ Công",
    modalEditProviderTitle: "Chỉnh Sửa AI Provider",
    modalAddProviderTitle: "Thêm AI Provider Mới",
    modalDeleteConfirmText: "Bạn có chắc chắn muốn xóa không? Hành động này không thể hoàn tác.",

    // Form fields
    fieldCustomerName: "Tên Khách Hàng / Studio *",
    fieldContact: "Liên Hệ (Email / SĐT) *",
    fieldHwid: "Mã Máy Tính Thiết Bị (HWID) *",
    fieldOldHwid: "Mã Máy Tính Cũ (HWID)",
    fieldNewHwid: "Mã Máy Tính Mới (HWID) *",
    fieldDays: "Thời Hạn (Số Ngày)",
    fieldMaxJobs: "Giới Hạn Render Jobs/Ngày",
    fieldBillAmount: "Số Tiền Thu (VND)",
    fieldPlanName: "Tên Gói Dịch Vụ",
    fieldLogoUrl: "Link Logo Thương Hiệu Khách Hàng (URL)",
    fieldNotes: "Ghi Chú Đơn Hàng",
    fieldReason: "Lý Do",
    fieldPaymentMethod: "Phương Thức Thanh Toán",
    fieldTxType: "Loại Giao Dịch",
    fieldProviderName: "Tên hiển thị",
    fieldType: "Loại Provider",
    fieldBaseUrl: "Base URL",
    fieldModel: "Model Vision & Text",
    fieldApiKey: "API Key",
    fieldCapabilities: "Khả Năng / Tính Năng",

    // Login Page
    loginTitle: "Đăng Nhập Quản Trị Hệ Thống",
    loginSubtitle: "Nhập thông tin quản trị viên để truy cập bảng điều khiển",
    loginEmailLabel: "Email Quản Trị",
    loginPasswordLabel: "Mật Khẩu",
    loginBtn: "Đăng Nhập Quản Trị",
    loginSecurityBadge: "Bảo mật End-to-End với JWT Session Token",
    loginError: "Email hoặc mật khẩu không chính xác",
  },
  en: {
    // Brand & App
    appName: "JACS Studio",
    appSuite: "BUSINESS SUITE",
    superAdmin: "Super Admin",
    adminSuperuser: "System Administrator",
    logout: "Sign Out",

    // Sidebar Headings & Menus
    workspaceSection: "WORKSPACE",
    accessSection: "ACCOUNTS & ACCESS",
    billingSection: "CREDIT & BILLING",
    serviceSection: "SERVICE CONFIGURATION",
    operationSection: "OPERATIONS",

    menuOverview: "System Overview",
    menuLicenses: "License Keys Manager",
    menuSessions: "Desktop Clients",
    menuBilling: "Revenue & Cashflow",
    menuPlans: "Plans & Pricing",
    menuRenewals: "Subscriptions & Renewals",
    menuProviders: "AI Providers Gateway",
    menuTelemetry: "Incident Reports & Logs",
    menuReleases: "Releases & OTA Updates",
    menuSettings: "System Settings",

    // Topbar
    searchPlaceholder: "Search users, projects, licenses, clients...",
    langVi: "Tiếng Việt",
    langEn: "English",
    quickActionCreateLicense: "Issue New License",
    helpSupport: "Help & Support",
    notifications: "Notifications",

    // Page Headers
    overviewTitle: "System Overview 👋",
    overviewSubtitle: "Real-time financial and API operational analytics.",
    licensesTitle: "License Keys Management 🔑",
    licensesSubtitle: "Manage issuance, permissions, lock/unlock, renewal and HWID resets.",
    sessionsTitle: "Real-time Desktop Monitoring 💻",
    sessionsSubtitle: "Monitor heartbeat signals and active desktop client sessions.",
    billingTitle: "Revenue & Cashflow 💳",
    billingSubtitle: "Top-up history, plan allocations and real-time revenue analytics.",
    providersTitle: "AI Gateway Configuration 🤖",
    providersSubtitle: "Manage OpenAI, Gemini and Custom Endpoints.",
    telemetryTitle: "Operations & Incident Logs 📄",
    telemetrySubtitle: "Real-time error logs, analysis telemetry from Desktop tools.",
    settingsTitle: "System & Administration Settings ⚙️",
    settingsSubtitle: "Studio branding, default limits, database backup/restore and runtime diagnostics.",

    // Action buttons
    refresh: "Refresh",
    createLicense: "Issue License",
    addTransaction: "Add Transaction",
    addProvider: "Add Provider",
    createManualLog: "Create Test Log",
    clearLogs: "Clear all logs",
    saveChanges: "Save Changes",
    confirm: "Confirm",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    renew: "Renew",
    resetHwid: "Reset HWID",
    copy: "Copy",
    copied: "Copied",
    terminateSession: "Terminate Session",
    testLatency: "⚡ Test Latency",
    close: "Close",

    // KPI Cards
    kpiBalanceLabel: "API Balance / Monthly Revenue",
    kpiBalanceSub1: "↗ Direct",
    kpiBalanceSub2: "Available Balance",
    kpiTotalRevenueLabel: "Total Deposits / Revenue",
    kpiTotalRevenueSub1: "↗ Wallet",
    kpiTotalRevenueSub2: "By wallet transactions",
    kpiActiveKeysLabel: "Active Licenses",
    kpiActiveKeysSub1: "expired / blocked",
    kpiActiveKeysSub2: "total licenses",
    kpiDesktopOnlineLabel: "Online Desktop Clients",
    kpiDesktopOnlineSub1: "online",
    kpiDesktopOnlineSub2: "installed devices",

    // Charts
    chartApiUsageTitle: "API Costs & Requests",
    chartApiUsageSubtitle: "Based on 7-day API request telemetry",
    chartCostLegend: "API Cost",
    chartRequestLegend: "Total API Requests",
    chartKeyStatusTitle: "API Key Status",
    chartKeyStatusSub: "keys managed",
    donutStatusActive: "Active",
    donutStatusOther: "Other / Expired",
    donutStatusLifetime: "Lifetime License",

    // Days of week
    dayThu: "Thu",
    dayFri: "Fri",
    daySat: "Sat",
    daySun: "Sun",
    dayMon: "Mon",
    dayTue: "Tue",
    dayWed: "Wed",

    // Table Headers
    thCustomer: "Customer & Logo",
    thKeyHwid: "Key Hint & Device ID (HWID)",
    thExpiryLimits: "Expiry & Limits",
    thDeviceLastSeen: "Device & Last Seen",
    thStatus: "Status",
    thActions: "Actions",
    thTxId: "Transaction ID",
    thPlan: "Plan Name",
    thTxType: "Transaction Type",
    thAmount: "Amount",
    thMethod: "Method",
    thTime: "Timestamp",
    thIp: "IP Address",
    thOsVersion: "OS & App Version",

    // Filter & Statuses
    allStatus: "All Statuses",
    statusActive: "Active",
    statusBlocked: "Blocked",
    statusExpired: "Expired",
    statusOnline: "Online",
    statusOffline: "Offline",
    lifetime: "Lifetime",
    unlimited: "Unlimited",

    // Empty states
    noLicensesFound: "No licenses found matching the filter.",
    noSessionsFound: "No desktop clients have connected yet.",
    noTransactionsFound: "No billing transactions recorded.",
    noProvidersFound: "No AI providers configured yet.",
    noLogsFound: "No incidents recorded. System is operating normally.",

    // Modals
    modalCreateLicenseTitle: "Issue New Customer License",
    modalEditLicenseTitle: "Edit License Information",
    modalRenewLicenseTitle: "Renew License Validity",
    modalResetHwidTitle: "Reset Device ID (HWID)",
    modalDeleteLicenseTitle: "Confirm License Deletion",
    modalCreatedSuccessTitle: "License Issued Successfully!",
    modalAddTransactionTitle: "Manual Transaction / Top-up",
    modalEditProviderTitle: "Edit AI Provider",
    modalAddProviderTitle: "Add New AI Provider",
    modalDeleteConfirmText: "Are you sure you want to delete this item? This action cannot be undone.",

    // Form fields
    fieldCustomerName: "Customer / Studio Name *",
    fieldContact: "Contact (Email / Phone) *",
    fieldHwid: "Device ID (HWID) *",
    fieldOldHwid: "Old Device ID (HWID)",
    fieldNewHwid: "New Device ID (HWID) *",
    fieldDays: "Duration (Days)",
    fieldMaxJobs: "Daily Render Jobs Limit",
    fieldBillAmount: "Billing Amount",
    fieldPlanName: "Plan Name",
    fieldLogoUrl: "Customer Brand Logo URL",
    fieldNotes: "Order Notes",
    fieldReason: "Reason",
    fieldPaymentMethod: "Payment Method",
    fieldTxType: "Transaction Type",
    fieldProviderName: "Display Name",
    fieldType: "Provider Type",
    fieldBaseUrl: "Base URL",
    fieldModel: "Vision & Text Model",
    fieldApiKey: "API Key",
    fieldCapabilities: "Capabilities",

    // Login Page
    loginTitle: "System Administration Login",
    loginSubtitle: "Sign in with administrator credentials to access the suite",
    loginEmailLabel: "Admin Email",
    loginPasswordLabel: "Password",
    loginBtn: "Sign In to Dashboard",
    loginSecurityBadge: "End-to-End Encrypted with JWT Session Token",
    loginError: "Invalid email or password",
  },
};

export type TranslationKey = keyof typeof translations.vi;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, defaultText?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "vi",
  setLanguage: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("jacs_admin_lang");
    return saved === "en" || saved === "vi" ? saved : "vi";
  });

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem("jacs_admin_lang", lang);
  }

  function t(key: TranslationKey, defaultText?: string): string {
    const langDict = translations[language];
    if (langDict && key in langDict) {
      return (langDict as Record<string, string>)[key];
    }
    return defaultText || key;
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
