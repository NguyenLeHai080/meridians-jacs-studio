import React, { useState, useEffect, useCallback } from "react";
import { Building2, RefreshCw, ShieldCheck } from "lucide-react";
import type { BankConfig } from "../../../core/types";
import { BankCardGrid } from "../components/BankCardGrid";
import { BankConfigForm } from "../components/BankConfigForm";
import { SepayWebhookBox } from "../components/SepayWebhookBox";
import { billingService } from "../services/billingService";
import { Button } from "../../../components/common";
import { useI18n } from "../../../core/i18n";
import "../lang";

interface BankConfigPageProps {
  bankConfig?: BankConfig;
  setBankConfig?: (cfg: BankConfig) => void;
  onRefresh?: () => Promise<void>;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const BankConfigPage: React.FC<BankConfigPageProps> = ({
  bankConfig: propBankConfig,
  setBankConfig: propSetBankConfig,
  onRefresh: propOnRefresh,
  searchTerm: _searchTerm,
  onNotify,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [localBankConfig, setLocalBankConfig] = useState<BankConfig>(
    propBankConfig || {
      bank_name: "VietinBank",
      bank_bin: "970415",
      account_number: "109873538727",
      account_name: "NGUYEN LE HAI",
      qr_template: "compact2",
      plans_pricing: {
        "1_month": 500000,
        "3_months": 1350000,
        "6_months": 2500000,
        "1_year": 4500000,
        "lifetime": 10000000,
      },
    }
  );

  const activeBankConfig = propBankConfig || localBankConfig;

  const fetchBankConfig = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await billingService.getBankConfig();
      if (cfg) setLocalBankConfig(cfg);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!propBankConfig) {
      fetchBankConfig();
    }
  }, [propBankConfig, fetchBankConfig]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
  };

  const updateBankConfig = (next: BankConfig) => {
    if (propSetBankConfig) propSetBankConfig(next);
    else setLocalBankConfig(next);
  };

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    else await fetchBankConfig();
  };

  return (
    <div className="view-container animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div className="view-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Building2 size={24} style={{ color: "var(--primary)" }} />
            <h1 className="view-title">{t("bankConfigTitle", "Cấu Hình Ngân Hàng & VietQR")}</h1>
          </div>
          <p className="view-subtitle">
            Thiết lập tài khoản ngân hàng thụ hưởng, mã VietQR và cổng Webhook tự động hóa SePay
          </p>
        </div>
        <div className="view-actions">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            loading={loading}
            icon={<RefreshCw size={15} />}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Two-column Bank Cards Preview */}
      <BankCardGrid
        bankConfig={activeBankConfig}
        onEditBank={() => {
          const el = document.getElementById("bank-config-form-section");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        onDeleteBank={() => {
          if (confirm("Bạn có chắc muốn xóa thông tin tài khoản này?")) {
            const updated = {
              ...activeBankConfig,
              account_number: "",
              account_name: "",
            };
            updateBankConfig(updated);
            notify("Đã xóa thông tin tài khoản", "success");
          }
        }}
      />

      {/* Main Settings Section: Form & SePay Webhook */}
      <div id="bank-config-form-section" className="mf-two-col-grid">
        <BankConfigForm
          bankConfig={activeBankConfig}
          setBankConfig={updateBankConfig}
          onSuccess={(msg) => notify(msg, "success")}
          onError={(err) => notify(err, "error")}
        />

        <SepayWebhookBox
          bankConfig={activeBankConfig}
          onCopySuccess={(msg) => notify(msg, "success")}
        />
      </div>
    </div>
  );
};
