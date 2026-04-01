// src/components/StudentsManager.tsx (النسخة المحسنة)
import { useState, useEffect } from "react";
import {
  UserPlus,
  Edit2,
  Trash2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  CheckCircle,
  XCircle,
  Phone,
  GraduationCap,
  User,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Student } from "../types/database";

interface StudentsManagerProps {
  onUpdate: () => void;
}

export default function StudentsManager({ onUpdate }: StudentsManagerProps) {
  const { schoolId, user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  const [formData, setFormData] = useState({
    full_name: "",
    grade: "",
    parent_name: "",
    parent_phone: "",
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    if (schoolId) {
      loadStudents();
    }
  }, [schoolId]);

  const formatNumber = (num: number) => {
    return num.toLocaleString("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const loadStudents = async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", schoolId)
        .order("grade", { ascending: true })
        .order("full_name", { ascending: true });

      if (error) throw error;
      setStudents(data || []);
      
      // توسيع جميع الصفوف بعد تحميل البيانات
      const grades = new Set((data || []).map(s => s.grade || "غير محدد"));
      setExpandedGrades(grades);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from("students")
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq("id", editingStudent.id)
          .eq("school_id", schoolId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("students")
          .insert([{ 
            ...formData, 
            school_id: schoolId,
            user_id: user?.id,
          }]);

        if (error) throw error;
      }

      resetForm();
      loadStudents();
      onUpdate();
    } catch (error) {
      console.error("Error saving student:", error);
      alert("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      loadStudents();
      onUpdate();
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("حدث خطأ أثناء حذف الطالب");
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name,
      grade: student.grade,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      status: student.status,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      grade: "",
      parent_name: "",
      parent_phone: "",
      status: "active",
    });
    setEditingStudent(null);
    setShowForm(false);
  };

  const toggleGrade = (grade: string) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(grade)) {
      newExpanded.delete(grade);
    } else {
      newExpanded.add(grade);
    }
    setExpandedGrades(newExpanded);
  };

  const expandAll = () => {
    const allGrades = new Set(gradeStats.map((stat) => stat.grade));
    setExpandedGrades(allGrades);
  };

  const collapseAll = () => {
    setExpandedGrades(new Set());
  };

  // Group students by grade
  const studentsByGrade = students.reduce(
    (acc, student) => {
      const grade = student.grade || "غير محدد";
      if (!acc[grade]) {
        acc[grade] = [];
      }
      acc[grade].push(student);
      return acc;
    },
    {} as Record<string, Student[]>,
  );

  // Calculate statistics for each grade
  const gradeStats = Object.entries(studentsByGrade)
    .map(([grade, students]) => ({
      grade,
      count: students.length,
      activeCount: students.filter((s) => s.status === "active").length,
      inactiveCount: students.filter((s) => s.status === "inactive").length,
    }))
    .sort((a, b) => a.grade.localeCompare(b.grade, "ar"));

  // Filter students by search term
  const filterStudentsBySearch = (studentList: Student[]) => {
    if (!searchTerm.trim()) return studentList;
    
    const term = searchTerm.toLowerCase().trim();
    return studentList.filter(
      (student) =>
        student.full_name.toLowerCase().includes(term) ||
        student.parent_name.toLowerCase().includes(term) ||
        student.parent_phone.includes(term) ||
        student.grade.toLowerCase().includes(term)
    );
  };

  const getFilteredStudents = () => {
    if (selectedGrade) {
      const gradeStudents = studentsByGrade[selectedGrade] || [];
      return filterStudentsBySearch(gradeStudents);
    } else {
      return filterStudentsBySearch(students);
    }
  };

  const getFilteredStudentsByGrade = () => {
    const filtered: Record<string, Student[]> = {};
    
    Object.entries(studentsByGrade).forEach(([grade, gradeStudents]) => {
      const filteredGradeStudents = filterStudentsBySearch(gradeStudents);
      if (filteredGradeStudents.length > 0) {
        filtered[grade] = filteredGradeStudents;
      }
    });
    
    return filtered;
  };

  const filteredStudentsByGrade = getFilteredStudentsByGrade();
  const filteredStudents = getFilteredStudents();
  const totalFilteredCount = filteredStudents.length;

  const totalStudents = students.length;
  const totalActive = students.filter((s) => s.status === "active").length;
  const totalInactive = students.filter((s) => s.status === "inactive").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة الطلاب</h2>
          <p className="text-sm text-gray-500 mt-1">
            تسجيل ومتابعة بيانات الطلاب والصفوف الدراسية
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <UserPlus className="w-5 h-5" />
          <span className="font-medium">إضافة طالب</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500 tracking-wide">إجمالي الطلاب</p>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">
                  {formatNumber(totalStudents)}
                </p>
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
                <p className="text-sm font-medium text-gray-500 tracking-wide">الطلاب النشطون</p>
                <p className="text-2xl font-bold text-green-600 tracking-tight">
                  {formatNumber(totalActive)}
                </p>
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

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500 tracking-wide">الطلاب غير النشطين</p>
                <p className="text-2xl font-bold text-gray-500 tracking-tight">
                  {formatNumber(totalInactive)}
                </p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث عن طالب (بالاسم، ولي الأمر، رقم الهاتف، أو الصف)..."
            className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grade Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">تصفية حسب الصف:</span>
          <button
            onClick={() => setSelectedGrade("")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              selectedGrade === ""
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            الكل {searchTerm && `(${formatNumber(totalFilteredCount)})`}
          </button>
          {gradeStats.map(({ grade }) => {
            const countInGrade = searchTerm 
              ? filterStudentsBySearch(studentsByGrade[grade] || []).length
              : studentsByGrade[grade]?.length || 0;
            
            if (countInGrade === 0 && searchTerm) return null;
            
            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  selectedGrade === grade
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {grade} ({formatNumber(countInGrade)})
              </button>
            );
          })}
        </div>

        {/* Search Result Info */}
        {searchTerm && (
          <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded-lg">
            تم العثور على {formatNumber(totalFilteredCount)} نتيجة للبحث "{searchTerm}"
          </div>
        )}

        {/* Expand/Collapse Controls */}
        {!selectedGrade && Object.keys(filteredStudentsByGrade).length > 0 && (
          <div className="flex justify-end gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              فتح الكل
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              إغلاق الكل
            </button>
          </div>
        )}
      </div>

      {/* Students List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">جاري تحميل البيانات...</p>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-12 text-center border border-gray-100/50">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات</h3>
          <p className="text-gray-600 mb-6">لم يتم إضافة أي طلاب بعد</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-xl transition-all duration-300 shadow-md"
          >
            إضافة أول طالب
          </button>
        </div>
      ) : selectedGrade ? (
        // Single Grade View
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedGrade}
                </h3>
                <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                  {formatNumber(filteredStudents.length)} طالب
                </span>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  مسح البحث
                </button>
              )}
            </div>
          </div>
          {filteredStudents.length > 0 ? (
            <StudentList
              students={filteredStudents}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="bg-white/90 backdrop-blur-xl rounded-xl p-8 text-center">
              <p className="text-gray-600">لا توجد نتائج للبحث "{searchTerm}"</p>
            </div>
          )}
        </div>
      ) : (
        // Grouped by Grade View
        <div className="space-y-4">
          {Object.entries(filteredStudentsByGrade).map(([grade, gradeStudents]) => {
            const isExpanded = expandedGrades.has(grade);
            const activeCount = gradeStudents.filter(s => s.status === "active").length;

            return (
              <div
                key={grade}
                className="group bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
              >
                {/* Grade Header */}
                <div
                  onClick={() => toggleGrade(grade)}
                  className="bg-gradient-to-l from-gray-50 to-white px-6 py-4 border-b cursor-pointer hover:bg-gray-50/80 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                        <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                          <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {grade}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className="text-gray-600">
                            إجمالي: {formatNumber(gradeStudents.length)}
                          </span>
                          <span className="text-green-600">
                            نشط: {formatNumber(activeCount)}
                          </span>
                          <span className="text-gray-400">
                            غير نشط: {formatNumber(gradeStudents.length - activeCount)}
                          </span>
                          {searchTerm && (
                            <span className="text-blue-600 text-xs">
                              (نتائج البحث)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGrade(grade);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      عرض الكل
                    </button>
                  </div>
                </div>

                {/* Grade Students */}
                {isExpanded && (
                  <div className="p-4">
                    <StudentList
                      students={gradeStudents}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                )}
              </div>
            );
          })}
          
          {Object.keys(filteredStudentsByGrade).length === 0 && searchTerm && (
            <div className="bg-white/90 backdrop-blur-xl rounded-xl p-12 text-center border border-gray-100/50">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-600">
                لم يتم العثور على طلاب يطابقون بحث "{searchTerm}"
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                مسح البحث
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingStudent ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
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
                  اسم الطالب <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder="أحمد محمد"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الصف الدراسي <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) =>
                      setFormData({ ...formData, grade: e.target.value })
                    }
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder="مثال: الصف الأول الابتدائي"
                    required
                    list="grades"
                  />
                  <datalist id="grades">
                    {gradeStats.map(({ grade }) => (
                      <option key={grade} value={grade} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم ولي الأمر <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.parent_name}
                    onChange={(e) =>
                      setFormData({ ...formData, parent_name: e.target.value })
                    }
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder="أحمد محمد"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, parent_phone: e.target.value })
                    }
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder="01234567890"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الحالة
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
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
                  {editingStudent ? "حفظ التعديلات" : "إضافة الطالب"}
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

// Separate component for student list
function StudentList({
  students,
  onEdit,
  onDelete,
}: {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}) {
  if (students.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">لا يوجد طلاب في هذا الصف</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {students.map((student) => (
        <div
          key={student.id}
          className="bg-gray-50/50 rounded-xl p-4 hover:bg-gray-100/80 transition-all duration-300 border border-gray-100/50 hover:border-gray-200/80"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <h4 className="font-bold text-gray-900 text-lg">{student.full_name}</h4>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    student.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {student.status === "active" ? "نشط" : "غير نشط"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">الصف:</span>
                  <span className="font-medium text-gray-900">{student.grade}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">ولي الأمر:</span>
                  <span className="font-medium text-gray-900">{student.parent_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">الهاتف:</span>
                  <span className="font-medium text-gray-900" dir="ltr">
                    {student.parent_phone}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-1 mr-4">
              <button
                onClick={() => onEdit(student)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="تعديل"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(student.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}