import Link from "next/link";
import { AuthCard, AuthHeader, ForgotPasswordForm } from "@/components";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthHeader
          title="Reset your password"
          subtitle="We'll send you a link to get back in"
        />

        <AuthCard>
          <ForgotPasswordForm />
        </AuthCard>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/auth/sign-in" className="text-primary hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}