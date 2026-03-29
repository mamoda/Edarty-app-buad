import { useState, useEffect } from 'react';
import { TrendingDown, Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Expense } from '../types/database';

interface ExpensesManagerProps {
  onUpdate: () => void;
}

export default function ExpensesManager({ onUpdate }: ExpensesManagerProps) {
  const { schoolId } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (schoolId) {
      loadExpenses();
    }
  }, [schoolId]);

  const loadExpenses = async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('school_id', schoolId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update({
            ...expenseData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingExpense.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([
            {
              ...expenseData,
              school_id: schoolId,
            },
          ]);

        if (error) throw error;
      }

      resetForm();
      loadExpenses();
      onUpdate();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadExpenses();
      onUpdate();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('حدث خطأ أثناء حذف المصروف');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      expense_date: expense.expense_date,
      notes: expense.notes,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      description: '',
      expense_date: new Date().toISOString().split('T')[0],
      notes: '',
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
    'رواتب المعلمين',
    'رواتب الإداريين',
    'صيانة المباني',
    'الكهرباء والماء',
    'الإنترنت والاتصالات',
    'القرطاسية',
    'التنظيفات',
    'الأمن',
    'النقل',
    'أخرى',
  ];

  const categoryTotals = categories
    .map((cat) => ({
      category: cat,
      total: expenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    }))
    .filter((c) => c.total > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">إدارة التكاليف</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مصروف</span>
        </button>
      </div>

      {/* CATEGORY SUMMARY */}
      {categoryTotals.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold mb-4">
            ملخص التكاليف حسب الفئة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryTotals.map(({ category, total }) => (
              <div
                key={category}
                className="flex justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span>{category}</span>
                <span className="font-bold text-red-600">
                  {total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b flex justify-between">
              <h3 className="font-bold">
                {editingExpense ? 'تعديل المصروف' : 'إضافة مصروف'}
              </h3>
              <button onClick={resetForm}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              >
                <option value="">اختر الفئة</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <input
                placeholder="الوصف"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />

              <input
                type="number"
                step="0.01"
                placeholder="المبلغ"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />

              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) =>
                  setFormData({ ...formData, expense_date: e.target.value })
                }
                className="w-full border p-2 rounded"
              />

              <textarea
                placeholder="ملاحظات"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full border p-2 rounded"
              />

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-2 rounded"
              >
                حفظ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 p-2 border rounded"
          />
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center text-gray-500">لا توجد مصروفات</div>
      ) : (
        <div className="grid gap-4">
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white p-4 rounded-xl shadow flex justify-between"
            >
              <div>
                <h3 className="font-bold">{expense.description}</h3>
                <p className="text-sm text-gray-500">
                  {expense.category}
                </p>
                <p className="text-sm">{expense.expense_date}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleEdit(expense)}>
                  <Edit2 />
                </button>
                <button onClick={() => handleDelete(expense.id)}>
                  <Trash2 className="text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}