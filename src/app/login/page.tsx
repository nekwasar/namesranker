import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — NamesRanker",
  description: "Enter your email to sign in to NamesRanker.",
};

export default function LoginPage() {
  return <LoginForm />;
}
