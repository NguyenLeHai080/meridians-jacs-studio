import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  helper?: string;
  error?: string;
  options?: (SelectOption | string)[];
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  containerClassName?: string;
  variant?: "form" | "filter" | "clean";
}

export function Select({
  label,
  helper,
  error,
  options,
  placeholder,
  size = "md",
  icon,
  children,
  className = "",
  containerClassName = "",
  variant = "form",
  id,
  ...props
}: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const formattedOptions: SelectOption[] = options
    ? options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt))
    : [];

  const selectNode = (
    <div className={`select-wrapper select-${size} ${icon ? "has-icon" : ""} ${variant === "filter" ? "filter-select-wrap" : ""}`}>
      {icon && <span className="select-icon-prefix">{icon}</span>}
      <select
        id={selectId}
        className={`form-select ${variant === "filter" ? "filter-select" : ""} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {formattedOptions.length > 0
          ? formattedOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <span className="select-arrow">
        <ChevronDown size={14} />
      </span>
    </div>
  );

  if (variant === "filter" || variant === "clean" || (!label && !helper && !error)) {
    return (
      <div className={`select-container ${containerClassName}`}>
        {selectNode}
      </div>
    );
  }

  return (
    <div className={`form-group ${error ? "has-error" : ""} ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label} {props.required && <span className="text-danger">*</span>}
        </label>
      )}
      {selectNode}
      {error && <span className="form-error">{error}</span>}
      {!error && helper && <span className="form-helper">{helper}</span>}
    </div>
  );
}

export function FilterSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn lọc...",
  className = "",
  style,
}: {
  options: (SelectOption | string)[];
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const formattedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  return (
    <div className="status-select-wrap" style={style}>
      <select
        value={value}
        onChange={onChange}
        className={`filter-select ${className}`}
      >
        {placeholder && !formattedOptions.some(o => o.value === "") && (
          <option value="">{placeholder}</option>
        )}
        {formattedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="select-arrow">
        <ChevronDown size={13} />
      </span>
    </div>
  );
}
