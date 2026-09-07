import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[JACS App ErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            maxWidth: "600px",
            margin: "40px auto",
            background: "#111827",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "12px",
            color: "#f8fafc",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#f87171",
              fontSize: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            ⚠️
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 10px", color: "#f8fafc" }}>
            {this.props.fallbackTitle || "Đã xảy ra lỗi khi tải trang này"}
          </h2>
          <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 18px" }}>
            Hệ thống đã tự động bảo vệ tool để tránh mất dữ liệu công việc của bạn.
          </p>
          {this.state.error && (
            <div
              style={{
                background: "#080b12",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#fca5a5",
                textAlign: "left",
                maxHeight: "140px",
                overflowY: "auto",
                marginBottom: "20px",
              }}
            >
              {this.state.error.toString()}
            </div>
          )}
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                color: "#12151f",
                border: "none",
                borderRadius: "7px",
                padding: "8px 18px",
                fontSize: "12.5px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              🔄 Thử Tải Lại Trang
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                borderRadius: "7px",
                padding: "8px 18px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Tải Lại Ứng Dụng
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
