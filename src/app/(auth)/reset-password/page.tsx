import type { Metadata } from "next";
import { ResetPasswordFormDynamic } from "@/components/auth/form-wrappers";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your account",
};

interface Props {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, email } = await searchParams;
  return (
    <ResetPasswordFormDynamic
      token={token ?? ""}
      email={email ?? ""}
    />
  );
}