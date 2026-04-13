import type { Metadata } from "next";
import { ForgotPasswordFormDynamic } from "@/components/auth/form-wrappers";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordFormDynamic />;
}