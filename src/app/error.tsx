"use client";

import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo showWord={false} />
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Error
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        Something went wrong.
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        An unexpected error occurred. You can try again — if it persists, head
        back and retry from there.
      </p>
      <div className="mt-7 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
