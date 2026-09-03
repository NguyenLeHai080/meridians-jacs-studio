import React from "react";
import { Button } from "./Button";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination-wrapper">
      {totalItems !== undefined && (
        <span className="pagination-info">
          Hiển thị {(currentPage - 1) * (pageSize || 10) + 1} -{" "}
          {Math.min(currentPage * (pageSize || 10), totalItems)} trên {totalItems} mục
        </span>
      )}
      <div className="pagination-controls">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Trước
        </Button>
        <span className="pagination-current">
          Trang {currentPage} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
