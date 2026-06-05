import Link from "next/link";
import { AuthCard, AuthHeader, SignUpForm } from "@/components";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthHeader
          title="Create your account"
          subtitle="Start learning with ARI — free forever"
        />

        <AuthCard>
          <SignUpForm />
        </AuthCard>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}