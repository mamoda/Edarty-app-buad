// src/components/FeesManager.tsx (النسخة المحسنة)
import { useState, useEffect } from "react";
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  CheckCircle,
  CreditCard,
  Banknote,
  Landmark,
  FileText,
  Printer,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Fee, Student } from "../types/database";

interface FeesManagerProps {
  onUpdate: () => void;
}

export default function FeesManager({ onUpdate }: FeesManagerProps) {
  const { schoolId, user } = useAuth();

  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_type: "رسوم دراسية",
    payment_date: new Date().toISOString().split("T")[0],
    academic_year: new Date().getFullYear().toString(),
    notes: "",
    payment_method: "cash" as "cash" | "card" | "bank_transfer" | "check",
  });

  useEffect(() => {
    if (schoolId) {
      loadData();
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

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4 text-green-600" />;
      case 'card': return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'bank_transfer': return <Landmark className="w-4 h-4 text-purple-600" />;
      case 'check': return <FileText className="w-4 h-4 text-orange-600" />;
      default: return <DollarSign className="w-4 h-4 text-gray-400" />;
    }
  };

  const loadData = async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      // حساب تاريخ بداية ونهاية الشهر
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay}`;

      const [feesRes, studentsRes] = await Promise.all([
        supabase
          .from("fees")
          .select("*")
          .eq("school_id", schoolId)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .order("payment_date", { ascending: false }),
        supabase
          .from("students")
          .select("*")
          .eq("school_id", schoolId)
          .eq("status", "active")
          .order("full_name"),
      ]);

      if (feesRes.error) throw feesRes.error;
      if (studentsRes.error) throw studentsRes.error;

      // ربط بيانات الطلاب
      const feesWithStudents = (feesRes.data || []).map(fee => ({
        ...fee,
        student: studentsRes.data?.find(s => s.id === fee.student_id) || null
      }));

      setFees(feesWithStudents);
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      const notesData = {
        text: formData.notes,
        payment_method: formData.payment_method,
        timestamp: new Date().toISOString(),
      };

      const feeData = {
        student_id: formData.student_id,
        amount: parseFloat(formData.amount),
        payment_type: formData.payment_type,
        payment_date: formData.payment_date,
        academic_year: formData.academic_year,
        notes: JSON.stringify(notesData),
        school_id: schoolId,
        user_id: user?.id,
      };

      if (editingFee) {
        const { error } = await supabase
          .from("fees")
          .update(feeData)
          .eq("id", editingFee.id)
          .eq("school_id", schoolId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("fees").insert([feeData]);
        if (error) throw error;
      }

      resetForm();
      loadData();
      onUpdate();
    } catch (error) {
      console.error("Error saving fee:", error);
      alert("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدفعة؟")) return;

    try {
      const { error } = await supabase
        .from("fees")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      loadData();
      onUpdate();
    } catch (error) {
      console.error("Error deleting fee:", error);
      alert("حدث خطأ أثناء حذف الدفعة");
    }
  };

  const handleEdit = (fee: Fee) => {
    let paymentMethod = "cash";
    let notesText = "";
    
    if (fee.notes) {
      try {
        const notes = JSON.parse(fee.notes);
        paymentMethod = notes.payment_method || "cash";
        notesText = notes.text || "";
      } catch {
        notesText = fee.notes;
      }
    }

    setEditingFee(fee);
    setFormData({
      student_id: fee.student_id,
      amount: Math.abs(fee.amount).toString(),
      payment_type: fee.payment_type,
      payment_date: fee.payment_date,
      academic_year: fee.academic_year,
      notes: notesText,
      payment_method: paymentMethod as any,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      amount: "",
      payment_type: "رسوم دراسية",
      payment_date: new Date().toISOString().split("T")[0],
      academic_year: new Date().getFullYear().toString(),
      notes: "",
      payment_method: "cash",
    });
    setEditingFee(null);
    setShowForm(false);
  };

  const filteredFees = fees.filter(fee =>
    fee.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.payment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.academic_year.includes(searchTerm)
  );

  const paymentTypes = [
    "رسوم دراسية",
    "رسوم الكتب",
    "رسوم الأنشطة",
    "رسوم الزي المدرسي",
    "رسوم الباص",
    "دفعة مقدمة",
    "أخرى",
  ];

  const paymentMethods = [
    { value: "cash", label: "نقدي", icon: Banknote },
    { value: "card", label: "بطاقة ائتمان", icon: CreditCard },
    { value: "bank_transfer", label: "تحويل بنكي", icon: Landmark },
    { value: "check", label: "شيك", icon: FileText },
  ];

  // حساب الإحصائيات
  const totalCollected = fees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
  const totalPaid = fees.filter(f => f.amount > 0).reduce((sum, f) => sum + f.amount, 0);
  const totalRefunded = fees.filter(f => f.amount < 0).reduce((sum, f) => sum + Math.abs(f.amount), 0);
  const netCollected = totalPaid - totalRefunded;

  // حساب طرق الدفع
  const paymentMethodStats = {
    cash: 0,
    card: 0,
    bank_transfer: 0,
    check: 0,
  };

  fees.forEach(fee => {
    const amount = Math.abs(fee.amount);
    if (fee.notes) {
      try {
        const notes = JSON.parse(fee.notes);
        const method = notes.payment_method;
        if (method === 'cash') paymentMethodStats.cash += amount;
        else if (method === 'card') paymentMethodStats.card += amount;
        else if (method === 'bank_transfer') paymentMethodStats.bank_transfer += amount;
        else if (method === 'check') paymentMethodStats.check += amount;
        else paymentMethodStats.cash += amount;
      } catch {
        paymentMethodStats.cash += amount;
      }
    } else {
      paymentMethodStats.cash += amount;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">تحصيل المصاريف</h2>
          <p className="text-sm text-gray-500 mt-1">
            تسجيل ومتابعة المدفوعات والعمليات المالية
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">إضافة دفعة</span>
          </button>
          <button
            onClick={() => loadData()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="تحديث"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
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
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 text-sm"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 text-sm"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
            <Wallet className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">صافي التحصيل:</span>
            <span className="text-xl font-bold text-green-600">
              {formatNumber(netCollected)} ج.م
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
                <p className="text-sm font-medium text-gray-500">إجمالي المدفوعات</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(totalPaid)} ج.م</p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500">إجمالي الاستردادات</p>
                <p className="text-2xl font-bold text-red-600">{formatNumber(totalRefunded)} ج.م</p>
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
                <p className="text-sm font-medium text-gray-500">عدد العمليات</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(fees.length, 0)}</p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500">متوسط الدفعة</p>
                <p className="text-2xl font-bold text-purple-600">
                  {fees.length > 0 ? formatNumber(netCollected / fees.length) : "٠"} ج.م
                </p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Banknote className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مدفوعات نقدية</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(paymentMethodStats.cash)} ج.م</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مدفوعات بطاقة</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(paymentMethodStats.card)} ج.م</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Landmark className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تحويل بنكي</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(paymentMethodStats.bank_transfer)} ج.م</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">شيكات</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(paymentMethodStats.check)} ج.م</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث بالطالب أو نوع الدفعة أو السنة..."
            className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
          />
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingFee ? "تعديل الدفعة" : "إضافة دفعة جديدة"}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الطالب <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الدفعة <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  required
                >
                  <option value="">اختر نوع الدفعة</option>
                  {paymentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  طريقة الدفع <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ (ج.م) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الدفع <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السنة الدراسية
                </label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 resize-none"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-medium"
                >
                  {editingFee ? "حفظ التعديلات" : "إضافة الدفعة"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-xl transition-all duration-300 font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fees List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">جاري تحميل البيانات...</p>
          </div>
        </div>
      ) : filteredFees.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-12 text-center border border-gray-100/50">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد دفعات</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? "لا توجد نتائج للبحث" : `لم يتم تسجيل أي دفعات لشهر ${getMonthName(selectedMonth)} ${selectedYear}`}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-xl transition-all duration-300 shadow-md"
          >
            إضافة أول دفعة
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFees.map((fee) => {
            let paymentMethod = "cash";
            if (fee.notes) {
              try {
                const notes = JSON.parse(fee.notes);
                paymentMethod = notes.payment_method || "cash";
              } catch {}
            }

            return (
              <div
                key={fee.id}
                className="group bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
              >
                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {fee.student?.full_name || "طالب غير معروف"}
                        </h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {fee.payment_type}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {getPaymentMethodIcon(paymentMethod)}
                          <span>
                            {paymentMethod === 'cash' ? 'نقدي' :
                             paymentMethod === 'card' ? 'بطاقة' :
                             paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}
                          </span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">المبلغ:</span>
                          <span className="font-bold text-green-600">
                            {formatNumber(Math.abs(fee.amount))} ج.م
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">التاريخ:</span>
                          <span className="font-medium text-gray-900">{fee.payment_date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">السنة:</span>
                          <span className="font-medium text-gray-900">{fee.academic_year}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">الصف:</span>
                          <span className="font-medium text-gray-900">{fee.student?.grade || "-"}</span>
                        </div>
                      </div>

                      {fee.notes && (
                        <div className="mt-3 flex items-start gap-2 text-sm">
                          <span className="text-gray-600">ملاحظات:</span>
                          <span className="text-gray-700">
                            {(() => {
                              try {
                                const notes = JSON.parse(fee.notes);
                                return notes.text || fee.notes;
                              } catch {
                                return fee.notes;
                              }
                            })()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mr-4">
                      <button
                        onClick={() => handleEdit(fee)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="تعديل"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(fee.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar for amount */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
                    <div
                      className="h-full bg-gradient-to-r from-green-600 to-emerald-600 rounded-full"
                      style={{ width: `${Math.min(100, (Math.abs(fee.amount) / totalPaid) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}