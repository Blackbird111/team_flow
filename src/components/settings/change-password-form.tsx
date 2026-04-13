"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";

export function ChangePasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "changePassword",
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }

      toast.success("Password changed successfully");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: "currentPassword", label: "Current Password" },
    { name: "newPassword", label: "New Password" },
    { name: "confirmPassword", label: "Confirm New Password" },
  ] as const;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Change Password</h3>
          <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(({ name, label }) => (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <div className="relative">
              <Input
                id={name}
                name={name}
                type={showPasswords ? "text" : "password"}
                value={form[name]}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={loading}
                required
              />
              {name === "currentPassword" && (
                <button
                  type="button"
                  onClick={() => setShowPasswords((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        <Button
          type="submit"
          disabled={loading || !form.currentPassword || !form.newPassword || !form.confirmPassword}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Password
        </Button>
      </form>
    </div>
  );
}