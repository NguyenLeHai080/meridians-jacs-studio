import React from "react";
import { Check2, GearFill, Sliders } from "react-bootstrap-icons";
import type { ToolPreferences } from "../../core/types";
import { useSettingsManagement } from "./hooks/useSettingsManagement";
import { WorkspaceSettingsCard } from "./components/WorkspaceSettingsCard";
import { MediaEngineCard } from "./components/MediaEngineCard";
import { ByokProvidersSection } from "./components/ByokProvidersSection";
import { CloudModelHub } from "./components/CloudModelHub";
import { ProviderConfigModal } from "./components/ProviderConfigModal";
import { ProviderTestResultModal } from "./components/ProviderTestResultModal";
import {
  DEFAULT_CLOUD_MODELS,
  PROVIDER_CONFIGS,
  type CloudModelItem,
} from "./constants/providerConfigs";

export { DEFAULT_CLOUD_MODELS, PROVIDER_CONFIGS };
export type { CloudModelItem };

interface SettingsPageProps {
  preferences: ToolPreferences;
  onPreferencesChanged: (preferences: ToolPreferences) => void;
}

export function SettingsPage({ preferences, onPreferencesChanged }: SettingsPageProps) {
  const {
    localPreferences,
    providers,
    capabilities,
    providerForm,
    setProviderForm,
    isModalOpen,
    setIsModalOpen,
    testingId,
    providerMessage,
    providerError,
    selectedProviderKey,
    setSelectedProviderKey,
    cloudModels,
    lastSyncedTime,
    updateState,
    loaded,
    testResult,
    setTestResult,
    isLoggingInWeb,
    showApiKey,
    setShowApiKey,
    syncingCloud,
    testingModelId,
    cloudModelTestResults,
    loadSettings,
    update,
    chooseOutputFolder,
    clearCache,
    checkForUpdate,
    installUpdate,
    saveProvider,
    testProvider,
    handleWebSessionLogin,
    deleteProvider,
    syncWithCloudAdmin,
    testCloudModel,
    selectCloudModelForAnalysis,
    configureBYOKForCloudModel,
    openAddProviderModal,
    editProvider,
  } = useSettingsManagement(preferences, onPreferencesChanged);

  return (
    <div
      className="settings-workspace-root animate-fade-in"
      style={{
        padding: "10px 16px 96px 16px",
        width: "100%",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: "100%",
        flex: "1 1 0%",
        overflowY: "auto",
      }}
    >
      {/* 1. Header & Synchronized Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "10px",
          flexShrink: 0,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              padding: "2px 8px",
              borderRadius: "5px",
              fontSize: "10.5px",
              fontWeight: 800,
              color: "#fbbf24",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "3px",
            }}
          >
            <Sliders size={10} /> SYSTEM & PREFERENCES · CÀI ĐẶT TOOL
          </div>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#f8fafc",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <GearFill size={18} color="#fbbf24" />
            Cài Đặt Hệ Thống & Nhà Cung Cấp AI (BYOK)
          </h1>
          <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0" }}>
            Quản lý workspace, thư mục output video, quyền riêng tư, engine render FFmpeg và các API
            Key nhà cung cấp AI.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void loadSettings()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f8fafc",
              padding: "7px 14px",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Check2 size={13} color="#34d399" /> {loaded ? "Đã đồng bộ" : "Đang tải..."}
          </button>
        </div>
      </div>

      {providerMessage && <p className="form-success">{providerMessage}</p>}
      {providerError && <p className="form-error">{providerError}</p>}

      {/* 2. Top Settings Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "12px",
          marginBottom: "12px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <WorkspaceSettingsCard
          localPreferences={localPreferences}
          update={update}
          chooseOutputFolder={chooseOutputFolder}
          clearCache={clearCache}
        />

        <MediaEngineCard
          localPreferences={localPreferences}
          capabilities={capabilities}
          update={update}
          updateState={updateState}
          checkForUpdate={checkForUpdate}
          installUpdate={installUpdate}
        />
      </div>

      {/* 3. BYOK Section */}
      <ByokProvidersSection
        providers={providers}
        testingId={testingId}
        testProvider={testProvider}
        editProvider={editProvider}
        deleteProvider={deleteProvider}
        openAddProviderModal={openAddProviderModal}
      />

      {/* 4. Cloud Model Hub */}
      <CloudModelHub
        cloudModels={cloudModels}
        lastSyncedTime={lastSyncedTime}
        syncingCloud={syncingCloud}
        syncWithCloudAdmin={syncWithCloudAdmin}
        testingModelId={testingModelId}
        cloudModelTestResults={cloudModelTestResults}
        testCloudModel={testCloudModel}
        selectCloudModelForAnalysis={selectCloudModelForAnalysis}
        configureBYOKForCloudModel={configureBYOKForCloudModel}
      />

      {/* Modals */}
      <ProviderConfigModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setProviderForm(null);
        }}
        onSubmit={saveProvider}
        providerForm={providerForm}
        setProviderForm={setProviderForm}
        selectedPreset={selectedProviderKey}
        setSelectedPreset={setSelectedProviderKey}
        showApiKey={showApiKey}
        setShowApiKey={setShowApiKey}
        isLoggingInWeb={isLoggingInWeb}
        handleWebSessionLogin={handleWebSessionLogin}
      />

      <ProviderTestResultModal
        testResult={testResult}
        onClose={() => setTestResult(null)}
      />
    </div>
  );
}
