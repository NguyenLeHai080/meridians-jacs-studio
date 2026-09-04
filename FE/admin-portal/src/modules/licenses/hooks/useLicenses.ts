import { useState, useMemo } from "react";
import type { License } from "../../../core/types";

export function useLicenses(licenses: License[] = []) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredLicenses = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return licenses;
    return licenses.filter(
      (lic) =>
        lic.customer_name.toLowerCase().includes(term) ||
        lic.customer_contact.toLowerCase().includes(term) ||
        lic.hwid.toLowerCase().includes(term) ||
        lic.key_hint.toLowerCase().includes(term) ||
        (lic.notes || "").toLowerCase().includes(term)
    );
  }, [licenses, searchTerm]);

  const totalPages = Math.ceil(filteredLicenses.length / pageSize) || 1;
  const paginatedLicenses = useMemo(() => {
    return filteredLicenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredLicenses, currentPage, pageSize]);

  const activeCount = useMemo(() => licenses.filter((l) => l.status === "active").length, [licenses]);
  const blockedCount = useMemo(() => licenses.filter((l) => l.status === "blocked").length, [licenses]);

  return {
    searchTerm,
    setSearchTerm: (term: string) => {
      setSearchTerm(term);
      setCurrentPage(1);
    },
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    totalPages,
    filteredLicenses,
    paginatedLicenses,
    totalCount: licenses.length,
    activeCount,
    blockedCount,
    rolesCount: 5,
  };
}
