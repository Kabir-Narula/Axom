import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { GraphMotif } from "@/components/graph-motif";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Create account — Axom" };

export default function RegisterPage() {
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
                Start learning smarter
              </h1>
              <p className="text-sm text-muted-foreground">
                Create your account — it takes 20 seconds.
              </p>
            </div>
            <Suspense>
              <AuthForm mode="register" />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
