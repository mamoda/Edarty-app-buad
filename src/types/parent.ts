// src/types/parent.ts
export interface Parent {
  id: string;
  user_id: string;
  school_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  relationship: 'father' | 'mother' | 'guardian';
  national_id: string;
  created_at: string;
  updated_at: string;
}

export interface StudentParent {
  id: string;
  student_id: string;
  parent_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface StudentBehavior {
  id: string;
  student_id: string;
  teacher_id: string;
  date: string;
  type: 'positive' | 'negative' | 'warning';
  category: 'attendance' | 'homework' | 'conduct' | 'participation' | 'other';
  description: string;
  points: number;
  created_at: string;
}

export interface TeacherEvaluation {
  id: string;
  student_id: string;
  teacher_id: string;
  subject: string;
  date: string;
  evaluation_type: 'academic' | 'behavioral' | 'social';
  rating: number; // 1-5
  comments: string;
  created_at: string;
}

export interface ExamResult {
  id: string;
  student_id: string;
  subject_id: string;
  exam_name: string;
  exam_date: string;
  max_score: number;
  obtained_score: number;
  percentage: number;
  grade: string;
  term: 'first' | 'second' | 'final';
  academic_year: string;
  created_at: string;
}

export interface StudentFinancial {
  id: string;
  student_id: string;
  fee_type: 'tuition' | 'transport' | 'books' | 'activities' | 'other';
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  payment_date?: string;
  notes?: string;
  created_at: string;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  created_at: string;
}

export interface StudentWithDetails {
  student: any;
  behaviors: StudentBehavior[];
  evaluations: TeacherEvaluation[];
  examResults: ExamResult[];
  financial: StudentFinancial[];
  attendance: StudentAttendance[];
}