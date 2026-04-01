export interface schools {
  id: string;
  name: string;
}

export interface school_user {
  user_id: string;
  school_id: string;
  role: 'owner' | 'admin' | 'teacher' | 'accountant';
}
// Define for testing purposes

// this is the center of our app, it will be used to store all the data related to students, fees, expenses and statistics
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
}

export interface Statistics {
  totalStudents: number;
  activeStudents: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}


export interface TeacherSalary {
  id: string;
  teacher_id: string | null;
  month: number;
  year: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  school_id: string;
}
