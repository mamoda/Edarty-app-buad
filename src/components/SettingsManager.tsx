// src/components/SettingsManager.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  X,
  Shield,
  Save,
  RefreshCw,
  Crown,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  UserCheck,
  Wallet,
  GraduationCap,
  School,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { SchoolUser } from "../types/database";

interface SchoolUserWithDetails {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'teacher' | 'accountant';
  created_at: string;
}

export default function SettingsManager() {
  const { currentSchool, user: currentUser, allSchools, switchSchool } = useAuth();
  
  const [users, setUsers] = useState<SchoolUserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'school' | 'subscription'>('users');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "teacher" | "accountant">("teacher");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  
  // إعدادات المدرسة
  const [schoolSettings, setSchoolSettings] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
    tax_number: "",
  });
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolSaveSuccess, setSchoolSaveSuccess] = useState("");
  const [schoolSaveError, setSchoolSaveError] = useState("");
  
  // الاشتراك
  const [subscription, setSubscription] = useState({
    plan: "free" as 'free' | 'basic' | 'pro' | 'enterprise',
    expires_at: null as string | null,
  });
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // صلاحيات المستخدم الحالي
  const currentRole = currentSchool?.role;
  const canManageUsers = currentRole === "owner" || currentRole === "admin";
  const canManageSchool = currentRole === "owner";
  const schoolId = currentSchool?.schoolId;

  const roleColors = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    teacher: "bg-green-100 text-green-700",
    accountant: "bg-orange-100 text-orange-700",
  };

  const roleNames = {
    owner: "مالك",
    admin: "مدير",
    teacher: "معلم",
    accountant: "محاسب",
  };

  // إنشاء قائمة المدارس المعالجة - مع تحديد النوع بوضوح
  const schoolOptions = useMemo(() => {
    if (!allSchools || allSchools.length === 0) {
      return [] as Array<{ id: string; label: string; role: string; isPrimary: boolean }>;
    }
    
    return allSchools.map((school: SchoolUser) => ({
      id: school.school_id,
      label: `${school.school_id.slice(0, 8)} - ${roleNames[school.role]}`,
      role: school.role,
      isPrimary: school.is_primary || false
    }));
  }, [allSchools]);

  useEffect(() => {
    if (schoolId) {
      if (canManageUsers) {
        loadUsers();
      }
      loadSchoolSettings();
      loadSubscription();
    }
  }, [schoolId, currentRole]);

  const loadUsers = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      const { data: schoolUsers, error: schoolUsersError } = await supabase
        .from("school_users")
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq("school_id", schoolId);
      
      if (schoolUsersError) throw schoolUsersError;
      
      if (schoolUsers && schoolUsers.length > 0) {
        const userIds = schoolUsers.map(u => u.user_id);
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, email, full_name")
          .in("id", userIds);
        
        if (usersError) throw usersError;
        
        const usersWithDetails: SchoolUserWithDetails[] = schoolUsers.map(su => {
          const userInfo = usersData?.find(u => u.id === su.user_id);
          return {
            id: su.id,
            user_id: su.user_id,
            role: su.role,
            created_at: su.created_at,
            email: userInfo?.email || su.user_id,
            full_name: userInfo?.full_name || "غير محدد",
          };
        });
        
        setUsers(usersWithDetails);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolSettings = async () => {
    if (!schoolId) return;
    
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("name, email, address, phone, tax_number")
        .eq("id", schoolId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setSchoolSettings({
          name: data.name || "",
          email: data.email || "",
          address: data.address || "",
          phone: data.phone || "",
          tax_number: data.tax_number || "",
        });
      }
    } catch (error) {
      console.error("Error loading school settings:", error);
    }
  };

  const loadSubscription = async () => {
    if (!schoolId) return;
    
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("subscription_plan, subscription_expires_at")
        .eq("id", schoolId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setSubscription({
          plan: data.subscription_plan || "free",
          expires_at: data.subscription_expires_at,
        });
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");
    
    try {
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("email", inviteEmail)
        .maybeSingle();
      
      if (userError) throw userError;
      
      if (!existingUser) {
        setInviteError("المستخدم غير موجود في النظام. يجب على المستخدم إنشاء حساب أولاً.");
        setInviteLoading(false);
        return;
      }
      
      const { data: existingRole, error: roleError } = await supabase
        .from("school_users")
        .select("id")
        .eq("school_id", schoolId)
        .eq("user_id", existingUser.id)
        .maybeSingle();
      
      if (roleError) throw roleError;
      
      if (existingRole) {
        setInviteError("المستخدم مضاف بالفعل للمدرسة");
        setInviteLoading(false);
        return;
      }
      
      const { error: insertError } = await supabase
        .from("school_users")
        .insert({
          user_id: existingUser.id,
          school_id: schoolId,
          role: inviteRole,
          is_primary: false,
        });
      
      if (insertError) throw insertError;
      
      setInviteSuccess(`تمت إضافة ${inviteEmail} بنجاح كـ ${inviteRole === "admin" ? "مدير" : inviteRole === "accountant" ? "محاسب" : "معلم"}`);
      setInviteEmail("");
      setShowInviteForm(false);
      loadUsers();
      
    } catch (error) {
      console.error("Error inviting user:", error);
      setInviteError("حدث خطأ أثناء إضافة المستخدم");
    } finally {
      setInviteLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!schoolId) return;
    
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser?.role === "owner") {
      alert("لا يمكن تغيير صلاحية المالك");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("school_users")
        .update({ role: newRole })
        .eq("user_id", userId)
        .eq("school_id", schoolId);
      
      if (error) throw error;
      
      loadUsers();
      alert("تم تحديث صلاحية المستخدم بنجاح");
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("حدث خطأ أثناء تحديث صلاحية المستخدم");
    }
  };

  const removeUser = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من إزالة ${userName} من المدرسة؟`)) return;
    
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser?.role === "owner") {
      alert("لا يمكن إزالة المالك من المدرسة");
      return;
    }
    
    if (userId === currentUser?.id) {
      alert("لا يمكنك إزالة نفسك من المدرسة");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("school_users")
        .delete()
        .eq("user_id", userId)
        .eq("school_id", schoolId);
      
      if (error) throw error;
      
      loadUsers();
      alert("تم إزالة المستخدم بنجاح");
    } catch (error) {
      console.error("Error removing user:", error);
      alert("حدث خطأ أثناء إزالة المستخدم");
    }
  };

  const saveSchoolSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    
    setSchoolLoading(true);
    setSchoolSaveSuccess("");
    setSchoolSaveError("");
    
    try {
      const { error } = await supabase
        .from("schools")
        .update({
          name: schoolSettings.name,
          email: schoolSettings.email,
          address: schoolSettings.address,
          phone: schoolSettings.phone,
          tax_number: schoolSettings.tax_number,
        })
        .eq("id", schoolId);
      
      if (error) throw error;
      
      setSchoolSaveSuccess("تم حفظ إعدادات المدرسة بنجاح");
      setTimeout(() => setSchoolSaveSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving school settings:", error);
      setSchoolSaveError("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSchoolLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    alert("سيتم التوجيه لصفحة الترقية قريباً");
    setUpgradeLoading(false);
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case "free": return "مجاني";
      case "basic": return "أساسي";
      case "pro": return "احترافي";
      case "enterprise": return "مؤسسات";
      default: return plan;
    }
  };

  const getDaysRemaining = () => {
    if (!subscription.expires_at) return null;
    const expires = new Date(subscription.expires_at);
    const today = new Date();
    const diffTime = expires.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  // إذا كان المستخدم ليس لديه مدرسة محددة
  if (!currentSchool && allSchools && allSchools.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">اختر مدرسة</h3>
          <p className="text-gray-500 mb-4">أنت مسجل في عدة مدارس، يرجى اختيار مدرسة للعمل عليها</p>
          <div className="space-y-2">
            {schoolOptions.map((school) => (
              <button
                key={school.id}
                onClick={() => switchSchool(school.id)}
                className="w-full p-4 text-right bg-white rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="font-medium text-gray-900">
                  {currentSchool && currentSchool.schoolId === school.id ? "✓ " : ""}
                  مدرسة #{school.id.slice(0, 8)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  الدور: {roleNames[school.role as keyof typeof roleNames]}
                  {school.isPrimary && " (أساسية)"}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentSchool) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مدرسة</h3>
          <p className="text-gray-500">لم يتم العثور على مدرسة مرتبطة بحسابك</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* School Switcher - إذا كان المستخدم في عدة مدارس */}
      {allSchools && allSchools.length > 1 && schoolOptions.length > 0 && (
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <School className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">المدرسة الحالية:</span>
              <span className="font-medium text-gray-900">{schoolSettings.name || "غير محدد"}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${roleColors[currentRole || 'teacher']}`}>
                {roleNames[currentRole || 'teacher']}
              </span>
            </div>
            <select
              value={schoolId || ""}
              onChange={(e) => switchSchool(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {schoolOptions.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* باقي الكود كما هو... */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الإعدادات</h2>
          <p className="text-sm text-gray-500 mt-1">
            إدارة إعدادات المدرسة والمستخدمين والاشتراكات
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-2 flex gap-2 overflow-x-auto border border-gray-100/50">
        {canManageUsers && (
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "users"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "hover:bg-gray-100"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المستخدمين والصلاحيات</span>
          </button>
        )}
        {canManageSchool && (
          <button
            onClick={() => setActiveTab("school")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "school"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "hover:bg-gray-100"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>بيانات المدرسة</span>
          </button>
        )}
        {canManageSchool && (
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "subscription"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "hover:bg-gray-100"
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>الباقة والاشتراك</span>
          </button>
        )}
      </div>

      {/* باقي الأقسام - نفس الكود السابق */}
      {activeTab === "users" && canManageUsers && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
          </div>

          {showInviteForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">إضافة مستخدم جديد</h3>
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleInvite} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      يجب أن يكون المستخدم مسجلاً بالفعل في النظام
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الصلاحية
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    >
                      <option value="admin">مدير</option>
                      <option value="accountant">محاسب</option>
                      <option value="teacher">معلم</option>
                    </select>
                  </div>

                  {inviteError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  {inviteSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{inviteSuccess}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl font-medium disabled:opacity-50"
                    >
                      {inviteLoading ? "جاري الإضافة..." : "إضافة المستخدم"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm border border-gray-100/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">المستخدمين</h3>
              <p className="text-sm text-gray-500">إدارة صلاحيات المستخدمين في المدرسة</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا يوجد مستخدمين</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {users.map((user) => (
                  <div key={user.id} className="p-4 hover:bg-gray-50/50 transition-all">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name || "غير محدد"}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                          {roleNames[user.role]}
                        </span>
                        
                        {user.user_id !== currentUser?.id && user.role !== "owner" && canManageUsers && (
                          <>
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.user_id, e.target.value)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              <option value="admin">مدير</option>
                              <option value="accountant">محاسب</option>
                              <option value="teacher">معلم</option>
                            </select>
                            <button
                              onClick={() => removeUser(user.user_id, user.full_name || user.email || "المستخدم")}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="إزالة المستخدم"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50/50 backdrop-blur-sm rounded-xl p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">الصلاحيات المتاحة</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <Crown className="w-3 h-3" />
                    <span>المالك: جميع الصلاحيات (إدارة المستخدمين، إعدادات المدرسة، جميع البيانات)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3 h-3" />
                    <span>المدير: إدارة المستخدمين، عرض جميع البيانات</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3 h-3" />
                    <span>المحاسب: إدارة المصروفات والتكاليف</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3 h-3" />
                    <span>المعلم: عرض الطلاب وتسجيل الدرجات</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* School Settings Tab */}
      {activeTab === "school" && canManageSchool && (
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm border border-gray-100/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">بيانات المدرسة</h3>
            <p className="text-sm text-gray-500">تعديل معلومات المدرسة الأساسية</p>
          </div>

          <form onSubmit={saveSchoolSettings} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المدرسة <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={schoolSettings.name}
                    onChange={(e) => setSchoolSettings({ ...schoolSettings, name: e.target.value })}
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={schoolSettings.email}
                    onChange={(e) => setSchoolSettings({ ...schoolSettings, email: e.target.value })}
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={schoolSettings.phone}
                    onChange={(e) => setSchoolSettings({ ...schoolSettings, phone: e.target.value })}
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الرقم الضريبي
                </label>
                <div className="relative">
                  <FileText className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={schoolSettings.tax_number}
                    onChange={(e) => setSchoolSettings({ ...schoolSettings, tax_number: e.target.value })}
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
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
                    value={schoolSettings.address}
                    onChange={(e) => setSchoolSettings({ ...schoolSettings, address: e.target.value })}
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50 resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {schoolSaveSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{schoolSaveSuccess}</span>
              </div>
            )}

            {schoolSaveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{schoolSaveError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={schoolLoading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                {schoolLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ الإعدادات</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === "subscription" && canManageSchool && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">باقة {getPlanName(subscription.plan)}</h3>
                  <p className="text-white/80 text-sm mt-1">الاشتراك الحالي للمدرسة</p>
                </div>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={upgradeLoading}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all backdrop-blur-sm"
              >
                {upgradeLoading ? "جاري..." : "ترقية الباقة"}
              </button>
            </div>
            
            {subscription.expires_at && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {isExpired ? "انتهى الاشتراك" : `ينتهي الاشتراك في ${new Date(subscription.expires_at).toLocaleDateString("ar-EG")}`}
                    {daysRemaining !== null && daysRemaining > 0 && (
                      <span className={`mr-2 ${isExpiringSoon ? "text-yellow-300" : "text-white/80"}`}>
                        (متبقي {daysRemaining} يوم)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm border border-gray-100/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">مميزات الباقة</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "عدد الطلاب غير محدود", available: subscription.plan !== "free" },
                  { name: "تقارير متقدمة", available: subscription.plan !== "free" },
                  { name: "تصدير البيانات", available: true },
                  { name: "دعم فني 24/7", available: subscription.plan === "pro" || subscription.plan === "enterprise" },
                  { name: "API مخصص", available: subscription.plan === "enterprise" },
                  { name: "تخصيص العلامة التجارية", available: subscription.plan === "enterprise" },
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {feature.available ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300" />
                    )}
                    <span className={feature.available ? "text-gray-700" : "text-gray-400"}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm border border-gray-100/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">مقارنة الباقات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">الميزة</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">مجاني</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">أساسي</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">احترافي</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">مؤسسات</th>
                   </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm">حد الطلاب</td>
                    <td className="text-center py-3 px-4 text-sm">50 طالب</td>
                    <td className="text-center py-3 px-4 text-sm">200 طالب</td>
                    <td className="text-center py-3 px-4 text-sm">500 طالب</td>
                    <td className="text-center py-3 px-4 text-sm">غير محدود</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm">التقارير المتقدمة</td>
                    <td className="text-center py-3 px-4 text-sm">-</td>
                    <td className="text-center py-3 px-4 text-sm">✓</td>
                    <td className="text-center py-3 px-4 text-sm">✓</td>
                    <td className="text-center py-3 px-4 text-sm">✓</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm">دعم فني</td>
                    <td className="text-center py-3 px-4 text-sm">أساسي</td>
                    <td className="text-center py-3 px-4 text-sm">متقدم</td>
                    <td className="text-center py-3 px-4 text-sm">24/7</td>
                    <td className="text-center py-3 px-4 text-sm">24/7 + أولوية</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-sm">السعر الشهري</td>
                    <td className="text-center py-3 px-4 text-sm">0 ج.م</td>
                    <td className="text-center py-3 px-4 text-sm">199 ج.م</td>
                    <td className="text-center py-3 px-4 text-sm">499 ج.م</td>
                    <td className="text-center py-3 px-4 text-sm">اتصل بنا</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}