import React from "react";
import { Icon } from "../../shared/Icon";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helper,
  error,
  icon,
  clearable,
  onClear,
  containerClassName = "",
  className = "",
  id,
  value,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`form-group ${error ? "has-error" : ""} ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {props.required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className={`input-wrapper ${icon ? "has-icon" : ""}`}>
        {icon && <span className="input-icon-prefix">{icon}</span>}
        <input
          id={inputId}
          className={`form-input ${className}`}
          value={value}
          {...props}
        />
        {clearable && value && (
          <button
            type="button"
            className="input-clear-btn"
            onClick={onClear}
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>
      {error && <span className="form-error">{error}</span>}
      {!error && helper && <span className="form-helper">{helper}</span>}
    </div>
  );
};

export const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ value, onChange, placeholder = "Tìm kiếm...", className = "", style }) => {
  return (
    <div className={`search-input-wrapper ${className}`} style={style}>
      <span className="search-icon">
        <Icon name="search" size={14} />
      </span>
      <input
        type="text"
        className="search-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={() => onChange("")}
        >
          ×
        </button>
      )}
    </div>
  );
};
