import type { Metadata } from "next";
import { RegisterFormDynamic } from "@/components/auth/form-wrappers";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a new account to get started",
};

export default function RegisterPage() {
  return <RegisterFormDynamic />;
}