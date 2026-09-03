import React, { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Đã copy",
  className = "",
  size = "sm",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  return (
    <button
      type="button"
      className={`copy-btn copy-btn-${size} ${copied ? "is-copied" : ""} ${className}`}
      onClick={handleCopy}
      title={text}
    >
      <span className="copy-icon">{copied ? "✓" : "📋"}</span>
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
