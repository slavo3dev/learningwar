import Link from "next/link";
import { AuthCard, AuthHeader, SignInForm } from "@/components";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom?: string; error?: string }>;
}) {
  const { redirectedFrom, error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthHeader
          title="Welcome back"
          subtitle="Sign in to continue learning"
        />

        {error === "link_expired" && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            That confirmation link expired. Please sign up again to get a new one.
          </div>
        )}

        {error === "auth_callback_failed" && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Something went wrong. Please try again.
          </div>
        )}

        <AuthCard>
          <SignInForm redirectedFrom={redirectedFrom} />
        </AuthCard>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}