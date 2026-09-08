import React from "react";
import { UserManagementPage } from "./UserManagementPage";

export { UserManagementPage };

interface SessionsPageProps {
  sessions?: any[];
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const SessionsPage: React.FC<SessionsPageProps> = (props) => {
  return <UserManagementPage searchTerm={props.searchTerm} onNotify={props.onNotify} />;
};

export default SessionsPage;
