"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "pending" | "success" | "error-invalid" | "error-missing";

function getStatus(params: ReturnType<typeof useSearchParams>): Status {
  if (params.get("success") === "true") return "success";
  const error = params.get("error");
  if (error === "invalid") return "error-invalid";
  if (error === "missing") return "error-missing";
  return "pending";
}

type ContentConfig = {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  action: React.ReactNode;
};

const CONTENT: Record<Status, ContentConfig> = {
  pending: {
    icon: <Mail className="w-8 h-8 text-violet-600" />,
    iconBg: "bg-violet-100 dark:bg-violet-950",
    title: "Check your inbox",
    description:
      "We've sent a verification link to your email address. Click the link to activate your account. The link expires in 24 hours.",
    action: (
      <Link href="/login">
        <Button variant="outline" className="gap-2">
          Back to login <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    ),
  },
  success: {
    icon: <CheckCircle2 className="w-8 h-8 text-emerald-600" />,
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    title: "Email verified!",
    description:
      "Your email has been successfully verified. You can now sign in to your account.",
    action: (
      <Link href="/login">
        <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          Sign in now <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    ),
  },
  "error-invalid": {
    icon: <XCircle className="w-8 h-8 text-red-500" />,
    iconBg: "bg-red-100 dark:bg-red-950",
    title: "Link expired or invalid",
    description:
      "This verification link is invalid or has expired. Please register again to receive a new verification email.",
    action: (
      <Link href="/register">
        <Button variant="outline" className="gap-2">
          Register again <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    ),
  },
  "error-missing": {
    icon: <XCircle className="w-8 h-8 text-red-500" />,
    iconBg: "bg-red-100 dark:bg-red-950",
    title: "Missing token",
    description:
      "No verification token was provided. Please use the link from your email or register again.",
    action: (
      <Link href="/register">
        <Button variant="outline" className="gap-2">
          Back to register <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    ),
  },
};

export function VerifyEmailContent() {
  const params = useSearchParams();
  const status = getStatus(params);
  const content = CONTENT[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
          <div
            className={`w-16 h-16 rounded-full ${content.iconBg} flex items-center justify-center mx-auto mb-6`}
          >
            {content.icon}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-3">
            {content.title}
          </h1>

          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            {content.description}
          </p>

          <div className="flex justify-center">{content.action}</div>

          <p className="mt-8 text-xs text-muted-foreground/50">SAAS-STARTER</p>
        </div>
      </motion.div>
    </div>
  );
}