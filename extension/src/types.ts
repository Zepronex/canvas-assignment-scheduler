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

export interface CanvasSettings {
  canvasUrl: string;
  canvasToken: string;
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
