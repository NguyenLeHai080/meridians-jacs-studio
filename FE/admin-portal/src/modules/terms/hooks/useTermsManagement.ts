import { useState, useEffect, useMemo, useCallback } from "react";
import type { EulaDocument, EulaStatusFilter, TermsMetrics } from "../types";
import { termsService } from "../services/termsService";
import { showToast } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";

export interface UseTermsManagementOptions {
  externalSearch?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export interface EulaFormData {
  code: string;
  title: string;
  version: string;
  category: EulaDocument["category"];
  status: EulaDocument["status"];
  full_content: string;
  summary: string;
  requires_hwid_binding: boolean;
  requires_content_disclaimer: boolean;
  legal_basis_text: string;
}

const INITIAL_FORM_DATA: EulaFormData = {
  code: `JACS-EULA-${new Date().getFullYear()}-v3.0`,
  title: "THỎA THUẬN CẤP PHÉP SỬ DỤNG VÀ ĐIỀU KHOẢN DỊCH VỤ PHẦN MỀM JACS STUDIO",
  version: "v3.0.0",
  category: "enterprise",
  status: "draft",
  full_content: "",
  summary: "Thỏa thuận cấp phép bản quyền và điều khoản dịch vụ chính thức.",
  requires_hwid_binding: true,
  requires_content_disclaimer: true,
  legal_basis_text: "Bộ luật Dân sự 2015\nLuật Sở hữu trí tuệ\nLuật Giao dịch điện tử 2023\nNghị định 30/2020/NĐ-CP\nNghị định 13/2023/NĐ-CP",
};

export const useTermsManagement = ({ externalSearch = "", onNotify }: UseTermsManagementOptions = {}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [documents, setDocuments] = useState<EulaDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [statusFilter, setStatusFilter] = useState<EulaStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRbacModal, setShowRbacModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<EulaDocument | null>(null);

  // Editor Form State
  const [formData, setFormData] = useState<EulaFormData>(INITIAL_FORM_DATA);

  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      if (onNotify) onNotify(msg, type);
      else showToast(msg, type);
    },
    [onNotify]
  );

  // Load documents from Database via Backend API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await termsService.getDocuments();
      setDocuments(docs);
    } catch {
      notify(t("toastSaveError", "Không thể tải danh sách điều khoản từ cơ sở dữ liệu"), "error");
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync external search
  useEffect(() => {
    if (externalSearch) {
      setSearchQuery(externalSearch);
    }
  }, [externalSearch]);

  // Active document
  const activeDocument = useMemo(() => {
    return documents.find((d) => d.status === "active") || documents[0] || null;
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.code.toLowerCase().includes(q) ||
        doc.version.toLowerCase().includes(q) ||
        (doc.full_content && doc.full_content.toLowerCase().includes(q)) ||
        (doc.summary && doc.summary.toLowerCase().includes(q)) ||
        doc.category.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && doc.status === "active") ||
        (statusFilter === "draft" && doc.status === "draft") ||
        (statusFilter === "archived" && doc.status === "archived");

      return matchSearch && matchStatus;
    });
  }, [documents, searchQuery, statusFilter]);

  // Metrics
  const metrics: TermsMetrics = useMemo(() => {
    const total = documents.length;
    const active = documents.filter((d) => d.status === "active").length;
    const draft = documents.filter((d) => d.status === "draft").length;
    const archived = documents.filter((d) => d.status === "archived").length;
    const lastDoc = [...documents].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];
    const lastUpdated = lastDoc ? new Date(lastDoc.updated_at).toLocaleDateString("vi-VN") : "09/09/2026";

    return { total, active, draft, archived, lastUpdated };
  }, [documents]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage, pageSize]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsCreating(true);
    setSelectedDoc(null);
    setFormData({
      code: `JACS-EULA-${new Date().getFullYear()}-v${(documents.length + 1).toFixed(1)}`,
      title: "THỎA THUẬN CẤP PHÉP SỬ DỤNG VÀ ĐIỀU KHOẢN DỊCH VỤ PHẦN MỀM JACS STUDIO",
      version: `v${(documents.length + 1).toFixed(1)}.0`,
      category: "enterprise",
      status: "draft",
      full_content: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---o0o---

THỎA THUẬN CẤP PHÉP SỬ DỤNG VÀ ĐIỀU KHOẢN DỊCH VỤ PHẦN MỀM JACS STUDIO
(Số hiệu văn bản: JACS-EULA-${new Date().getFullYear()}-v${(documents.length + 1).toFixed(1)})

Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015;
Căn cứ Luật Sở hữu trí tuệ số 36/2005/QH11 (sửa đổi, bổ sung năm 2022);
Căn cứ Luật Công nghệ thông tin số 67/2006/QH11;
Căn cứ Luật Giao dịch điện tử số 20/2023/QH15;
Căn cứ Nghị định số 30/2020/NĐ-CP về công tác văn thư;
Căn cứ Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

Điều 1. Bản quyền phần mềm và phạm vi cấp phép sử dụng
1. JACS Studio là sản phẩm phần mềm độc quyền được phát triển bởi Nhà phát triển JACS Studio, được bảo hộ theo pháp luật về Sở hữu trí tuệ.
2. License Key được cấp cho Khách hàng là quyền sử dụng có giới hạn (Limited), không độc quyền, không được chuyển nhượng.

Điều 2. Kiểm soát thiết bị phần cứng (HWID) và chống can thiệp mã nguồn
1. License Key được định danh và gắn kết chặt chẽ với mã nhận dạng phần cứng (HWID) của máy tính đăng ký.
2. Mọi hành vi can thiệp bộ nhớ (Memory Hooking), dịch ngược (Reverse Engineering) sẽ bị thu hồi giấy phép vĩnh viễn mà không hoàn tiền.

Điều 3. Trách nhiệm dữ liệu đầu vào và tuyên bố miễn trừ bản quyền nội dung
1. Người dùng cam đoan và bảo đảm mình là chủ sở hữu hợp pháp đối với toàn bộ dữ liệu, nguyên liệu đầu vào và nội dung xuất ra.
2. Nhà phát triển JACS Studio được miễn trừ hoàn toàn và vô điều kiện khỏi mọi tranh chấp bản quyền nội dung phát sinh.

Điều 4. Tích hợp AI và chính sách API bên thứ ba (BYOK)
1. Người dùng tự quản lý và chịu trách nhiệm đối với các khóa API cá nhân (OpenAI, Gemini, Claude, ElevenLabs...).
2. Khóa API được mã hóa an toàn cục bộ trên thiết bị của người dùng thông qua công nghệ Windows DPAPI.

Điều 5. Hiệu lực thi hành và giải quyết tranh chấp
1. Thỏa thuận này có giá trị pháp lý ràng buộc khi người dùng kích hoạt License Key trên phần mềm.
2. Mọi tranh chấp nếu có sẽ được giải quyết theo quy định của pháp luật Nước CHXHCN Việt Nam.

ĐẠI DIỆN NHÀ PHÁT TRIỂN JACS STUDIO
Xác thực bản quyền: Jacs.Legal.Auth
Chữ ký điện tử / Hash: SHA256:8F92-4B10-AC99-2026-JACS-LEGAL`,
      summary: "Bản thỏa thuận điều khoản cấp phép mới.",
      requires_hwid_binding: true,
      requires_content_disclaimer: true,
      legal_basis_text: "Bộ luật Dân sự 2015\nLuật Sở hữu trí tuệ\nLuật Giao dịch điện tử 2023\nNghị định 30/2020/NĐ-CP\nNghị định 13/2023/NĐ-CP",
    });
    setShowEditorModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (doc: EulaDocument) => {
    setIsCreating(false);
    setSelectedDoc(doc);
    setFormData({
      code: doc.code,
      title: doc.title,
      version: doc.version,
      category: doc.category,
      status: doc.status,
      full_content: doc.full_content || "",
      summary: doc.summary || "",
      requires_hwid_binding: doc.requires_hwid_binding,
      requires_content_disclaimer: doc.requires_content_disclaimer,
      legal_basis_text: (doc.legal_basis || []).join("\n"),
    });
    setShowEditorModal(true);
  };

  // Open View Modal
  const handleOpenView = (doc: EulaDocument) => {
    setSelectedDoc(doc);
    setShowViewModal(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (doc: EulaDocument) => {
    setSelectedDoc(doc);
    setShowDeleteModal(true);
  };

  // Handle Form Submit (Save to DB)
  const handleSaveSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) {
      notify("Vui lòng nhập tiêu đề văn bản thỏa thuận", "error");
      return;
    }
    if (!formData.full_content.trim()) {
      notify("Nội dung văn bản không được để trống", "error");
      return;
    }

    try {
      setIsSaving(true);
      const legalBasisList = formData.legal_basis_text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        code: formData.code.trim(),
        title: formData.title.trim(),
        version: formData.version.trim(),
        category: formData.category,
        status: formData.status,
        full_content: formData.full_content.trim(),
        summary: formData.summary.trim(),
        legal_basis: legalBasisList,
        requires_hwid_binding: formData.requires_hwid_binding,
        requires_content_disclaimer: formData.requires_content_disclaimer,
      };

      if (isCreating || !selectedDoc) {
        await termsService.createDocument(payload);
      } else {
        await termsService.updateDocument(selectedDoc.id, payload);
      }

      await fetchData();
      setShowEditorModal(false);
      notify(
        isCreating
          ? t("toastCreateSuccess", "Đã lưu và lưu trữ văn bản mới vào Cơ sở dữ liệu.")
          : t("toastUpdateSuccess", "Đã cập nhật văn bản vào Cơ sở dữ liệu."),
        "success"
      );
    } catch {
      notify(t("toastSaveError", "Có lỗi xảy ra khi lưu vào cơ sở dữ liệu"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Submit (Delete from DB)
  const handleDeleteSubmit = async () => {
    if (!selectedDoc) return;
    if (documents.length <= 1) {
      notify("Không thể xóa toàn bộ văn bản. Hệ thống cần ít nhất 1 bản thỏa thuận cấp phép trong DB.", "error");
      return;
    }

    try {
      setLoading(true);
      await termsService.deleteDocument(selectedDoc.id);
      await fetchData();
      setShowDeleteModal(false);
      setSelectedDoc(null);
      notify(t("toastDeleteSuccess", "Đã xóa văn bản thỏa thuận khỏi Cơ sở dữ liệu."), "success");
    } catch {
      notify(t("toastSaveError", "Không thể xóa văn bản từ Cơ sở dữ liệu"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Set Active (Activate in DB)
  const handleSetActive = async (doc: EulaDocument) => {
    try {
      setLoading(true);
      await termsService.activateDocument(doc.id);
      await fetchData();
      notify(t("toastActivateSuccess", `Đã kích hoạt [${doc.code}] làm văn bản áp dụng chính thức!`), "success");
    } catch {
      notify(t("toastSaveError", "Không thể kích hoạt văn bản trên Cơ sở dữ liệu"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Duplicate (Create duplicate in DB)
  const handleDuplicate = async (doc: EulaDocument) => {
    try {
      setLoading(true);
      const dupPayload = {
        code: `${doc.code}-COPY`,
        title: `${doc.title} (Bản sao)`,
        version: `${doc.version}-copy`,
        category: doc.category,
        status: "draft" as const,
        full_content: doc.full_content,
        summary: doc.summary,
        legal_basis: doc.legal_basis,
        requires_hwid_binding: doc.requires_hwid_binding,
        requires_content_disclaimer: doc.requires_content_disclaimer,
      };
      await termsService.createDocument(dupPayload);
      await fetchData();
      notify(t("toastDuplicateSuccess", `Đã nhân bản [${doc.code}] thành bản thảo mới trong Cơ sở dữ liệu`), "success");
    } catch {
      notify(t("toastSaveError", "Không thể nhân bản văn bản"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Copy Full Text
  const handleCopyText = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      notify(t("toastCopySuccess", "Đã sao chép toàn bộ nội dung văn bản vào Clipboard."), "success");
    }
  };

  return {
    loading,
    isSaving,
    documents,
    activeDocument,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredDocuments,
    paginatedDocuments,
    totalPages,
    metrics,
    // Modals
    showEditorModal,
    setShowEditorModal,
    isCreating,
    showViewModal,
    setShowViewModal,
    showDeleteModal,
    setShowDeleteModal,
    showRbacModal,
    setShowRbacModal,
    selectedDoc,
    // Form
    formData,
    setFormData,
    // Actions
    fetchData,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenView,
    handleOpenDelete,
    handleSaveSubmit,
    handleDeleteSubmit,
    handleSetActive,
    handleDuplicate,
    handleCopyText,
  };
};
