import type { JobStatus } from "../core/types";
const labels: Record<JobStatus, string> = { queued: "Đang chờ", running: "Đang chạy", completed: "Hoàn tất", failed: "Lỗi" };
export function StatusPill({ status }: { status: JobStatus }) { return <span className={`status-pill status-${status}`}><span className="status-dot" />{labels[status]}</span>; }
