import React from "react";
import { Icon } from "../../shared/Icon";
import { Pagination } from "./Pagination";

export interface Column<T> {
  key: string;
  header?: React.ReactNode;
  title?: React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string | number;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  // Card & Header Props
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  // Search Props
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  // Custom filter bar
  filters?: React.ReactNode;
  // Pagination Props
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPageSizeChange?: (size: number) => void;
  };
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  panelClassName?: string;
  tableClassName?: string;
}

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}> = ({
  icon,
  title = "Không có dữ liệu",
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center",
        color: "#94a3b8",
      }}
    >
      <div style={{ marginBottom: "0.75rem", opacity: 0.75 }}>
        {icon || <Icon name="film" size={36} />}
      </div>
      <div
        style={{
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "#cbd5e1",
          marginBottom: "0.25rem",
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: "0.8rem",
            color: "#64748b",
            maxWidth: "360px",
            marginBottom: action ? "1rem" : 0,
          }}
        >
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: "0.75rem" }}>{action}</div>}
    </div>
  );
};

export const Table: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className = "", style }) => {
  return (
    <div className="table-responsive" style={style}>
      <table className={`admin-table mf-table ${className}`}>{children}</table>
    </div>
  );
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle,
  emptyDescription,
  emptyText,
  emptyIcon,
  emptyAction,
  title,
  subtitle,
  headerActions,
  search,
  filters,
  pagination,
  onRowClick,
  className = "",
  panelClassName = "",
  tableClassName = "",
}: DataTableProps<T>) {
  const resolvedEmptyTitle = emptyTitle || emptyText || "Chưa có dữ liệu";

  return (
    <div className={`card-panel ${panelClassName} ${className}`}>
      {/* Top Header Row */}
      {(title || subtitle || headerActions || search || filters) && (
        <div className="table-panel-header" style={{ marginBottom: "1rem" }}>
          <div className="table-title-group">
            {title && (typeof title === "string" ? <h3>{title}</h3> : title)}
            {subtitle && (typeof subtitle === "string" ? <span>{subtitle}</span> : subtitle)}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            {search && (
              <div className="table-search-box">
                <Icon name="search" size={13} />
                <input
                  type="text"
                  placeholder={search.placeholder || "Tìm kiếm..."}
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                />
              </div>
            )}
            {filters}
            {headerActions}
          </div>
        </div>
      )}

      {/* Table Body */}
      <div className="table-responsive">
        <table className={`admin-table mf-table ${tableClassName}`}>
          <thead>
            <tr>
              {columns.map((col) => {
                const headerText =
                  col.header !== undefined ? col.header : col.title;
                return (
                  <th
                    key={col.key}
                    style={{
                      textAlign: col.align || "left",
                      width: col.width,
                    }}
                    className={col.className}
                  >
                    {headerText}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ textAlign: "center", padding: "3rem" }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      color: "var(--accent)",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    <Icon name="refresh" size={16} />
                    <span>Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <EmptyState
                    icon={emptyIcon}
                    title={resolvedEmptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => {
                const rowKey = keyExtractor
                  ? keyExtractor(item, rowIdx)
                  : (item as any)?.id || rowIdx;
                return (
                  <tr
                    key={rowKey}
                    onClick={
                      onRowClick ? () => onRowClick(item, rowIdx) : undefined
                    }
                    style={onRowClick ? { cursor: "pointer" } : undefined}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          textAlign: col.align || "left",
                        }}
                        className={col.className}
                      >
                        {col.render
                          ? col.render(item, rowIdx)
                          : (item as any)?.[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          pageSizeOptions={pagination.pageSizeOptions}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
}
