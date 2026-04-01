// src/types/database.ts

// ============================================
// الأنواع الأساسية
// ============================================

export interface School {
  id: string;
  name: string;
  email?: string;
  address?: string;
  phone?: string;
  tax_number?: string;
  subscription_plan?: 'free' | 'basic' | 'pro' | 'enterprise';
  subscription_expires_at?: string;
  features?: string[];
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolUser {
  id?: string;
  user_id: string;
  school_id: string;
  role: 'owner' | 'admin' | 'teacher' | 'accountant';
  is_primary?: boolean;
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// الطلاب
// ============================================
export interface Student {
  id: string;
  school_id: string;
  full_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  enrollment_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ============================================
// المعلمين
// ============================================
export interface Teacher {
  id: string;
  school_id: string;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  salary: number;
  hire_date: string;
  status: 'active' | 'inactive';
  address?: string | null;
  qualifications?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// رواتب المعلمين
// ============================================
export interface TeacherSalary {
  id: string;
  teacher_id: string;
  school_id: string;
  month: number;
  year: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// المصروفات والرسوم
// ============================================
export interface Fee {
  id: string;
  school_id: string;
  student_id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  academic_year: string;
  notes: string;
  created_at: string;
  updated_at: string;
  student?: Student;
}

export interface Expense {
  id: string;
  school_id: string;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// إحصائيات
// ============================================
export interface Statistics {
  totalStudents: number;
  activeStudents: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

// ============================================
// أولياء الأمور
// ============================================
export interface Parent {
  id: string;
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

// ============================================
// السلوك والتقييمات
// ============================================
export interface StudentBehavior {
  id: string;
  student_id: string;
  teacher_id: string;
  school_id: string;
  date: string;
  type: 'positive' | 'negative' | 'warning';
  category: 'attendance' | 'homework' | 'conduct' | 'participation' | 'other';
  description: string;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherEvaluation {
  id: string;
  student_id: string;
  teacher_id: string;
  school_id: string;
  subject: string;
  date: string;
  evaluation_type: 'academic' | 'behavioral' | 'social';
  rating: number;
  comments: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// الامتحانات والنتائج
// ============================================
export interface Exam {
  id: string;
  school_id: string;
  name: string;
  term: 'first' | 'second' | 'final';
  academic_year: string;
  start_date: string;
  end_date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  teacher_id?: string;
  max_score: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ExamResult {
  id: string;
  student_id: string;
  exam_id: string;
  subject_id: string;
  school_id: string;
  exam_name: string;
  exam_date: string;
  max_score: number;
  obtained_score: number;
  percentage: number;
  grade: string;
  term: 'first' | 'second' | 'final';
  academic_year: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// الحضور والغياب
// ============================================
export interface StudentAttendance {
  id: string;
  student_id: string;
  school_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// المعاملات المالية للطلاب
// ============================================
export interface StudentFinancial {
  id: string;
  student_id: string;
  school_id: string;
  fee_type: 'tuition' | 'transport' | 'books' | 'activities' | 'other';
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// سجل الأنشطة
// ============================================
export interface ActivityLog {
  id: string;
  user_id: string;
  school_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================
// الأنواع المركبة
// ============================================
export interface StudentWithDetails {
  student: Student;
  behaviors: StudentBehavior[];
  evaluations: TeacherEvaluation[];
  examResults: ExamResult[];
  financial: StudentFinancial[];
  attendance: StudentAttendance[];
  parents?: Parent[];
}

export interface EnhancedStatistics extends Statistics {
  totalRefunds: number;
  netRevenue: number;
  paidStudents: number;
  partialPaidStudents: number;
  unpaidStudents: number;
  collectionRate: number;
  cashPayments: number;
  cardPayments: number;
  bankTransferPayments: number;
  checkPayments: number;
  todayCollections: number;
  thisWeekCollections: number;
  thisMonthCollections: number;
  totalSalaries: number;
  activeTeachers: number;
  totalTeachers: number;
  totalParents: number;
}