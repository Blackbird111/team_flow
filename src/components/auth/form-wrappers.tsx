"use client";

import dynamic from "next/dynamic";

export const LoginFormDynamic = dynamic(
  () => import("./login-form").then((m) => m.LoginForm),
  { ssr: false },
);

export const RegisterFormDynamic = dynamic(
  () => import("./register-form").then((m) => m.RegisterForm),
  { ssr: false },
);

export const ForgotPasswordFormDynamic = dynamic(
  () => import("./forgot-password-form").then((m) => m.ForgotPasswordForm),
  { ssr: false },
);

export const ResetPasswordFormDynamic = dynamic(
  () => import("./reset-password-form").then((m) => m.ResetPasswordForm),
  { ssr: false },
);