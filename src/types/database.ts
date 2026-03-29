export interface Student {
  id: string;
  user_id: string;
  full_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  enrollment_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  school_id:string;
}

export interface Fee {
  id: string;
  user_id: string;
  student_id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  academic_year: string;
  notes: string;
  created_at: string;
  student?: Student;
}

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  notes: string;
  created_at: string;
}

export interface Statistics {
  totalStudents: number;
  activeStudents: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}
