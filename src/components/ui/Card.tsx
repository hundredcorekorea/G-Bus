interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-gbus-surface border border-gbus-border rounded-xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}
