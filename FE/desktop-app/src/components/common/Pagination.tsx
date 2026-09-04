import React from "react";
import { Icon } from "../../shared/Icon";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  className?: string;
  showItemCount?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  className = "",
  showItemCount = true,
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems <= (pageSize || 10))) {
    return null;
  }

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages.map((p, idx) => {
      if (p === "...") {
        return (
          <span key={`dots-${idx}`} className="pagination-ellipsis">
            ...
          </span>
        );
      }
      const pageNum = Number(p);
      const isActive = pageNum === currentPage;
      return (
        <button
          key={pageNum}
          type="button"
          className={`pagination-page-btn ${isActive ? "active" : ""}`}
          onClick={() => onPageChange(pageNum)}
        >
          {pageNum}
        </button>
      );
    });
  };

  return (
    <div className={`pagination-container ${className}`}>
      {showItemCount && totalItems !== undefined && pageSize && (
        <div className="pagination-info">
          <span>
            Hiển thị{" "}
            <strong>
              {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-
              {Math.min(totalItems, currentPage * pageSize)}
            </strong>{" "}
            trong tổng số <strong>{totalItems}</strong> mục
          </span>
          {onPageSizeChange && (
            <div className="pagination-size-selector">
              <label>Số mục:</label>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-nav-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Trang trước"
        >
          <Icon name="chevron-left" size={14} />
        </button>

        {renderPageNumbers()}

        <button
          type="button"
          className="pagination-nav-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Trang sau"
        >
          <Icon name="chevron-right" size={14} />
        </button>
      </div>
    </div>
  );
};
