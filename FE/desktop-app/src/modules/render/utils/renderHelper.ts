export function getStageLabel(stage?: string): string {
  const map: Record<string, string> = {
    queued: "Đang xếp hàng",
    downloading: "Đang tải video",
    probing: "Đang đọc metadata",
    analyzing: "Đang phân tích",
    outlining: "Đang lên outline",
    script_review: "Đang duyệt script",
    generating_voice: "Đang lồng tiếng AI",
    matching_scenes: "Đang khớp phân cảnh",
    timeline_review: "Đang kiểm tra timeline",
    rendering: "Đang render video",
    qa: "Đang kiểm tra chất lượng",
    completed: "Hoàn tất",
    failed: "Thất bại",
    cancelled: "Đã hủy",
  };
  return map[stage || ""] || stage || "Chờ xử lý";
}
