import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  helper,
  error,
  icon,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`form-group ${error ? "has-error" : ""} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {props.required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          id={inputId}
          className={`form-input ${icon ? "has-icon" : ""}`}
          {...props}
        />
      </div>
      {error && <span className="form-error">{error}</span>}
      {!error && helper && <span className="form-helper">{helper}</span>}
    </div>
  );
}
