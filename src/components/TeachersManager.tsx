// src/components/TeachersManager.tsx
import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  CreditCard as Edit2,
  Trash2,
  Search,
  X,
  DollarSign,
  CheckCircle,
  XCircle,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  FileText,
  Calendar,
  Clock,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Teacher, TeacherSalary } from "../types/database";

interface TeachersManagerProps {
  onUpdate: () => void;
  onSalaryProcessed?: () => void;
}

// دوال التنسيق
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

export default function TeachersManager({ onUpdate, onSalaryProcessed }: TeachersManagerProps) {
  const { currentSchool, user, userProfile } = useAuth(); 
  
  const schoolId = currentSchool?.schoolId;
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salaryStatus, setSalaryStatus] = useState<Record<string, TeacherSalary>>({});
  const [pendingSalaries, setPendingSalaries] = useState<(TeacherSalary & { teachers: Teacher })[]>([]);
  const [processing, setProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    specialization: "",
    salary: "",
    hire_date: new Date().toISOString().split("T")[0],
    status: "active" as "active" | "inactive",
    address: "",
    qualifications: "",
    notes: "",
  });

  useEffect(() => {
    loadTeachers();
    loadSalaryStatus();
  }, [selectedMonth, selectedYear]);

  const loadTeachers = async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error("Error loading teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalaryStatus = async () => {
    if (!schoolId) return;

    try {
      const { data: salaryData, error: salaryError } = await supabase
        .from("teacher_salaries")
        .select("*")
        .eq("school_id", schoolId)
        .eq("month", selectedMonth)
        .eq("year", selectedYear);

      if (salaryError) throw salaryError;

      const statusMap: Record<string, TeacherSalary> = {};
      salaryData?.forEach(salary => {
        statusMap[salary.teacher_id] = salary;
      });
      setSalaryStatus(statusMap);

      const { data: pending, error: pendingError } = await supabase
        .from("teacher_salaries")
        .select(`
          *,
          teachers:teacher_id (
            name,
            specialization,
            phone,
            email
          )
        `)
        .eq("school_id", schoolId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;
      setPendingSalaries(pending || []);
    } catch (error) {
      console.error("Error loading salary status:", error);
    }
  };

  const processSalaries = async () => {
    if (!schoolId) return;

    const activeTeachers = teachers.filter(t => t.status === "active");
    const totalAmount = activeTeachers.reduce((sum, t) => sum + t.salary, 0);

    if (activeTeachers.length === 0) {
      alert("لا يوجد معلمون نشطون لصرف رواتبهم");
      return;
    }

    const alreadyProcessed = activeTeachers.some(t => salaryStatus[t.id]?.status === "paid");
    if (alreadyProcessed) {
      if (!confirm("بعض المعلمين تم صرف رواتبهم بالفعل لهذا الشهر. هل تريد متابعة صرف رواتب الباقين؟")) {
        return;
      }
    }

    if (!confirm(`سيتم صرف رواتب ${activeTeachers.length} معلم بقيمة إجمالية ${formatNumber(totalAmount)} ج.م. هل أنت متأكد؟`)) {
      return;
    }

    setProcessing(true);
    try {
      const teachersToProcess = activeTeachers.filter(t => !salaryStatus[t.id]);

      if (teachersToProcess.length === 0) {
        alert("جميع المعلمين تم صرف رواتبهم لهذا الشهر");
        return;
      }

      const salaryRecords = teachersToProcess.map(teacher => ({
        teacher_id: teacher.id,
        school_id: schoolId,
        month: selectedMonth,
        year: selectedYear,
        amount: teacher.salary,
        status: 'pending',
        notes: `راتب شهر ${getMonthName(selectedMonth)} ${selectedYear}`
      }));

      const { error: salaryError } = await supabase
        .from("teacher_salaries")
        .insert(salaryRecords);

      if (salaryError) throw salaryError;

      if (teachersToProcess.length > 0) {
        const amountToProcess = teachersToProcess.reduce((sum, t) => sum + t.salary, 0);
        const { error: expenseError } = await supabase
          .from("expenses")
          .insert([{
            category: "رواتب المعلمين",
            description: `رواتب المعلمين لشهر ${getMonthName(selectedMonth)} ${selectedYear}`,
            amount: amountToProcess,
            expense_date: new Date().toISOString().split('T')[0],
            notes: `صرف رواتب ${teachersToProcess.length} معلم`,
            school_id: schoolId
          }]);

        if (expenseError) throw expenseError;
      }

      alert("تم صرف الرواتب بنجاح");
      await loadSalaryStatus();
      if (onSalaryProcessed) onSalaryProcessed();
    } catch (error) {
      console.error("Error processing salaries:", error);
      alert("حدث خطأ أثناء صرف الرواتب");
    } finally {
      setProcessing(false);
    }
  };

  const confirmSalary = async (salaryId: string, teacherName: string, amount: number) => {
    if (!confirm(`تأكيد صرف راتب ${teacherName} بقيمة ${formatNumber(amount)} ج.م؟`)) return;

    try {
      const { error } = await supabase
        .from("teacher_salaries")
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq("id", salaryId);

      if (error) throw error;

      alert("تم تأكيد صرف الراتب");
      await loadSalaryStatus();
      if (onSalaryProcessed) onSalaryProcessed();
    } catch (error) {
      console.error("Error confirming salary:", error);
      alert("حدث خطأ أثناء تأكيد صرف الراتب");
    }
  };

  const cancelSalary = async (salaryId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء صرف هذا الراتب؟")) return;

    try {
      const { error } = await supabase
        .from("teacher_salaries")
        .update({ 
          status: 'cancelled',
          payment_date: null 
        })
        .eq("id", salaryId);

      if (error) throw error;

      await loadSalaryStatus();
    } catch (error) {
      console.error("Error cancelling salary:", error);
      alert("حدث خطأ أثناء إلغاء صرف الراتب");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      const teacherData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        specialization: formData.specialization,
        salary: parseFloat(formData.salary),
        hire_date: formData.hire_date,
        status: formData.status,
        address: formData.address || null,
        qualifications: formData.qualifications || null,
        notes: formData.notes || null,
        school_id: schoolId,
      };

      if (editingTeacher) {
        const { error } = await supabase
          .from("teachers")
          .update(teacherData)
          .eq("id", editingTeacher.id)
          .eq("school_id", schoolId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("teachers").insert([teacherData]);

        if (error) throw error;
      }

      resetForm();
      await loadTeachers();
      onUpdate();
    } catch (error: any) {
      console.error("Error saving teacher:", error);
      alert(error?.message || "حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المعلم؟")) return;

    try {
      const { error } = await supabase.from("teachers").delete().eq("id", id);

      if (error) throw error;
      await loadTeachers();
      onUpdate();
    } catch (error: any) {
      console.error("Error deleting teacher:", error);
      alert(error?.message || "حدث خطأ أثناء حذف المعلم");
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email,
      specialization: teacher.specialization,
      salary: teacher.salary.toString(),
      hire_date: new Date(teacher.hire_date).toISOString().split("T")[0],
      status: teacher.status,
      address: teacher.address || "",
      qualifications: teacher.qualifications || "",
      notes: teacher.notes || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      specialization: "",
      salary: "",
      hire_date: new Date().toISOString().split("T")[0],
      status: "active",
      address: "",
      qualifications: "",
      notes: "",
    });
    setEditingTeacher(null);
    setShowForm(false);
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.phone.includes(searchTerm),
  );

  const activeTeachers = teachers.filter((t) => t.status === "active").length;
  const totalSalaries = teachers
    .filter((t) => t.status === "active")
    .reduce((sum, t) => sum + t.salary, 0);

  const paidSalariesThisMonth = Object.values(salaryStatus).filter(
    s => s?.status === "paid"
  ).length;
  
  const pendingSalariesCount = Object.values(salaryStatus).filter(
    s => s?.status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة المعلمين</h2>
          <p className="text-sm text-gray-500 mt-1">إدارة بيانات المعلمين ورواتبهم الشهرية</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSalaryForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={processing}
          >
            <DollarSign className="w-5 h-5" />
            <span className="font-medium">{processing ? "جاري المعالجة..." : "صرف الرواتب"}</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">إضافة معلم</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500 tracking-wide">المعلمين النشطين</p>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatNumber(activeTeachers, 0)}</p>
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

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500 tracking-wide">إجمالي الرواتب الشهرية</p>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatNumber(totalSalaries)} ج.م</p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl shadow-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500 tracking-wide">تم الصرف هذا الشهر</p>
                <p className="text-2xl font-bold text-green-600 tracking-tight">{formatNumber(paidSalariesThisMonth, 0)}</p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500 tracking-wide">رواتب معلقة</p>
                <p className="text-2xl font-bold text-yellow-600 tracking-tight">{formatNumber(pendingSalariesCount, 0)}</p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl shadow-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
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
            placeholder="البحث بالاسم أو التخصص أو الهاتف..."
            className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
          />
        </div>
      </div>

      {/* Teachers List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">جاري تحميل البيانات...</p>
          </div>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-12 text-center border border-gray-100/50">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد معلمون</h3>
          <p className="text-gray-600 mb-6">لم يتم إضافة أي معلمين بعد</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-xl transition-all duration-300 shadow-md"
          >
            إضافة أول معلم
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTeachers.map((teacher) => {
            const salary = salaryStatus[teacher.id];
            return (
              <div
                key={teacher.id}
                className="group bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
              >
                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{teacher.name}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            teacher.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {teacher.status === "active" ? "نشط" : "غير نشط"}
                        </span>
                        {salary?.status === "paid" && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            تم صرف راتب {getMonthName(selectedMonth)}
                          </span>
                        )}
                        {salary?.status === "pending" && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            راتب معلق
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">التخصص:</span>
                          <span className="font-medium text-gray-900">{teacher.specialization}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">الراتب:</span>
                          <span className="font-bold text-orange-600">{formatNumber(teacher.salary)} ج.م</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">الهاتف:</span>
                          <span className="font-medium text-gray-900">{teacher.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">البريد:</span>
                          <span className="font-medium text-gray-900">{teacher.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">تاريخ التعيين:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(teacher.hire_date).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        {teacher.address && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">العنوان:</span>
                            <span className="font-medium text-gray-900">{teacher.address}</span>
                          </div>
                        )}
                      </div>
                      
                      {teacher.qualifications && (
                        <div className="mt-3 flex items-start gap-2 text-sm">
                          <GraduationCap className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="text-gray-600">المؤهلات:</span>
                          <span className="font-medium text-gray-900">{teacher.qualifications}</span>
                        </div>
                      )}
                      
                      {teacher.notes && (
                        <div className="mt-2 flex items-start gap-2 text-sm">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="text-gray-600">ملاحظات:</span>
                          <span className="text-gray-700">{teacher.notes}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mr-4">
                      <button
                        onClick={() => handleEdit(teacher)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="تعديل"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Salary Form Modal */}
      {showSalaryForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">صرف الرواتب الشهرية</h3>
              <button
                onClick={() => setShowSalaryForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الشهر</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                      <option key={month} value={month}>{getMonthName(month)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">السنة</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  >
                    {[2024, 2025, 2026].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {pendingSalaries.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">رواتب معلقة</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pendingSalaries.map((salary) => (
                      <div key={salary.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                        <div>
                          <span className="font-medium text-gray-900">{salary.teachers?.name}</span>
                          <span className="text-sm text-gray-600 mr-2">({salary.teachers?.specialization})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-yellow-700">{formatNumber(salary.amount)} ج.م</span>
                          <button
                            onClick={() => confirmSalary(salary.id, salary.teachers?.name || "", salary.amount)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="تأكيد الصرف"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => cancelSalary(salary.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="إلغاء"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={processSalaries}
                  disabled={activeTeachers === 0 || processing}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl transition-all duration-300 font-medium"
                >
                  {processing ? "جاري المعالجة..." : `صرف رواتب ${formatNumber(activeTeachers, 0)} معلم بقيمة ${formatNumber(totalSalaries)} ج.م`}
                </button>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-3">حالة رواتب المعلمين</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {teachers.filter(t => t.status === "active").map(teacher => {
                    const salary = salaryStatus[teacher.id];
                    return (
                      <div key={teacher.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <span className="font-medium text-gray-900">{teacher.name}</span>
                          <span className="text-sm text-gray-600 mr-2">({teacher.specialization})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-700">{formatNumber(teacher.salary)} ج.م</span>
                          {salary?.status === "paid" ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              تم الصرف
                            </span>
                          ) : salary?.status === "pending" ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                              معلق
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              لم يصرف
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Teacher Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingTeacher ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="مثال: أحمد محمد"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="01139828833"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="example@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التخصص</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="مثال: الرياضيات"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الراتب الشهري (ج.م)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ التعيين</label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العنوان (اختياري)</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="مثال: القاهرة - شارع طومان باي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المؤهلات (اختياري)</label>
                <textarea
                  value={formData.qualifications}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="درجات علمية، شهادات، إلخ"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات (اختياري)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="ملاحظات إضافية"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-medium"
                >
                  {editingTeacher ? "حفظ التعديلات" : "إضافة المعلم"}
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
    </div>
  );
}