import { z } from "zod";
import { RESOURCE_SOURCES } from "@/lib/resources/types";

// Centralized allowed values (SQLite has no native enums, so we enforce here).
export const DOC_KINDS = ["slides", "pdf", "notes", "textbook"] as const;
export const NOTE_STYLES = [
  "cornell",
  "mindmap",
  "eli5",
  "exam",
  "formal",
  "analogy",
] as const;
export const DIFFICULTIES = ["easy", "medium", "hard", "exam", "trick"] as const;
export const QUESTION_TYPES = [
  "mcq",
  "short",
  "long",
  "cloze",
  "truefalse",
  "code",
  "case",
] as const;
export const QUIZ_MODES = ["practice", "timed"] as const;
export const TASK_KINDS = ["learn", "review", "practice", "exam-sim"] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];
export type NoteStyle = (typeof NOTE_STYLES)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(160),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(160),
  password: z.string().min(1, "Password is required").max(128),
});

export const courseSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(120),
  code: z.string().trim().max(40).optional().or(z.literal("")),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color")
    .default("#7c6cff"),
  examDate: z.string().datetime().optional().or(z.literal("")),
});

export const documentSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  kind: z.enum(DOC_KINDS).default("notes"),
  contentText: z.string().min(1, "Document appears to be empty").max(2_000_000),
  mimeType: z.string().max(120).default("text/plain"),
  sizeBytes: z.number().int().nonnegative().default(0),
  pageCount: z.number().int().positive().default(1),
});

export const generateNotesSchema = z.object({
  courseId: z.string().min(1),
  documentId: z.string().min(1).optional(),
  style: z.enum(NOTE_STYLES).default("cornell"),
});

export const generateQuizSchema = z.object({
  courseId: z.string().min(1),
  difficulty: z.enum(DIFFICULTIES).default("medium"),
  mode: z.enum(QUIZ_MODES).default("practice"),
  questionCount: z.number().int().min(3).max(30).default(8),
  types: z.array(z.enum(QUESTION_TYPES)).min(1).default(["mcq", "short"]),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  response: z.string().max(10_000).default(""),
  confidence: z.number().int().min(1).max(5).default(3),
  timeMs: z.number().int().nonnegative().max(3_600_000).default(0),
});

export const reviewCardSchema = z.object({
  cardId: z.string().min(1),
  grade: z.number().int().min(0).max(5),
});

export const studyPlanSchema = z.object({
  courseId: z.string().min(1),
  examDate: z.string().datetime(),
  dailyMinutes: z.number().int().min(15).max(480).default(60),
});

export const resourceSearchSchema = z.object({
  q: z.string().trim().min(2, "Enter at least 2 characters").max(200),
  sources: z.array(z.enum(RESOURCE_SOURCES)).min(1).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
