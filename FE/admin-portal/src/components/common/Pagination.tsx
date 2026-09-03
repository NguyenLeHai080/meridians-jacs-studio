import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  onPageSizeChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const start = totalItems !== undefined ? (currentPage - 1) * pageSize + 1 : 0;
  const end = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : 0;

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className="pagination-wrapper"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.75rem",
        marginTop: "1.25rem",
        padding: "0.75rem 1rem",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
      }}
    >
      {/* Left: Summary and Page Size */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        {totalItems !== undefined && (
          <span style={{ fontSize: "0.84rem", color: "#475569" }}>
            Hiển thị <strong style={{ color: "#0f172a", fontWeight: 700 }}>{start}-{end}</strong> trong tổng số{" "}
            <strong style={{ color: "#f95738", fontWeight: 800 }}>{totalItems}</strong> bản ghi
          </span>
        )}

        {onPageSizeChange && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.82rem", color: "#64748b" }}>
            <span>Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                borderRadius: "6px",
                padding: "3px 8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} style={{ background: "#ffffff", color: "#0f172a" }}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {/* First Page */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="Trang đầu"
          style={{
            padding: "5px 7px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            color: currentPage <= 1 ? "#cbd5e1" : "#334155",
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            transition: "all 0.15s ease",
          }}
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Trang trước"
          style={{
            padding: "5px 7px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            color: currentPage <= 1 ? "#cbd5e1" : "#334155",
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            transition: "all 0.15s ease",
          }}
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page Pills */}
        {getPageNumbers().map((num, i) => {
          if (num === "...") {
            return (
              <span key={`dots-${i}`} style={{ padding: "0 4px", color: "#94a3b8", fontSize: "0.82rem" }}>
                ...
              </span>
            );
          }
          const isAct = num === currentPage;
          return (
            <button
              key={`page-${num}`}
              type="button"
              onClick={() => onPageChange(Number(num))}
              style={{
                minWidth: "32px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.82rem",
                fontWeight: isAct ? 800 : 600,
                background: isAct ? "#f95738" : "#ffffff",
                border: isAct ? "1px solid #f95738" : "1px solid #e2e8f0",
                borderRadius: "6px",
                color: isAct ? "#ffffff" : "#334155",
                cursor: "pointer",
                boxShadow: isAct ? "0 2px 6px rgba(249, 87, 56, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {num}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Trang sau"
          style={{
            padding: "5px 7px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            color: currentPage >= totalPages ? "#cbd5e1" : "#334155",
            cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            transition: "all 0.15s ease",
          }}
        >
          <ChevronRight size={15} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Trang cuối"
          style={{
            padding: "5px 7px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            color: currentPage >= totalPages ? "#cbd5e1" : "#334155",
            cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            transition: "all 0.15s ease",
          }}
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}
