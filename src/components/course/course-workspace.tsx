"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutGrid,
  FileText,
  Network,
  NotebookPen,
  Target,
  CalendarClock,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OverviewPanel } from "./overview-panel";
import { UploadPanel } from "./upload-panel";
import { KnowledgePanel } from "./knowledge-panel";
import { NotesPanel } from "./notes-panel";
import { TestsPanel } from "./tests-panel";
import { PlanPanel } from "./plan-panel";
import { ResourcesPanel } from "./resources-panel";
import type {
  CourseView,
  DocumentView,
  ConceptView,
  NoteListItem,
  QuizListItem,
  PlanView,
} from "./types";

type Tab =
  | "overview"
  | "materials"
  | "knowledge"
  | "notes"
  | "tests"
  | "plan"
  | "resources";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "materials", label: "Materials", icon: FileText },
  { id: "knowledge", label: "Knowledge", icon: Network },
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "tests", label: "Tests", icon: Target },
  { id: "plan", label: "Plan", icon: CalendarClock },
  { id: "resources", label: "Resources", icon: Globe },
];

const VALID_TABS = new Set<Tab>([
  "overview",
  "materials",
  "knowledge",
  "notes",
  "tests",
  "plan",
  "resources",
]);

export function CourseWorkspace({
  course,
  documents,
  concepts,
  notes,
  quizzes,
  plan,
  initialTab,
  initialResourceQuery,
}: {
  course: CourseView;
  documents: DocumentView[];
  concepts: ConceptView[];
  notes: NoteListItem[];
  quizzes: QuizListItem[];
  plan: PlanView | null;
  initialTab?: string;
  initialResourceQuery?: string;
}) {
  const [tab, setTab] = useState<Tab>(
    initialTab && VALID_TABS.has(initialTab as Tab)
      ? (initialTab as Tab)
      : "overview"
  );
  const hasConcepts = concepts.length > 0;

  return (
    <div>
      <div className="mb-8 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm transition-colors",
                active
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="size-4" strokeWidth={1.75} />
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "overview" && (
            <OverviewPanel
              courseId={course.id}
              concepts={concepts}
              examDate={course.examDate}
            />
          )}
          {tab === "materials" && (
            <UploadPanel courseId={course.id} documents={documents} />
          )}
          {tab === "knowledge" && (
            <KnowledgePanel courseId={course.id} concepts={concepts} />
          )}
          {tab === "notes" && (
            <NotesPanel
              courseId={course.id}
              notes={notes}
              hasConcepts={hasConcepts}
            />
          )}
        {tab === "tests" && (
          <TestsPanel
            courseId={course.id}
            quizzes={quizzes}
            hasConcepts={hasConcepts}
            conceptCount={concepts.length}
          />
        )}
          {tab === "plan" && (
            <PlanPanel
              courseId={course.id}
              plan={plan}
              examDate={course.examDate}
              hasConcepts={hasConcepts}
            />
          )}
          {tab === "resources" && (
            <ResourcesPanel
              conceptLabels={concepts.map((c) => c.label)}
              initialQuery={initialResourceQuery}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
