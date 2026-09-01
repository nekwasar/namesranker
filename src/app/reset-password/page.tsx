import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";
import ResetPasswordForm from "./reset-password-form";
import styles from "@/components/auth/auth.module.css";

export const metadata: Metadata = {
  title: "Reset password — NamesRanker",
  description: "Choose a new password for your NamesRanker account.",
};

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? "";

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick a strong password to secure your account."
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className={styles.success}>
          <h2 className={styles.successTitle}>Invalid link</h2>
          <p className={styles.successBody}>
            This reset link is missing its token. Please request a new one.
          </p>
          <Link href="/forgot-password" className={styles.link}>
            Request a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
