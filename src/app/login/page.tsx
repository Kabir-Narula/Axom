import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { GraphMotif } from "@/components/graph-motif";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Sign in — Axom" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 opacity-[0.35]">
        <GraphMotif className="max-h-48" />
      </div>
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-10 flex justify-center">
          <Logo />
        </Link>
        <Card>
          <CardContent className="p-7">
            <div className="mb-7 space-y-1.5 text-center">
              <h1 className="text-xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to keep your streak going.
              </p>
            </div>
            <Suspense>
              <AuthForm mode="login" />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
