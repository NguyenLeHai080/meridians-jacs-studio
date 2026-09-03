import React from "react";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helper?: string;
  error?: string;
  options?: SelectOption[];
}

export function Select({
  label,
  helper,
  error,
  options,
  children,
  className = "",
  id,
  ...props
}: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`form-group ${error ? "has-error" : ""} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label} {props.required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="select-wrapper">
        <select id={selectId} className="form-select" {...props}>
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span className="select-arrow">▼</span>
      </div>
      {error && <span className="form-error">{error}</span>}
      {!error && helper && <span className="form-helper">{helper}</span>}
    </div>
  );
}
