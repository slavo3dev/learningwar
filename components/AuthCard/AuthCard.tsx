interface AuthCardProps {
  children: React.ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {children}
    </div>
  );
}