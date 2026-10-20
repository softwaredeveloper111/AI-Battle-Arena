import { useCallback } from "react";
import { toast } from "sonner";
import useAuthStore from "../store/auth.store";
import authService from "../services/auth.api";

const useAuth = () => {
  // --- Auth State from Zustand Store ---
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const status = useAuthStore((state) => state.status);

  const resendVerificationLoading = useAuthStore(
    (state) => state.resendVerificationLoading
  );
  const resendVerificationError = useAuthStore(
    (state) => state.resendVerificationError
  );

  const forgotPasswordLoading = useAuthStore(
    (state) => state.forgotPasswordLoading
  );
  const forgotPasswordError = useAuthStore(
    (state) => state.forgotPasswordError
  );

  const resetPasswordLoading = useAuthStore(
    (state) => state.resetPasswordLoading
  );
  const resetPasswordError = useAuthStore(
    (state) => state.resetPasswordError
  );

  // --- Store Actions ---
  const loginStart = useAuthStore((state) => state.loginStart);
  const loginSuccess = useAuthStore((state) => state.loginSuccess);
  const loginFailure = useAuthStore((state) => state.loginFailure);

  const signupStart = useAuthStore((state) => state.signupStart);
  const signupSuccess = useAuthStore((state) => state.signupSuccess);
  const signupFailure = useAuthStore((state) => state.signupFailure);

  const checkAuthStart = useAuthStore((state) => state.checkAuthStart);
  const checkAuthSuccess = useAuthStore((state) => state.checkAuthSuccess);
  const checkAuthFailure = useAuthStore((state) => state.checkAuthFailure);

  const logoutStart = useAuthStore((state) => state.logoutStart);
  const logoutSuccess = useAuthStore((state) => state.logoutSuccess);
  const logoutFailure = useAuthStore((state) => state.logoutFailure);

  const resendVerificationEmailStart = useAuthStore(
    (state) => state.resendVerificationEmailStart
  );
  const resendVerificationEmailSuccess = useAuthStore(
    (state) => state.resendVerificationEmailSuccess
  );
  const resendVerificationEmailFailure = useAuthStore(
    (state) => state.resendVerificationEmailFailure
  );

  const forgotPasswordStart = useAuthStore(
    (state) => state.forgotPasswordStart
  );
  const forgotPasswordSuccess = useAuthStore(
    (state) => state.forgotPasswordSuccess
  );
  const forgotPasswordFailure = useAuthStore(
    (state) => state.forgotPasswordFailure
  );

  const resetPasswordStart = useAuthStore((state) => state.resetPasswordStart);
  const resetPasswordSuccess = useAuthStore(
    (state) => state.resetPasswordSuccess
  );
  const resetPasswordFailure = useAuthStore(
    (state) => state.resetPasswordFailure
  );

  // --- Handlers Merging API + State ---

  const loginUserHandler = useCallback(
    async (email, password) => {
      loginStart();
      try {
        const result = await authService.loginApi(email, password);
        loginSuccess(result?.data);
        toast.success(result?.message || "Logged in successfully");
        return result;
      } catch (err) {
        const message = err?.message || "Login failed, please try again";
        loginFailure(message);
        toast.error(message);
        return null;
      }
    },
    [loginStart, loginSuccess, loginFailure]
  );

  const registerHandler = useCallback(
    async (username, email, password) => {
      signupStart();
      try {
        const result = await authService.registerApi(username, email, password);
        signupSuccess(result?.data);
        toast.success(result?.message || "Registration successful");
        return result;
      } catch (err) {
        const message = err?.message || "Registration failed, please try again";
        signupFailure(message);
        toast.error(message);
        return null;
      }
    },
    [signupStart, signupSuccess, signupFailure]
  );

  const initializeAuth = useCallback(async () => {
    checkAuthStart();
    try {
      const result = await authService.getMeApi();
      checkAuthSuccess(result?.data);
      return result?.data;
    } catch {
      // Unauthenticated visitor is handled cleanly by store
      checkAuthFailure();
      return null;
    }
  }, [checkAuthStart, checkAuthSuccess, checkAuthFailure]);

  const resendVerificationHandler = useCallback(
    async (email) => {
      resendVerificationEmailStart();
      try {
        const result = await authService.resendVerificationEmailApi(email);
        resendVerificationEmailSuccess();
        toast.success(
          result?.message || "Verification email resent successfully"
        );
        return result;
      } catch (err) {
        const message =
          err?.message || "Failed to resend verification email";
        resendVerificationEmailFailure(message);
        toast.error(message);
        return null;
      }
    },
    [
      resendVerificationEmailStart,
      resendVerificationEmailSuccess,
      resendVerificationEmailFailure,
    ]
  );

  const forgotPasswordHandler = useCallback(
    async (email) => {
      forgotPasswordStart();
      try {
        const result = await authService.forgotPasswordApi(email);
        forgotPasswordSuccess();
        toast.success(result?.message || "Password reset email sent");
        return result;
      } catch (err) {
        const message = err?.message || "Failed to send reset email";
        forgotPasswordFailure(message);
        toast.error(message);
        return null;
      }
    },
    [
      forgotPasswordStart,
      forgotPasswordSuccess,
      forgotPasswordFailure,
    ]
  );

  const resetPasswordHandler = useCallback(
    async (token, password) => {
      resetPasswordStart();
      try {
        const result = await authService.resetPasswordApi(token, password);
        resetPasswordSuccess();
        toast.success(result?.message || "Password reset successfully");
        return result;
      } catch (err) {
        const message = err?.message || "Failed to reset password";
        resetPasswordFailure(message);
        toast.error(message);
        return null;
      }
    },
    [resetPasswordStart, resetPasswordSuccess, resetPasswordFailure]
  );

  const logoutHandler = useCallback(async () => {
    logoutStart();
    try {
      const result = await authService.logoutApi();
      logoutSuccess();
      toast.success(result?.message || "Logged out successfully");
      return true;
    } catch (err) {
      const message = err?.message || "Logout failed, please try again";
      logoutFailure(message);
      toast.error(message);
      return false;
    }
  }, [logoutStart, logoutSuccess, logoutFailure]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    status,

    resendVerificationLoading,
    resendVerificationError,

    forgotPasswordLoading,
    forgotPasswordError,

    resetPasswordLoading,
    resetPasswordError,

    loginUserHandler,
    registerHandler,
    initializeAuth,
    resendVerificationHandler,
    forgotPasswordHandler,
    resetPasswordHandler,
    logoutHandler,

    googleLoginUrl: authService.googleLoginUrl,
    googleSignupUrl: authService.googleSignupUrl,
  };
};

export default useAuth;
