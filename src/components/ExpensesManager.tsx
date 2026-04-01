// src/components/ExpensesManager.tsx
import { useState, useEffect } from "react";
import { TrendingDown, Plus, Edit2, Trash2, Search, X, Calendar } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Expense } from "../types/database";

interface ExpensesManagerProps {
  onUpdate: () => void;
}

export default function ExpensesManager({ onUpdate }: ExpensesManagerProps) {
  const { schoolId, user } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (schoolId) {
      loadExpenses();
    }
  }, [schoolId, selectedMonth, selectedYear]);

  const formatNumber = (num: number, fractionDigits: number = 2) => {
    return Number(num).toLocaleString("ar-EG", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const getMonthName = (month: number) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[month - 1];
  };

  const loadExpenses = async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      // حساب أول يوم في الشهر
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      
      // حساب آخر يوم في الشهر بشكل صحيح
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay}`;

      console.log(`📅 Loading expenses from ${startDate} to ${endDate}`);

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("school_id", schoolId)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error loading expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      const expenseData = {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        notes: formData.notes,
        school_id: schoolId,
        user_id: user?.id,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editingExpense.id)
          .eq("school_id", schoolId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert([expenseData]);

        if (error) throw error;
      }

      resetForm();
      loadExpenses();
      onUpdate();
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      loadExpenses();
      onUpdate();
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("حدث خطأ أثناء حذف المصروف");
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      expense_date: expense.expense_date,
      notes: expense.notes || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      category: "",
      amount: "",
      description: "",
      expense_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setEditingExpense(null);
    setShowForm(false);
  };

  const filteredExpenses = expenses.filter(
    (expense) =>
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [
    "رواتب المعلمين",
    "رواتب الإداريين",
    "صيانة المباني",
    "الكهرباء والماء",
    "الإنترنت والاتصالات",
    "القرطاسية",
    "التنظيفات",
    "الأمن",
    "النقل",
    "أخرى",
  ];

  const totalExpensesThisMonth = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const categoryTotals = categories
    .map((cat) => ({
      category: cat,
      total: expenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة التكاليف</h2>
          <p className="text-sm text-gray-500 mt-1">
            تسجيل ومتابعة المصروفات الشهرية
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">إضافة مصروف</span>
        </button>
      </div>

      {/* Filter and Summary */}
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">تصفية حسب:</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-gray-50/50 text-sm"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-gray-50/50 text-sm"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl">
            <span className="text-sm text-gray-600">إجمالي المصروفات:</span>
            <span className="text-xl font-bold text-red-600">
              {formatNumber(totalExpensesThisMonth)} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500">عدد المصروفات</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(expenses.length, 0)}</p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl shadow-lg">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500">متوسط المصروف</p>
                <p className="text-2xl font-bold text-gray-900">
                  {expenses.length > 0 ? formatNumber(totalExpensesThisMonth / expenses.length) : "٠"} ج.م
                </p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl shadow-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500">أعلى فئة</p>
                <p className="text-2xl font-bold text-gray-900 truncate">
                  {categoryTotals[0]?.category?.slice(0, 15) || "---"}
                </p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500">أقل فئة</p>
                <p className="text-2xl font-bold text-gray-900 truncate">
                  {categoryTotals[categoryTotals.length - 1]?.category?.slice(0, 15) || "---"}
                </p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Summary */}
      {categoryTotals.length > 0 && (
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-6 border border-gray-100/50">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            ملخص التكاليف حسب الفئة - {getMonthName(selectedMonth)} {selectedYear}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryTotals.map(({ category, total }) => {
              const percentage = (total / totalExpensesThisMonth) * 100;
              return (
                <div key={category} className="p-3 bg-gray-50 rounded-xl hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{category}</span>
                    <span className="text-sm font-bold text-red-600">
                      {formatNumber(total)} ج.م
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-600 to-rose-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-left mt-1">
                    <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث بالوصف أو الفئة..."
            className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-gray-50/50"
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}
              </h3>
              <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">فئة المصروف *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 bg-gray-50/50"
                  required
                >
                  <option value="">اختر الفئة</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوصف *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 bg-gray-50/50"
                  placeholder="مثال: راتب شهر يناير"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 bg-gray-50/50"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ المصروف *</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 bg-gray-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 bg-gray-50/50 resize-none"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-2.5 rounded-xl font-medium">
                  {editingExpense ? "حفظ التعديلات" : "إضافة المصروف"}
                </button>
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-xl p-12 text-center border border-gray-100/50">
          <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مصروفات</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? "لا توجد نتائج للبحث" : `لم يتم تسجيل أي مصروفات لشهر ${getMonthName(selectedMonth)} ${selectedYear}`}
          </p>
          <button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-2 rounded-xl">
            إضافة أول مصروف
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredExpenses.map((expense) => (
            <div key={expense.id} className="group bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all overflow-hidden border border-gray-100/50">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{expense.description}</h3>
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">{expense.category}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">المبلغ:</span>
                        <span className="font-bold text-red-600">{formatNumber(expense.amount)} ج.م</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">التاريخ:</span>
                        <span>{new Date(expense.expense_date).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">نسبة من الإجمالي:</span>
                        <span className="font-medium">{((expense.amount / totalExpensesThisMonth) * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    {expense.notes && (
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">ملاحظات:</span> {expense.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mr-4">
                    <button onClick={() => handleEdit(expense)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(expense.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
                  <div className="h-full bg-gradient-to-r from-red-600 to-rose-600 rounded-full" style={{ width: `${((expense.amount / totalExpensesThisMonth) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}