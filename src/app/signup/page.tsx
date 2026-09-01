import type { Metadata } from "next";
import AuthShell from "@/components/auth/auth-shell";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Create your account — NamesRanker",
  description:
    "Create your NamesRanker account with your name and a strong password, then verify your email to claim your name.",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Claim your name on Google — it takes two minutes, and your email must be verified before you sign in."
    >
      <SignupForm />
    </AuthShell>
  );
}
