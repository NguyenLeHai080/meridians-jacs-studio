import { Icon } from "./Icon";

export function Pagination({ total, page, pageSize, onPageChange }: { total: number; page: number; pageSize: number; onPageChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), pages);
  const start = total ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, total);
  return <div className="pagination-bar"><span className="pagination-summary">{total ? `${start}-${end} trong ${total}` : "0 bản ghi"}</span><div className="pagination-controls"><button type="button" className="pagination-button" title="Trang trước" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}><Icon name="chevron-left" size={13} /></button><span className="pagination-page">{currentPage}<i>/</i>{pages}</span><button type="button" className="pagination-button" title="Trang sau" aria-label="Trang sau" disabled={currentPage === pages} onClick={() => onPageChange(currentPage + 1)}><Icon name="chevron-right" size={13} /></button></div></div>;
}
