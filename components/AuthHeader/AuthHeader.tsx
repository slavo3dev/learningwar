import Link from "next/link";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}
// test
export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="mb-8 text-center">
      <Link href="/" className="inline-block">
        <span className="text-2xl font-bold text-primary tracking-tight">
          LearningWar
        </span>
      </Link>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <p className="mt-3 text-lg font-semibold text-foreground">{title}</p>
    </div>
  );
}