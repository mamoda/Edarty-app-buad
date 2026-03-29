import { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  TrendingDown,
  TrendingUp,
  LogOut,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Statistics } from "../types/database";
import StudentsManager from "./StudentsManager";
import FeesManager from "./FeesManager";
import ExpensesManager from "./ExpensesManager";
import ProfitReport from "./ProfitReport";
import UsersManager from "./UsersManager";

type View =
  | "dashboard"
  | "students"
  | "fees"
  | "expenses"
  | "reports"
  | "users";

export default function Dashboard() {
  const { user, schoolId, role, signOut } = useAuth();

  const [currentView, setCurrentView] = useState<View>("dashboard");

  const [stats, setStats] = useState<Statistics>({
    totalStudents: 0,
    activeStudents: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
  });

  const [loading, setLoading] = useState(false);
  // تحميل الإحصائيات
const loadStatistics = async () => {
  if (!schoolId) {
    setLoading(false);
    return;
  }
  setLoading(true); // ✅ لازم هنا


  try {
    const [studentsRes, feesRes, expensesRes] = await Promise.all([
      supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('school_id', schoolId),

      supabase.from('fees').select('amount'),

      supabase.from('expenses').select('amount'),
    ]);

    const totalStudents = studentsRes.count || 0;

    const activeStudents =
      studentsRes.data?.filter((s) => s.status === 'active').length || 0;

    const totalRevenue =
      feesRes.data?.reduce((sum, fee) => sum + Number(fee.amount || 0), 0) || 0;

    const totalExpenses =
      expensesRes.data?.reduce((sum, exp) => sum + Number(exp.amount || 0), 0) || 0;

    setStats({
      totalStudents,
      activeStudents,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
    });
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    if (!schoolId) return;

    loadStatistics();
  }, [schoolId]);

  useEffect(() => {
    if (schoolId === null) {
      setLoading(false);
    }
  }, [schoolId]);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    if (view === "dashboard") {
      loadStatistics();
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, prefix = "" }: any) => (
    <div
      className="bg-white rounded-xl shadow-md p-6 border-r-4"
      style={{ borderColor: color }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {prefix}
            {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
          </p>
        </div>
        <div
          className="p-3 rounded-full"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );

  const MenuItem = ({ label, icon: Icon, view }: any) => (
    <button
      onClick={() => handleViewChange(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        currentView === view
          ? "bg-blue-600 text-white shadow-md"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1 text-right font-medium">{label}</span>
    </button>
  );

  // ⛔ لو مفيش مدرسة
  if (!schoolId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">لا يوجد مدرسة مرتبطة بالمستخدم</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">إدارتــي</h1>
              <p className="text-sm text-gray-600">
                {user?.email} • {role}
              </p>
            </div>
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside>
          <div className="bg-white p-4 rounded-xl shadow space-y-2 sticky top-24">
            <MenuItem label="لوحة التحكم" icon={BarChart3} view="dashboard" />
            <MenuItem label="الطلاب" icon={Users} view="students" />

            {(role === "owner" || role === "accountant") && (
              <MenuItem label="تحصيل المصاريف" icon={DollarSign} view="fees" />
            )}

            {role !== "teacher" && (
              <MenuItem label="التكاليف" icon={TrendingDown} view="expenses" />
            )}

            <MenuItem label="تقرير الأرباح" icon={TrendingUp} view="reports" />

            {role === "owner" && (
              <MenuItem label="إدارة المستخدمين" icon={Users} view="users" />
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="lg:col-span-3">
          {currentView === "dashboard" && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-12">Loading...</div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <StatCard
                      title="إجمالي الطلاب"
                      value={stats.totalStudents}
                      icon={Users}
                      color="#3b82f6"
                    />
                    <StatCard
                      title="الطلاب النشطون"
                      value={stats.activeStudents}
                      icon={UserPlus}
                      color="#10b981"
                    />
                    <StatCard
                      title="الإيرادات"
                      value={stats.totalRevenue}
                      icon={DollarSign}
                      color="#8b5cf6"
                      prefix="ج.م"
                    />
                    <StatCard
                      title="التكاليف"
                      value={stats.totalExpenses}
                      icon={TrendingDown}
                      color="#ef4444"
                      prefix="ج.م"
                    />
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow">
                    <h3 className="text-xl font-bold mb-2">صافي الربح</h3>
                    <p
                      className={`text-3xl font-bold ${stats.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {stats.netProfit} ج.م
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {currentView === "students" && (
            <StudentsManager onUpdate={loadStatistics} />
          )}
          {currentView === "fees" && <FeesManager onUpdate={loadStatistics} />}
          {currentView === "expenses" && (
            <ExpensesManager onUpdate={loadStatistics} />
          )}
          {currentView === "reports" && <ProfitReport />}
          {currentView === "users" && role === "owner" && <UsersManager />}
        </main>
      </div>
    </div>
  );
}
