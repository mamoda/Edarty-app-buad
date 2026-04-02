// src/components/ParentsManager.tsx
import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  X,
  Eye,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  User,
  CreditCard,
  Heart,
  Star,
  BookOpen,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  MessageCircle,
  Edit2,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Parent, StudentWithDetails } from "../types/database";

interface ParentsManagerProps {
  onUpdate: () => void;
}

const formatNumber = (num: number, fractionDigits: number = 2) => {
  return Number(num).toLocaleString("ar-EG", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getGradeColor = (percentage: number) => {
  if (percentage >= 90) return "text-green-600 bg-green-100";
  if (percentage >= 80) return "text-emerald-600 bg-emerald-100";
  if (percentage >= 70) return "text-blue-600 bg-blue-100";
  if (percentage >= 60) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
};

const getBehaviorIcon = (type: string) => {
  switch (type) {
    case "positive":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "negative":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "warning":
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    default:
      return <Star className="w-4 h-4 text-gray-600" />;
  }
};

export default function ParentsManager({ onUpdate }: ParentsManagerProps) {
  const { currentSchool, user, userProfile } = useAuth(); 
  const schoolId = currentSchool?.schoolId;
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showParentDetails, setShowParentDetails] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [studentDetails, setStudentDetails] = useState<Record<string, StudentWithDetails>>({});
  const [activeTab, setActiveTab] = useState<'academic' | 'behavior' | 'financial' | 'attendance'>('academic');

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    occupation: "",
    relationship: "father" as "father" | "mother" | "guardian",
    national_id: "",
  });

  useEffect(() => {
    loadParents();
    loadStudents();
  }, []);

  const loadParents = async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("parents")
        .select("*")
        .eq("school_id", schoolId)
        .order("full_name", { ascending: true });

      if (error) throw error;
      setParents(data || []);
    } catch (error) {
      console.error("Error loading parents:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!schoolId) return;

    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", schoolId)
        .eq("status", "active");

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const loadStudentDetails = async (studentId: string) => {
    if (studentDetails[studentId]) return;

    try {
      const [
        behaviorsRes,
        evaluationsRes,
        examResultsRes,
        financialRes,
        attendanceRes,
      ] = await Promise.all([
        supabase
          .from("student_behaviors")
          .select("*, teachers(name)")
          .eq("student_id", studentId)
          .order("date", { ascending: false })
          .limit(20),
        supabase
          .from("teacher_evaluations")
          .select("*, teachers(name)")
          .eq("student_id", studentId)
          .order("date", { ascending: false })
          .limit(20),
        supabase
          .from("exam_results")
          .select("*, subjects(name)")
          .eq("student_id", studentId)
          .order("exam_date", { ascending: false })
          .limit(20),
        supabase
          .from("student_financial")
          .select("*")
          .eq("student_id", studentId)
          .order("due_date", { ascending: true }),
        supabase
          .from("student_attendance")
          .select("*")
          .eq("student_id", studentId)
          .order("date", { ascending: false })
          .limit(30),
      ]);

      setStudentDetails((prev) => ({
        ...prev,
        [studentId]: {
          student: students.find((s) => s.id === studentId),
          behaviors: behaviorsRes.data || [],
          evaluations: evaluationsRes.data || [],
          examResults: examResultsRes.data || [],
          financial: financialRes.data || [],
          attendance: attendanceRes.data || [],
        },
      }));
    } catch (error) {
      console.error("Error loading student details:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      const parentData = {
        ...formData,
        school_id: schoolId,
        user_id: user?.id,
      };

      if (editingParent) {
        const { error } = await supabase
          .from("parents")
          .update(parentData)
          .eq("id", editingParent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("parents").insert([parentData]);

        if (error) throw error;
      }

      resetForm();
      await loadParents();
      onUpdate();
    } catch (error: any) {
      console.error("Error saving parent:", error);
      alert(error?.message || "حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الولي؟")) return;

    try {
      const { error } = await supabase.from("parents").delete().eq("id", id);

      if (error) throw error;
      await loadParents();
      onUpdate();
    } catch (error: any) {
      console.error("Error deleting parent:", error);
      alert(error?.message || "حدث خطأ أثناء حذف الولي");
    }
  };

  const handleEdit = (parent: Parent) => {
    setEditingParent(parent);
    setFormData({
      full_name: parent.full_name,
      phone: parent.phone,
      email: parent.email,
      address: parent.address,
      occupation: parent.occupation,
      relationship: parent.relationship,
      national_id: parent.national_id,
    });
    setShowForm(true);
  };

  const handleViewDetails = async (parent: Parent) => {
    setSelectedParent(parent);
    // تحميل أبناء هذا الولي
    const { data: studentParents } = await supabase
      .from("student_parents")
      .select("student_id")
      .eq("parent_id", parent.id);

    if (studentParents) {
      for (const sp of studentParents) {
        await loadStudentDetails(sp.student_id);
      }
    }
    setShowParentDetails(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      phone: "",
      email: "",
      address: "",
      occupation: "",
      relationship: "father",
      national_id: "",
    });
    setEditingParent(null);
    setShowForm(false);
  };

  const filteredParents = parents.filter(
    (parent) =>
      parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.phone.includes(searchTerm) ||
      parent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentList = () => {
    if (!selectedParent) return [];
    const studentIds = Object.keys(studentDetails).filter(
      (id) => studentDetails[id]?.student
    );
    return studentIds.map((id) => studentDetails[id]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">أولياء الأمور</h2>
          <p className="text-sm text-gray-500 mt-1">
            إدارة بيانات أولياء الأمور ومتابعة أبنائهم
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">إضافة ولي أمر</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500">إجمالي أولياء الأمور</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(parents.length, 0)}</p>
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
                <p className="text-sm font-medium text-gray-500">أولياء نشطون</p>
                <p className="text-2xl font-bold text-green-600">{formatNumber(parents.length, 0)}</p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                  <Heart className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500">متوسط عدد الأبناء</p>
                <p className="text-2xl font-bold text-purple-600">2.3</p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <Star className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-500">معدل التواصل</p>
                <p className="text-2xl font-bold text-orange-600">94%</p>
              </div>
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl blur-xl opacity-30"></div>
                <div className="relative p-3 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl shadow-lg">
                  <MessageCircle className="w-5 h-5 text-white" />
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
            placeholder="البحث بالاسم أو الهاتف أو البريد الإلكتروني..."
            className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
          />
        </div>
      </div>

      {/* Parents List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">جاري تحميل البيانات...</p>
          </div>
        </div>
      ) : filteredParents.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-12 text-center border border-gray-100/50">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد أولياء أمور</h3>
          <p className="text-gray-600 mb-6">لم يتم إضافة أي ولي أمر بعد</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-xl transition-all duration-300 shadow-md"
          >
            إضافة ولي أمر
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredParents.map((parent) => (
            <div
              key={parent.id}
              className="group bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
            >
              <div className="relative p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">{parent.full_name}</h3>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {parent.relationship === "father" ? "أب" : parent.relationship === "mother" ? "أم" : "ولي أمر"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">الهاتف:</span>
                        <span className="font-medium text-gray-900">{parent.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">البريد:</span>
                        <span className="font-medium text-gray-900">{parent.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">المهنة:</span>
                        <span className="font-medium text-gray-900">{parent.occupation}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">العنوان:</span>
                        <span className="font-medium text-gray-900">{parent.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">الرقم القومي:</span>
                        <span className="font-medium text-gray-900">{parent.national_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mr-4">
                    <button
                      onClick={() => handleViewDetails(parent)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      title="عرض التفاصيل"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(parent)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="تعديل"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(parent.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Parent Details Modal */}
      {showParentDetails && selectedParent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  ملف ولي الأمر: {selectedParent.full_name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  عرض تفاصيل الأبناء والسلوك والدرجات والمعاملات المالية
                </p>
              </div>
              <button
                onClick={() => {
                  setShowParentDetails(false);
                  setSelectedParent(null);
                  setSelectedStudent(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Students List */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">الأبناء</h4>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {getStudentList().map((studentData) => (
                    <button
                      key={studentData.student.id}
                      onClick={() => setSelectedStudent(studentData)}
                      className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                        selectedStudent?.student.id === studentData.student.id
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {studentData.student.full_name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedStudent && (
                <div className="space-y-6">
                  {/* Student Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                    <h5 className="font-semibold text-gray-900 mb-2">معلومات الطالب</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">الاسم</p>
                        <p className="font-medium">{selectedStudent.student.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">الفصل</p>
                        <p className="font-medium">{selectedStudent.student.class || "غير محدد"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">رقم الجلوس</p>
                        <p className="font-medium">{selectedStudent.student.seat_number || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">تاريخ الميلاد</p>
                        <p className="font-medium">
                          {selectedStudent.student.birth_date ? formatDate(selectedStudent.student.birth_date) : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 border-b border-gray-200">
                    {[
                      { id: "academic", label: "الدرجات الأكاديمية", icon: BookOpen },
                      { id: "behavior", label: "السلوك والتقييم", icon: Star },
                      { id: "financial", label: "المعاملات المالية", icon: DollarSign },
                      { id: "attendance", label: "الحضور والغياب", icon: Calendar },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all duration-300 ${
                          activeTab === tab.id
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Academic Tab */}
                  {activeTab === "academic" && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-gray-900">نتائج الامتحانات</h5>
                      {selectedStudent.examResults.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">لا توجد نتائج امتحانات مسجلة</p>
                      ) : (
                        <div className="grid gap-3">
                          {selectedStudent.examResults.map((result: any) => (
                            <div key={result.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h6 className="font-semibold text-gray-900">{result.exam_name}</h6>
                                  <p className="text-xs text-gray-500">
                                    {result.subjects?.name} • {formatDate(result.exam_date)}
                                  </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(result.percentage)}`}>
                                  {result.percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                  الدرجة: {result.obtained_score} / {result.max_score}
                                </span>
                                <span className="text-sm font-medium text-gray-700">
                                  التقدير: {result.grade}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Behavior Tab */}
                  {activeTab === "behavior" && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-gray-900">تقييمات السلوك</h5>
                      {selectedStudent.evaluations.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">لا توجد تقييمات مسجلة</p>
                      ) : (
                        <div className="grid gap-3">
                          {selectedStudent.evaluations.map((evaluationItem: any) => (
                            <div key={evaluationItem.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h6 className="font-semibold text-gray-900">{evaluationItem.subject}</h6>
                                  <p className="text-xs text-gray-500">
                                    {evaluationItem.teachers?.name} • {formatDate(evaluationItem.date)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < evaluationItem.rating
                                          ? "text-yellow-500 fill-yellow-500"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 mt-2">{evaluationItem.comments}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <h5 className="font-semibold text-gray-900 mt-6">تقارير السلوك اليومي</h5>
                      {selectedStudent.behaviors.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">لا توجد تقارير سلوك مسجلة</p>
                      ) : (
                        <div className="grid gap-3">
                          {selectedStudent.behaviors.map((behavior: any) => (
                            <div key={behavior.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                {getBehaviorIcon(behavior.type)}
                                <span
                                  className={`text-sm font-medium ${
                                    behavior.type === "positive"
                                      ? "text-green-700"
                                      : behavior.type === "negative"
                                      ? "text-red-700"
                                      : "text-yellow-700"
                                  }`}
                                >
                                  {behavior.type === "positive"
                                    ? "سلوك إيجابي"
                                    : behavior.type === "negative"
                                    ? "سلوك سلبي"
                                    : "تنبيه"}
                                </span>
                                <span className="text-xs text-gray-500 mr-2">
                                  {formatDate(behavior.date)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{behavior.description}</p>
                              {behavior.teachers?.name && (
                                <p className="text-xs text-gray-500 mt-2">المعلم: {behavior.teachers.name}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Financial Tab */}
                  {activeTab === "financial" && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-gray-900">المعاملات المالية</h5>
                      {selectedStudent.financial.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">لا توجد معاملات مالية مسجلة</p>
                      ) : (
                        <div className="grid gap-3">
                          {selectedStudent.financial.map((fin: any) => {
                            const isOverdue = new Date(fin.due_date) < new Date() && fin.status !== "paid";
                            return (
                              <div key={fin.id} className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <h6 className="font-semibold text-gray-900">
                                      {fin.fee_type === "tuition"
                                        ? "رسوم دراسية"
                                        : fin.fee_type === "transport"
                                        ? "مواصلات"
                                        : fin.fee_type === "books"
                                        ? "كتب"
                                        : fin.fee_type === "activities"
                                        ? "أنشطة"
                                        : "أخرى"}
                                    </h6>
                                    <p className="text-xs text-gray-500">تاريخ الاستحقاق: {formatDate(fin.due_date)}</p>
                                  </div>
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      fin.status === "paid"
                                        ? "bg-green-100 text-green-700"
                                        : fin.status === "partial"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : isOverdue
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {fin.status === "paid"
                                      ? "مدفوع"
                                      : fin.status === "partial"
                                      ? "مدفوع جزئياً"
                                      : isOverdue
                                      ? "متأخر"
                                      : "غير مدفوع"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                  <div>
                                    <p className="text-sm text-gray-600">المبلغ الكلي</p>
                                    <p className="font-bold text-gray-900">{formatNumber(fin.amount)} ج.م</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">المدفوع</p>
                                    <p className="font-bold text-green-600">{formatNumber(fin.paid_amount)} ج.م</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">المتبقي</p>
                                    <p className={`font-bold ${fin.remaining_amount > 0 ? "text-red-600" : "text-green-600"}`}>
                                      {formatNumber(fin.remaining_amount)} ج.م
                                    </p>
                                  </div>
                                </div>
                                {fin.notes && (
                                  <p className="text-xs text-gray-500 mt-2">ملاحظات: {fin.notes}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Financial Summary */}
                      {selectedStudent.financial.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
                          <h5 className="font-semibold mb-2">ملخص المعاملات المالية</h5>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm opacity-90">إجمالي المستحق</p>
                              <p className="text-xl font-bold">
                                {formatNumber(selectedStudent.financial.reduce((sum: number, f: any) => sum + f.amount, 0))} ج.م
                              </p>
                            </div>
                            <div>
                              <p className="text-sm opacity-90">إجمالي المدفوع</p>
                              <p className="text-xl font-bold text-green-300">
                                {formatNumber(selectedStudent.financial.reduce((sum: number, f: any) => sum + f.paid_amount, 0))} ج.م
                              </p>
                            </div>
                            <div>
                              <p className="text-sm opacity-90">المتبقي</p>
                              <p className="text-xl font-bold text-yellow-300">
                                {formatNumber(selectedStudent.financial.reduce((sum: number, f: any) => sum + f.remaining_amount, 0))} ج.م
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attendance Tab */}
                  {activeTab === "attendance" && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-gray-900">سجل الحضور والغياب</h5>
                      {selectedStudent.attendance.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">لا توجد سجلات حضور مسجلة</p>
                      ) : (
                        <div className="grid gap-3">
                          {selectedStudent.attendance.map((att: any) => (
                            <div key={att.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{formatDate(att.date)}</p>
                                  {att.check_in_time && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      <Clock className="w-3 h-3 inline ml-1" />
                                      {att.check_in_time} - {att.check_out_time || "لم ينصرف"}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    att.status === "present"
                                      ? "bg-green-100 text-green-700"
                                      : att.status === "absent"
                                      ? "bg-red-100 text-red-700"
                                      : att.status === "late"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {att.status === "present"
                                    ? "حاضر"
                                    : att.status === "absent"
                                    ? "غائب"
                                    : att.status === "late"
                                    ? "متأخر"
                                    : "بعذر"}
                                </span>
                              </div>
                              {att.notes && <p className="text-sm text-gray-600 mt-2">{att.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Attendance Statistics */}
                      {selectedStudent.attendance.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h5 className="font-semibold text-gray-900 mb-3">إحصائيات الحضور</h5>
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold text-green-600">
                                {selectedStudent.attendance.filter((a: any) => a.status === "present").length}
                              </p>
                              <p className="text-xs text-gray-500">حاضر</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-red-600">
                                {selectedStudent.attendance.filter((a: any) => a.status === "absent").length}
                              </p>
                              <p className="text-xs text-gray-500">غائب</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-yellow-600">
                                {selectedStudent.attendance.filter((a: any) => a.status === "late").length}
                              </p>
                              <p className="text-xs text-gray-500">متأخر</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-blue-600">
                                {selectedStudent.attendance.filter((a: any) => a.status === "excused").length}
                              </p>
                              <p className="text-xs text-gray-500">بعذر</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-sm text-gray-600">
                              نسبة الحضور:{" "}
                              <span className="font-bold text-blue-600">
                                {(
                                  (selectedStudent.attendance.filter((a: any) => a.status === "present").length /
                                    selectedStudent.attendance.length) *
                                  100
                                ).toFixed(1)}%
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Parent Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingParent ? "تعديل بيانات ولي الأمر" : "إضافة ولي أمر جديد"}
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
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
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
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder="01234567890"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder="parent@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  صلة القرابة <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                >
                  <option value="father">أب</option>
                  <option value="mother">أم</option>
                  <option value="guardian">ولي أمر</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المهنة
                </label>
                <div className="relative">
                  <Briefcase className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder="مهندس"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العنوان
                </label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder="القاهرة، مصر"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الرقم القومي
                </label>
                <div className="relative">
                  <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder="12345678901234"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-medium"
                >
                  {editingParent ? "حفظ التعديلات" : "إضافة ولي الأمر"}
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