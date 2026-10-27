"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { Sparkles, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const newErrors: typeof errors = {};
    if (!formData.email.trim()) newErrors.email = "Email address is required";
    if (!formData.password) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Authentication failed.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Welcome Back</h1>
          <p className="text-sm text-surface-500">
            Sign in to access your event plans, timelines, and budgets.
          </p>
        </div>

        {errorMessage && (
          <ToastNotification
            type="error"
            title="Sign In Failed"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        <Card className="p-6 sm:p-8 glass-surface-elevated shadow-glass-elevated specular-top">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              required
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <Input
              label="Password"
              required
              type="password"
              name="password"
              placeholder="Your password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
            />

            <div className="pt-2">
              <Button type="submit" size="lg" className="w-full justify-center gap-2" isLoading={loading}>
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
            </div>
          </form>

          <div className="mt-6 border-t border-surface-100 pt-4 text-center text-xs text-surface-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-primary-600 hover:text-primary-700">
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
