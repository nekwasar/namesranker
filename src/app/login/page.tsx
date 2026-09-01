import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/auth-shell";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — NamesRanker",
  description: "Sign in to NamesRanker with your email and password, or with a magic link.",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Sign in with your email and password, or get a magic link in your inbox."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
