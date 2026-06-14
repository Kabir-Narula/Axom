import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex size-7 items-center justify-center rounded-md border border-border bg-card">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 4 L20 19 H4 Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            className="text-foreground"
          />
          <path
            d="M9 14 H15"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="text-foreground"
          />
          <circle cx="12" cy="4" r="1.5" fill="#a78bfa" />
        </svg>
      </span>
      {showWord && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Axom
        </span>
      )}
    </span>
  );
}
