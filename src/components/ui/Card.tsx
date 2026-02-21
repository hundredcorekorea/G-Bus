interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ children, className = "", hover = false, glow = false }: CardProps) {
  return (
    <div
      className={`bg-gbus-surface/80 backdrop-blur-sm border border-gbus-border/60 rounded-2xl p-5 transition-all duration-250 ${
        hover ? "card-hover cursor-pointer" : ""
      } ${glow ? "glow-primary" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
