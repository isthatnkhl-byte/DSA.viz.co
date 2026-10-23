export type NoteSourceType =
  | "COMPILER_CODE"
  | "VISUALIZER_TRACE"
  | "SMARTBOARD_WHITEBOARD"
  | "AI_LEARNING_MODULE"
  | "PROBLEM_SOLUTION"
  | "CUSTOM_NOTE";

export interface NotesBagItem {
  id: string;
  title: string;
  sourceType: NoteSourceType;
  sourceUrl?: string;
  problemSlug?: string;
  createdAt: number;
  tags: string[];

  // Code content
  codeSnippet?: string;
  codeLanguage?: string;
  compilerOutput?: string;

  // Whiteboard / Image content
  canvasSnapshotUrl?: string;
  whiteboardElements?: any[];

  // State & Invariant content
  stateJson?: Record<string, any>;
  activePointers?: Record<string, any>;
  invariantText?: string;
  explanation?: string;

  // Student annotations & AI synthesis
  userNotes?: string;
  aiTakeaway?: string;
}

export interface PdfCompilationConfig {
  documentTitle: string;
  itemsPerPage: number; // 2 or 3 items per page
  styleTheme?: "HANDWRITTEN_NOTEBOOK" | "CLEAN_MINIMAL" | "DARK_CHALKBOARD";
  includeAiSummaries?: boolean;
  selectedItemIds?: string[];
}

export interface PdfCompilationResponse {
  ok: boolean;
  title: string;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  htmlDocument: string;
  summary?: string;
}
