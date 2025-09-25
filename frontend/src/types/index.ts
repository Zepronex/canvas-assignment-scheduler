// shared types for the canvas assignment scheduler app

export interface Course {
  id: number;
  name: string;
  course_code: string;
}

export interface Assignment {
  id: number;
  name: string;
  course_name: string;
  course_id: number;
  due_at: string | null;
  due_date_formatted: string | null;
  points_possible: number;
  html_url: string;
  description: string;
  submission_types: string[];
}

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  login_id: string;
}
