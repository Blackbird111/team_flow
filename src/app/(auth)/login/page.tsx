import type { Metadata } from "next";
import { LoginFormDynamic } from "@/components/auth/form-wrappers";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your account",
};

export default function LoginPage() {
  return <LoginFormDynamic />;
}