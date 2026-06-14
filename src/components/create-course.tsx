"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/client";
import { courseSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

// Desaturated identity swatches — no saturated brand colours.
const COLORS = ["#a78bfa", "#818cf8", "#c4b5fd", "#a1a1aa", "#d4d4d8", "#71717a"];

export function CreateCourse({
  variant = "default",
}: {
  variant?: "default" | "secondary";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const examRaw = String(form.get("examDate") ?? "");
    const payload = {
      title: String(form.get("title") ?? ""),
      code: String(form.get("code") ?? ""),
      color,
      examDate: examRaw ? new Date(examRaw + "T00:00:00").toISOString() : "",
    };
    const parsed = courseSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your inputs.");
      return;
    }

    setLoading(true);
    try {
      const course = await api<{ id: string }>("/api/courses", {
        method: "POST",
        body: parsed.data,
      });
      toast("Course created.", "success");
      setOpen(false);
      router.push(`/courses/${course.id}`);
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : "Couldn't create course.";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus /> New course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a course</DialogTitle>
          <DialogDescription>
            Give it a name. You can add materials right after.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title">Course title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Data Structures & Algorithms"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Course code (optional)</Label>
            <Input id="code" name="code" placeholder="CS 2110" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="examDate">Exam date (optional)</Label>
            <Input id="examDate" name="examDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label>Identity</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-6 rounded-full border transition-transform hover:scale-110",
                    color === c ? "border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Pick ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
