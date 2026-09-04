import { useState, useCallback } from "react";
import { authService, LoginPayload } from "../services/authService";

export function useAuth(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = useCallback(
    async (credentials: LoginPayload) => {
      setLoading(true);
      setError("");
      try {
        await authService.login(credentials);
        if (onSuccess) {
          onSuccess();
        }
      } catch (err: any) {
        setError(err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  const logout = useCallback(() => {
    authService.logout();
  }, []);

  return {
    loading,
    error,
    setError,
    login,
    logout,
    isAuthenticated: authService.isAuthenticated(),
  };
}
