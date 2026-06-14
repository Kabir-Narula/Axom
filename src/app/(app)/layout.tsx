import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { cardRepo } from "@/lib/repositories/cards";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dueCount = await cardRepo.countDueForUser(user.id);

  return (
    <AppShell user={{ name: user.name, email: user.email }} dueCount={dueCount}>
      {children}
    </AppShell>
  );
}
