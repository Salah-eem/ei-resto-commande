import { useAppSelector, useAppDispatch } from "../store";
import { useCallback } from "react";
import { loginAsync, logoutAsync } from "../store/slices/authSlice";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, token, user, loading, error } = useAppSelector(
    (state) => state.auth
  );

  const login = useCallback(
    (credentials: { email: string; password: string }) => {
      return dispatch(loginAsync(credentials));
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    return dispatch(logoutAsync());
  }, [dispatch]);

  return {
    isAuthenticated,
    token,
    user,
    loading,
    error,
    login,
    logout,
  };
};
