import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  Microscope,
  Brain,
  Target,
  Network,
  CalendarClock,
  Globe,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { GraphMotif } from "@/components/graph-motif";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { getCurrentUser } from "@/lib/auth/session";

const FEATURES = [
  {
    icon: FileSearch,
    title: "Document intelligence",
    body: "Upload slides, PDFs or notes. Axom parses them into a personal knowledge graph and surfaces what your professor is most likely to test.",
  },
  {
    icon: Microscope,
    title: "Diagnosis, not just quizzing",
    body: "Every wrong answer triggers a micro-lesson that explains why your reasoning failed — then closes that specific gap.",
  },
  {
    icon: Brain,
    title: "A real learning engine",
    body: "Spaced repetition, interleaving, retrieval practice and the generation effect, applied automatically as you study.",
  },
  {
    icon: Target,
    title: "The exam, reverse-engineered",
    body: "Practice from easy to trick-question hard across seven question formats, with timed simulation and analytics.",
  },
  {
    icon: Network,
    title: "A connected knowledge graph",
    body: "Concepts link by prerequisite and relation. Struggle with one and Axom reprioritises everything that depends on it.",
  },
  {
    icon: CalendarClock,
    title: "Plans that adapt",
    body: "Give it your exam date. Get a day-by-day plan calibrated to forgetting curves that reshuffles when you fall behind.",
  },
  {
    icon: Globe,
    title: "Research from the web",
    body: "Stuck on a concept? Pull ranked explanations from Reddit, Stack Overflow, Hacker News, Wikipedia, and arXiv — without leaving your course.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Feed it your material",
    body: "Drop in lecture slides, a textbook chapter, or paste your notes.",
  },
  {
    n: "02",
    title: "Axom builds your map",
    body: "It extracts concepts, ranks exam-likelihood, and generates cards and tests.",
  },
  {
    n: "03",
    title: "Study where it counts",
    body: "Practise, get diagnosed on mistakes, and review exactly when memory fades.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm">
                  Dashboard <ArrowRight />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-24 text-center sm:pt-32">
        <Reveal>
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" />
            For the student who refuses to fail twice
          </div>
        </Reveal>
        <Reveal delay={1}>
          <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
            From confused to confident,
            <br className="hidden sm:block" /> before the exam.
          </h1>
        </Reveal>
        <Reveal delay={2}>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Axom turns your own course material into a knowledge graph,
            reverse-engineers the exam, and rebuilds your understanding with the
            learning science that actually works. Not another flashcard app — a
            tutor.
          </p>
        </Reveal>
        <Reveal delay={3}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={user ? "/dashboard" : "/register"}>
              <Button size="lg" className="w-full sm:w-auto">
                {user ? "Open your dashboard" : "Start studying free"}
                <ArrowRight />
              </Button>
            </Link>
            <Link href="#how">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                See how it works
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground/70">
            Works fully offline with the built-in engine — no API key required.
          </p>
        </Reveal>
      </section>

      {/* Knowledge-graph motif */}
      <section className="mx-auto max-w-4xl px-6 pb-8 pt-4">
        <Reveal>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="px-6 pt-6">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Your course, as a graph
              </p>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                Every concept becomes a node, linked by prerequisite and
                relation. Axom studies the structure to know what to teach next.
              </p>
            </div>
            <GraphMotif className="px-6 pb-2" />
          </div>
        </Reveal>
      </section>

      {/* Problem framing */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Reveal>
          <div className="rounded-lg border border-border bg-card p-8 sm:p-12">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              The problem with every study tool
            </p>
            <p className="mt-5 text-balance text-xl font-medium leading-snug tracking-tight text-foreground sm:text-2xl">
              They quiz you and move on. They summarise without knowing what
              matters. They never notice when you only think you understand.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Axom is built around the failure modes of real students — the
              illusion of knowing, shallow recall, cramming the wrong things. It
              studies how you fail, then fixes it.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Reveal>
          <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Everything a good tutor would do
          </h2>
          <p className="mx-auto mb-14 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
            Seven systems working together to take you from material to mastery.
          </p>
        </Reveal>
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-card p-7 transition-colors hover:bg-[#16161a]"
            >
              <f.icon
                className="size-5 text-muted-foreground"
                strokeWidth={1.5}
              />
              <h3 className="mt-4 text-sm font-semibold tracking-tight text-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-4xl px-6 py-16">
        <Reveal>
          <h2 className="mb-14 text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            How it works
          </h2>
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <p className="font-mono text-xs text-muted-foreground/60">{s.n}</p>
              <h3 className="mt-3 text-sm font-semibold tracking-tight text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <Reveal>
          <div className="rounded-lg border border-border bg-card p-10 text-center sm:p-16">
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Build the understanding that lasts past the exam.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Start with one set of slides. Let Axom show you what studying
              should have felt like all along.
            </p>
            <Link href={user ? "/dashboard" : "/register"}>
              <Button size="lg" className="mt-8">
                {user ? "Go to dashboard" : "Create your free account"}
                <ArrowRight />
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <Logo />
          <p>Built for students who care about actually learning.</p>
        </div>
      </footer>
    </div>
  );
}
