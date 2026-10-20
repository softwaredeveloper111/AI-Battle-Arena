import { create } from "zustand";
import { devtools } from "zustand/middleware";

const authStore = (set) => ({
  // --- Initial State ---
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  status: "loading",

  // Resend verification email
  resendVerificationLoading: false,
  resendVerificationError: null,

  // Forgot password
  forgotPasswordLoading: false,
  forgotPasswordError: null,

  // Reset password
  resetPasswordLoading: false,
  resetPasswordError: null,


  // Login
  loginStart: () =>
    set({
      isLoading: true,
      error: null,
    }),

  loginSuccess: (user) =>
    set({
      isLoading: false,
      error: null,
      user,
      isAuthenticated: true,
      status: "authenticated",
    }),

  loginFailure: (error) =>
    set({
      isLoading: false,
      error,
      isAuthenticated: false,
      status: "unauthenticated",
    }),

  // Register / Signup
  signupStart: () =>
    set({
      isLoading: true,
      error: null,
    }),

  signupSuccess: (user = null) =>
    set({
      isLoading: false,
      error: null,
      ...(user ? { user, isAuthenticated: true, status: "authenticated" } : {}),
    }),

  signupFailure: (error) =>
    set({
      isLoading: false,
      error,
      isAuthenticated: false,
      status: "unauthenticated",
    }),

  // Check Auth / GetMe
  checkAuthStart: () =>
    set({
      isLoading: true,
      error: null,
    }),

  checkAuthSuccess: (user) =>
    set({
      isLoading: false,
      error: null,
      isAuthenticated: true,
      status: "authenticated",
      user,
    }),

  checkAuthFailure: () =>
    set({
      isLoading: false,
      error: null,
      user: null,
      status: "unauthenticated",
      isAuthenticated: false,
    }),

  // Logout

  logoutStart: () =>
    set({
      isLoading: true,
      error: null,
    }),

  logoutSuccess: () =>
    set({
      isLoading: false,
      user: null,
      error: null,
      isAuthenticated: false,
      status: "unauthenticated",
    }),

    logoutFailure: (error) =>
    set({
      isLoading: false,
      error
    }),


  // resend verification Email
  resendVerificationEmailStart: () =>
    set({
      resendVerificationLoading: true,
      resendVerificationError: null,
    }),

  resendVerificationEmailSuccess: () =>
    set({
      resendVerificationLoading: false,
      resendVerificationError: null,
    }),

  resendVerificationEmailFailure: (error) =>
    set({
      resendVerificationLoading: false,
      resendVerificationError: error,
    }),


  // Forgot Password
  forgotPasswordStart: () =>
    set({
      forgotPasswordLoading: true,
      forgotPasswordError: null,
    }),

  forgotPasswordSuccess: () =>
    set({
      forgotPasswordLoading: false,
      forgotPasswordError: null,
    }),

  forgotPasswordFailure: (error) =>
    set({
      forgotPasswordLoading: false,
      forgotPasswordError: error,
    }),

  // Reset Password
  resetPasswordStart: () =>
    set({
      resetPasswordLoading: true,
      resetPasswordError: null,
    }),

  resetPasswordSuccess: () =>
    set({
      resetPasswordLoading: false,
      resetPasswordError: null,
    }),

  resetPasswordFailure: (error) =>
    set({
      resetPasswordLoading: false,
      resetPasswordError: error,
    }),

});

const useAuthStore = create(
  devtools(authStore, {
    name: "AuthStore",
    enabled: import.meta.env.DEV,
  })
);

export default useAuthStore;
export { useAuthStore };
