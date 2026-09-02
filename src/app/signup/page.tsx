import type { Metadata } from "next";
import AuthShell from "@/components/auth/auth-shell";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Create your account — NamesRanker",
  description:
    "Create your NamesRanker account to start your $1 trial — verify your email, upload your resume, and your personal agent takes it from there.",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start your $1 trial — verify your email, upload your resume, and your personal agent will take it from there."
    >
      <SignupForm />
    </AuthShell>
  );
}
