export interface CanvasCourse {
  id: number;
  name: string;
  course_code?: string | null;
  workflow_state?: string;
  access_restricted_by_date?: boolean;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  course_id: number;
  due_at: string | null;
  points_possible: number | null;
  html_url: string;
  workflow_state: string;
  updated_at: string;
}

export interface NormalizedAssignment {
  id: CanvasAssignment['id'];
  courseId: CanvasCourse['id'];
  courseName: string;
  name: string;
  dueAt: string | null;
  htmlUrl: string;
  pointsPossible: number | null;
  workflowState: string;
  updatedAt: string;
}

export interface CanvasSettings {
  canvasUrl: string;
  canvasToken: string;
}

export interface AssignmentSyncResult {
  courses: CanvasCourse[];
  assignments: NormalizedAssignment[];
  lastSyncedAt: string;
}

// Legacy cache types remain until the storage schema migration is committed.
export interface Course {
  id: number;
  name: string;
  course_code: string | null;
  access_restricted_by_date?: boolean;
}

export interface Assignment {
  id: number;
  name: string;
  course_name: string;
  course_id: number;
  due_at: string | null;
  due_date_formatted?: string | null;
  points_possible: number | null;
  html_url: string;
  description?: string;
  submission_types?: string[];
  is_quiz_assignment?: boolean;
}

export interface UserInfo {
  id: number;
  name: string;
  email: string | null;
  login_id?: string;
}

export interface AssignmentCache {
  user: UserInfo | null;
  courses: Course[];
  assignments: Assignment[];
  savedAt: number;
}

export type AssignmentNotes = Record<string, string>;

export type AssignmentSortBy = 'date' | 'course';
export type AssignmentStatusFilter = 'all' | 'upcoming' | 'overdue' | 'no-date';
export type SortOrder = 'asc' | 'desc';
