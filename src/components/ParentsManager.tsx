// src/components/ParentsManager.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Parent } from "../types/database";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CreditCard,
  Search,
  RefreshCw,
} from "lucide-react";

export default function ParentsManager({ onUpdate }: { onUpdate?: () => void }) {
  const { currentSchool } = useAuth();
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    occupation: "",
    relationship: "father" as "father" | "mother" | "guardian",
    national_id: "",
  });

  const schoolId = currentSchool?.schoolId;

  useEffect(() => {
    if (schoolId) {
      loadParents();
    }
  }, [schoolId]);

  const loadParents = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    setError("");
    
    try {
      const { data, error } = await supabase
        .from("parents")
        .select("*")
        .eq("school_id", schoolId)
        .order("full_name");

      if (error) throw error;
      setParents(data || []);
    } catch (error: any) {
      console.error("Error loading parents:", error);
      setError(error.message || "حدث خطأ في تحميل أولياء الأمور");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError("الاسم كامل مطلوب");
      return false;
    }
    if (!formData.phone.trim()) {
      setError("رقم الهاتف مطلوب");
      return false;
    }
    if (!formData.email.trim()) {
      setError("البريد الإلكتروني مطلوب");
      return false;
    }
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("البريد الإلكتروني غير صحيح");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      setError("لم يتم العثور على المدرسة");
      return;
    }

    if (!validateForm()) return;

    setError("");
    setSuccess("");

    try {
      const parentData = {
        school_id: schoolId,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim() || null,
        occupation: formData.occupation.trim() || null,
        relationship: formData.relationship,
        national_id: formData.national_id.trim() || null,
      };

      console.log("Saving parent data:", parentData); // للتتبع

      if (editingParent) {
        // تحديث ولي أمر موجود
        const { error } = await supabase
          .from("parents")
          .update(parentData)
          .eq("id", editingParent.id)
          .eq("school_id", schoolId);

        if (error) throw error;
        setSuccess("تم تحديث ولي الأمر بنجاح");
      } else {
        // إضافة ولي أمر جديد
        const { error } = await supabase
          .from("parents")
          .insert([parentData]);

        if (error) {
          console.error("Supabase error:", error);
          // التحقق من أخطاء محددة
          if (error.code === "23505") {
            setError("البريد الإلكتروني أو رقم الهاتف موجود بالفعل");
          } else if (error.code === "23502") {
            setError("جميع الحقول المطلوبة يجب تعبئتها");
          } else {
            setError(error.message || "حدث خطأ في حفظ ولي الأمر");
          }
          return;
        }
        setSuccess("تم إضافة ولي الأمر بنجاح");
      }

      resetForm();
      loadParents();
      if (onUpdate) onUpdate();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      console.error("Error saving parent:", error);
      setError(error.message || "حدث خطأ غير متوقع");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف ولي الأمر "${name}"؟`)) return;
    if (!schoolId) return;

    try {
      const { error } = await supabase
        .from("parents")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;

      loadParents();
      if (onUpdate) onUpdate();
      setSuccess("تم حذف ولي الأمر بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      console.error("Error deleting parent:", error);
      setError(error.message || "حدث خطأ في حذف ولي الأمر");
    }
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
    setError("");
    setSuccess("");
  };

  const editParent = (parent: Parent) => {
    setEditingParent(parent);
    setFormData({
      full_name: parent.full_name,
      phone: parent.phone,
      email: parent.email,
      address: parent.address || "",
      occupation: parent.occupation || "",
      relationship: parent.relationship,
      national_id: parent.national_id || "",
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const filteredParents = parents.filter((parent) =>
    parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.phone.includes(searchTerm)
  );

  const relationshipNames = {
    father: "أب",
    mother: "أم",
    guardian: "وصي",
  };

  if (!schoolId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <p className="text-gray-500">لم يتم العثور على مدرسة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">أولياء الأمور</h2>
          <p className="text-sm text-gray-500 mt-1">
            إدارة بيانات أولياء أمور الطلاب
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadParents}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة ولي أمر</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث بالاسم، البريد الإلكتروني أو رقم الهاتف..."
          className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white/50"
        />
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingParent ? "تعديل ولي أمر" : "إضافة ولي أمر جديد"}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم كامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
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
                      className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                      className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="father">أب</option>
                    <option value="mother">أم</option>
                    <option value="guardian">وصي</option>
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
                      className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                      className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    العنوان
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl font-medium"
                >
                  {editingParent ? "تحديث" : "إضافة"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parents List */}
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm border border-gray-100/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">قائمة أولياء الأمور</h3>
          <p className="text-sm text-gray-500">إدارة بيانات أولياء الأمور المسجلين</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredParents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا يوجد أولياء أمور</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredParents.map((parent) => (
              <div key={parent.id} className="p-4 hover:bg-gray-50/50 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {parent.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{parent.full_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {parent.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {parent.email}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                            {relationshipNames[parent.relationship]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => editParent(parent)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(parent.id, parent.full_name)}
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
        )}
      </div>
    </div>
  );
}