/*
  # School Accounting System Database Schema

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `full_name` (text) - اسم الطالب الكامل
      - `grade` (text) - الصف الدراسي
      - `parent_name` (text) - اسم ولي الأمر
      - `parent_phone` (text) - رقم هاتف ولي الأمر
      - `enrollment_date` (date) - تاريخ التسجيل
      - `status` (text) - active/inactive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `fees`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `student_id` (uuid, foreign key to students)
      - `amount` (numeric) - المبلغ
      - `payment_type` (text) - نوع الدفعة (رسوم دراسية، كتب، أنشطة، إلخ)
      - `payment_date` (date) - تاريخ الدفع
      - `academic_year` (text) - السنة الدراسية
      - `notes` (text) - ملاحظات
      - `created_at` (timestamptz)
    
    - `expenses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `category` (text) - فئة المصروف (رواتب، صيانة، إيجار، إلخ)
      - `amount` (numeric) - المبلغ
      - `description` (text) - الوصف
      - `expense_date` (date) - تاريخ المصروف
      - `notes` (text) - ملاحظات
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own school data
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  full_name text NOT NULL,
  grade text NOT NULL,
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  enrollment_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fees table
CREATE TABLE IF NOT EXISTS fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  student_id uuid REFERENCES students ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  payment_type text NOT NULL,
  payment_date date DEFAULT CURRENT_DATE,
  academic_year text NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  category text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  expense_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Students policies
CREATE POLICY "Users can view own students"
  ON students FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own students"
  ON students FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own students"
  ON students FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fees policies
CREATE POLICY "Users can view own fees"
  ON fees FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fees"
  ON fees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fees"
  ON fees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fees"
  ON fees FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_fees_user_id ON fees(user_id);
CREATE INDEX IF NOT EXISTS idx_fees_student_id ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_fees_payment_date ON fees(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);