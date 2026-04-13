"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Schemas ────────────────────────────────────────────────────────────────

const credentialsSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;
type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUrlError(error: string | null): string | null {
  if (!error) return null;
  if (error === "CredentialsSignin") return "Invalid email or password. Please try again.";
  if (error === "OAuthAccountNotLinked") return "This email is already linked to another sign-in method.";
  return "Something went wrong. Please try again.";
}

// ─── Google Icon ─────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const callbackUrl = inviteToken
    ? `/invite?token=${inviteToken}`
    : (searchParams.get("callbackUrl") ?? "/dashboard/my-tasks");
  const urlError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(getUrlError(urlError));
  // ✅ Новое: флаг "email не верифицирован" для специального UI
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const credentialsForm = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  const magicLinkForm = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    setUnverifiedEmail(null);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("Failed to sign in with Google. Please try again.");
      setGoogleLoading(false);
    }
  }

  async function handleCredentialsSubmit(values: CredentialsFormValues) {
    setCredentialsLoading(true);
    setError(null);
    setUnverifiedEmail(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        // ✅ Распознаём специальный код ошибки EMAIL_NOT_VERIFIED
        if (result.error === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(values.email);
          setCredentialsLoading(false);
          return;
        }
        setError("Invalid email or password. Please try again.");
        setCredentialsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setCredentialsLoading(false);
    }
  }

  async function handleMagicLinkSubmit(values: MagicLinkFormValues) {
    setMagicLinkLoading(true);
    setError(null);
    setUnverifiedEmail(null);

    try {
      const result = await signIn("resend", {
        email: values.email,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Failed to send magic link. Please try again.");
        setMagicLinkLoading(false);
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setMagicLinkLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/40 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ✅ Email not verified banner */}
          <AnimatePresence>
            {unverifiedEmail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert className="border-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-800">
                  <AlertDescription className="text-sm text-violet-800 dark:text-violet-200 space-y-1">
                    <p className="font-medium">Email not verified</p>
                    <p>
                      Please verify{" "}
                      <span className="font-medium">{unverifiedEmail}</span>{" "}
                      before signing in. Check your inbox for the verification link.
                    </p>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generic error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Magic link sent success state */}
          {magicLinkSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-3 py-4"
            >
              <div className="text-4xl">📧</div>
              <p className="font-medium">Check your email!</p>
              <p className="text-sm text-muted-foreground">
                We sent a magic link to{" "}
                <strong>{magicLinkForm.getValues("email")}</strong>. Click the
                link to sign in.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMagicLinkSent(false)}
              >
                Use different method
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Google OAuth */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="password" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="password">Password</TabsTrigger>
                  <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
                </TabsList>

                {/* ── Credentials Tab ── */}
                <TabsContent value="password" className="mt-4">
                  <Form {...credentialsForm}>
                    <form
                      onSubmit={credentialsForm.handleSubmit(handleCredentialsSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={credentialsForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="you@example.com"
                                type="email"
                                autoComplete="email"
                                disabled={credentialsLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={credentialsForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Password</FormLabel>
                              <Link
                                href="/forgot-password"
                                className="text-xs text-primary hover:underline"
                              >
                                Forgot password?
                              </Link>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="••••••••"
                                  type={showPassword ? "text" : "password"}
                                  autoComplete="current-password"
                                  disabled={credentialsLoading}
                                  {...field}
                                />
                                <button
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => setShowPassword((prev) => !prev)}
                                  tabIndex={-1}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={credentialsLoading}
                      >
                        {credentialsLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Sign in
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {/* ── Magic Link Tab ── */}
                <TabsContent value="magic-link" className="mt-4">
                  <Form {...magicLinkForm}>
                    <form
                      onSubmit={magicLinkForm.handleSubmit(handleMagicLinkSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={magicLinkForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="you@example.com"
                                type="email"
                                autoComplete="email"
                                disabled={magicLinkLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={magicLinkLoading}
                      >
                        {magicLinkLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Send magic link
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}