import { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Fee, Student } from '../types/database';

interface FeesManagerProps {
  onUpdate: () => void;
}

export default function FeesManager({ onUpdate }: FeesManagerProps) {
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_type: '',
    payment_date: new Date().toISOString().split('T')[0],
    academic_year: new Date().getFullYear().toString(),
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [feesRes, studentsRes] = await Promise.all([
        supabase
          .from('fees')
          .select('*, student:students(*)')
          .eq('user_id', user.id)
          .order('payment_date', { ascending: false }),
        supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('full_name'),
      ]);

      if (feesRes.error) throw feesRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setFees(feesRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const feeData = {
        ...formData,
        amount: parseFloat(formData.amount),
        user_id: user.id,
      };

      if (editingFee) {
        const { error } = await supabase
          .from('fees')
          .update(feeData)
          .eq('id', editingFee.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fees')
          .insert([feeData]);

        if (error) throw error;
      }

      resetForm();
      loadData();
      onUpdate();
    } catch (error) {
      console.error('Error saving fee:', error);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;

    try {
      const { error } = await supabase
        .from('fees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
      onUpdate();
    } catch (error) {
      console.error('Error deleting fee:', error);
      alert('حدث خطأ أثناء حذف الدفعة');
    }
  };

  const handleEdit = (fee: Fee) => {
    setEditingFee(fee);
    setFormData({
      student_id: fee.student_id,
      amount: fee.amount.toString(),
      payment_type: fee.payment_type,
      payment_date: fee.payment_date,
      academic_year: fee.academic_year,
      notes: fee.notes,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      amount: '',
      payment_type: '',
      payment_date: new Date().toISOString().split('T')[0],
      academic_year: new Date().getFullYear().toString(),
      notes: '',
    });
    setEditingFee(null);
    setShowForm(false);
  };

  const filteredFees = fees.filter(fee =>
    fee.student?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.payment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.academic_year.includes(searchTerm)
  );

  const paymentTypes = [
    'رسوم دراسية',
    'رسوم الكتب',
    'رسوم الأنشطة',
    'رسوم الزي المدرسي',
    'رسوم الباص',
    'أخرى',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">تحصيل المصاريف</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة دفعة</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingFee ? 'تعديل الدفعة' : 'إضافة دفعة جديدة'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الطالب</label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">اختر الطالب</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} - {student.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الدفعة</label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">اختر نوع الدفعة</option>
                  {paymentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ (ج.م)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الدفع</label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السنة الدراسية</label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-all"
                >
                  {editingFee ? 'حفظ التعديلات' : 'إضافة الدفعة'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث في الدفعات..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredFees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد دفعات</h3>
          <p className="text-gray-600 mb-6">لم يتم تسجيل أي دفعات بعد</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-all"
          >
            إضافة أول دفعة
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFees.map((fee) => (
            <div key={fee.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      {fee.student?.full_name}
                    </h3>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {fee.payment_type}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">المبلغ:</span>
                      <span className="font-bold text-green-600 mr-2">{fee.amount.toFixed(2)} ج.م</span>
                    </div>
                    <div>
                      <span className="text-gray-600">التاريخ:</span>
                      <span className="font-medium text-gray-900 mr-2">{fee.payment_date}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">السنة:</span>
                      <span className="font-medium text-gray-900 mr-2">{fee.academic_year}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">الصف:</span>
                      <span className="font-medium text-gray-900 mr-2">{fee.student?.grade}</span>
                    </div>
                  </div>
                  {fee.notes && (
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">ملاحظات:</span> {fee.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(fee)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(fee.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
