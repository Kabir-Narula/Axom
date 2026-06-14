export interface CourseView {
  id: string;
  title: string;
  code: string | null;
  color: string;
  examDate: string | null;
  counts: {
    documents: number;
    knowledgeNodes: number;
    cards: number;
    notes: number;
    quizzes: number;
  };
}

export interface DocumentView {
  id: string;
  title: string;
  kind: string;
  status: string;
  pageCount: number;
  sizeBytes: number;
  createdAt: string;
  conceptCount: number;
}

export interface ConceptView {
  id: string;
  label: string;
  summary: string;
  keyTerms: string[];
  importance: number;
  difficulty: number;
  mastery: number;
  sourceRef: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  style: string;
  createdAt: string;
}

export interface QuizListItem {
  id: string;
  title: string;
  difficulty: string;
  mode: string;
  createdAt: string;
  completedAt: string | null;
  scorePct: number | null;
  questionCount: number;
}

export interface PlanTaskView {
  id: string;
  date: string;
  kind: string;
  title: string;
  durationMin: number;
  status: string;
}

export interface PlanView {
  id: string;
  examDate: string;
  dailyMinutes: number;
  tasks: PlanTaskView[];
}
