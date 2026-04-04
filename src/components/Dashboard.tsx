// src/components/Dashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Briefcase,
  MessageCircle,
  Headphones,
  Send,
  X,
  GraduationCap,
  Bell,
  ChevronLeft,
  ChevronRight,
  Wallet,
  DollarSign,
  Settings,
  Home,
  Maximize2,
  UserPlus,
  RefreshCw,
  School,
  AlertCircle,
  Heart,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Statistics } from "../types/database";
import StudentsManager from "./StudentsManager";
import TeachersManager from "./TeachersManager";
import FeesManager from "./FeesManager";
import ExpensesManager from "./ExpensesManager";
import ProfitReport from "./ProfitReport";
import ParentsManager from "./ParentsManager";
import SettingsManager from "./SettingsManager";
import backgroundPattern from "../assets/background-pattern.png";
import backgroundWave from "../assets/background-wave.png";
import backgroundDots from "../assets/background-dots.png";
import logo from "../assets/logo.png";

type View =
  | "dashboard"
  | "students"
  | "teachers"
  | "fees"
  | "expenses"
  | "reports"
  | "parents"
  | "settings";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: number;
  color: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
  subValue?: string;
}

interface MenuItemProps {
  label: string;
  icon: React.ElementType;
  view: View;
  count?: number;
  currentView: View;
  onClick: () => void;
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: number;
  type: "user" | "bot";
  text: string;
  time: string;
}

// دوال التنسيق
const formatCurrency = (num: number): string => {
  return `${num.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ج.م`;
};

const formatPercentage = (num: number): string => {
  return `${num.toLocaleString("ar-EG", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
};

const formatNumber = (num: number): string => {
  return num.toLocaleString("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// مكون البطاقة الإحصائية المتطورة
const ModernStatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color,
  isCurrency = false,
  isPercentage = false,
  subValue,
}) => {
  const trendPositive = trend === "up";

  const getDisplayValue = () => {
    if (isCurrency) {
      return formatCurrency(value);
    } else if (isPercentage) {
      return formatPercentage(value);
    } else {
      return formatNumber(value);
    }
  };

  return (
    <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="absolute -inset-px bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-gray-500 tracking-wide">
              {title}
            </p>

            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-2xl font-bold text-gray-900 tracking-tight">
                {getDisplayValue()}
              </span>
              {subValue && (
                <span className="text-xs text-gray-500 mr-1">({subValue})</span>
              )}
            </div>

            {trend && trendValue !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    trendPositive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {trendPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{trendValue}%</span>
                </div>
                <span className="text-xs text-gray-400">
                  مقارنة بالشهر الماضي
                </span>
              </div>
            )}
          </div>

          <div className="relative mr-3">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${color} rounded-xl blur-xl opacity-30 group-hover:opacity-40 transition-opacity duration-500`}
            ></div>
            <div
              className={`relative p-3 bg-gradient-to-br ${color} rounded-xl shadow-lg transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
      </div>
    </div>
  );
};

// مكون القائمة المتطورة
const ModernMenuItem: React.FC<MenuItemProps> = ({
  label,
  icon: Icon,
  view,
  count,
  currentView,
  onClick,
}) => {
  const isActive = currentView === view;

  return (
    <button
      onClick={onClick}
      className={`relative w-full group rounded-xl transition-all duration-300 ${
        isActive ? "scale-[1.02]" : "hover:scale-[1.01]"
      }`}
    >
      <div
        className={`absolute inset-0 rounded-xl transition-all duration-300 ${
          isActive
            ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 shadow-lg shadow-blue-600/20"
            : "bg-gray-100/50 opacity-0 group-hover:opacity-100"
        }`}
      ></div>

      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>

      <div className="relative flex items-center gap-3 px-4 py-2.5">
        <div
          className={`p-2 rounded-lg transition-all duration-300 ${
            isActive
              ? "bg-white/20 text-white"
              : "bg-white/80 text-gray-600 group-hover:bg-white group-hover:text-blue-600"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>

        <span
          className={`flex-1 text-right font-medium transition-colors duration-300 ${
            isActive ? "text-white" : "text-gray-700"
          }`}
        >
          {label}
        </span>

        {count !== undefined && (
          <span
            className={`text-xs px-2 py-1 rounded-full transition-all duration-300 ${
              isActive
                ? "bg-white/20 text-white"
                : "bg-gray-200/80 text-gray-600"
            }`}
          >
            {formatNumber(count)}
          </span>
        )}
      </div>

      {isActive && (
        <div className="absolute right-0 top-2 bottom-2 w-1 bg-white rounded-full shadow-lg shadow-white/50"></div>
      )}
    </button>
  );
};

// مكون الإجراءات السريعة
const QuickActionCard: React.FC<QuickActionProps> = ({
  title,
  description,
  icon: Icon,
  color,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="group relative bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
  >
    <div
      className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-700`}
    ></div>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

    <div className="relative p-5 text-right">
      <div
        className={`inline-flex p-2.5 bg-gradient-to-br ${color} rounded-xl shadow-lg mb-3 transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  </button>
);

// مكون الشات
const ModernChat: React.FC<ChatProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "bot",
      text: "مرحباً! أنا المساعد الذكي لإدارتي. كيف يمكنني مساعدتك اليوم؟",
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      text: message,
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([...messages, userMessage]);
    setMessage("");

    setTimeout(() => {
      const botMessage: Message = {
        id: messages.length + 2,
        type: "bot",
        text: "شكراً لتواصلك معنا. سيتم الرد عليك قريباً.",
        time: new Date().toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 w-96 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Headphones className="w-5 h-5 text-white" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-white"></span>
            </div>
            <div>
              <h3 className="font-semibold text-white">الدعم الفني</h3>
              <p className="text-xs text-white/80">فريق الدعم متاح 24/7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`relative max-w-[80%] rounded-lg p-3 ${
                msg.type === "user"
                  ? "bg-gray-200 text-gray-900"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.type === "user" ? "text-gray-500" : "text-white/70"
                }`}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-100 bg-white"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="flex-1 px-3 py-2 bg-gray-100/50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
          />
          <button
            type="submit"
            className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
            disabled={!message.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default function Dashboard() {
  const {
    user,
    currentSchool, // تغيير: استخدم currentSchool بدلاً من schoolId, role
    signOut,
    loading: authLoading,
    allSchools,
    switchSchool,
  } = useAuth();

  // استخراج schoolId و role من currentSchool
  const schoolId = currentSchool?.schoolId;
  const role = currentSchool?.role;

  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [stats, setStats] = useState<Statistics>({
    totalStudents: 0,
    activeStudents: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentBackground, setCurrentBackground] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [dataError, setDataError] = useState<string | null>(null);
  const [parentsCount, setParentsCount] = useState(0);
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);

  const hasLoadedStatsRef = useRef(false);
  const isLoadingRef = useRef(false);

  const backgrounds = [
    {
      image: backgroundPattern,
      overlay: "from-blue-50/30 to-indigo-50/30",
    },
    {
      image: backgroundWave,
      overlay: "from-emerald-50/30 to-teal-50/30",
    },
    {
      image: backgroundDots,
      overlay: "from-purple-50/30 to-pink-50/30",
    },
  ];

  // تحميل عدد أولياء الأمور
  const loadParentsCount = async () => {
    if (!schoolId) return;
    try {
      const { count, error } = await supabase
        .from("parents")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId);

      if (!error) {
        setParentsCount(count || 0);
      }
    } catch (error) {
      console.error("Error loading parents count:", error);
    }
  };

  // تحميل الإحصائيات
  const loadStatistics = async () => {
    if (isLoadingRef.current) return;
    if (!schoolId) return;

    isLoadingRef.current = true;
    setStatsLoading(true);
    setDataError(null);

    try {
      const [studentsRes, feesRes, expensesRes] = await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact" })
          .eq("school_id", schoolId),
        supabase.from("fees").select("amount").eq("school_id", schoolId),
        supabase.from("expenses").select("amount").eq("school_id", schoolId),
      ]);

      const totalStudents = studentsRes.count || 0;
      const activeStudents =
        studentsRes.data?.filter((s) => s.status === "active").length || 0;

      const totalRevenue =
        feesRes.data?.reduce((sum, fee) => sum + Number(fee.amount || 0), 0) ||
        0;
      const totalExpenses =
        expensesRes.data?.reduce(
          (sum, exp) => sum + Number(exp.amount || 0),
          0,
        ) || 0;

      setStats({
        totalStudents,
        activeStudents,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
      });

      hasLoadedStatsRef.current = true;
    } catch (error: any) {
      console.error("Error loading statistics:", error);
      setDataError(error?.message || "حدث خطأ في تحميل البيانات");
    } finally {
      setStatsLoading(false);
      isLoadingRef.current = false;
    }
  };

  // تحميل البيانات عند توفر schoolId
  useEffect(() => {
    if (!schoolId) return;
    if (hasLoadedStatsRef.current) return;
    loadStatistics();
    loadParentsCount();
  }, [schoolId]);

  // الاستماع لتغيير المدرسة
  useEffect(() => {
    const handleSchoolChange = () => {
      hasLoadedStatsRef.current = false;
      loadStatistics();
      loadParentsCount();
    };

    window.addEventListener("schoolChanged", handleSchoolChange);
    return () =>
      window.removeEventListener("schoolChanged", handleSchoolChange);
  }, [schoolId]);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    if (view === "dashboard") {
      hasLoadedStatsRef.current = false;
      loadStatistics();
    }
  };

  const handleRefresh = () => {
    hasLoadedStatsRef.current = false;
    loadStatistics();
    loadParentsCount();
  };

  // بيانات الرسم البياني
  const revenueData = [65, 45, 75, 55, 85, 95, 70];
  const days = ["إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت", "أحد"];

  // بيانات الترند العشوائية
  const calculateTrend = (): { trend: "up" | "down"; value: number } => {
    const mockChange = Math.random() * 20 - 10;
    return {
      trend: mockChange >= 0 ? "up" : "down",
      value: Math.abs(Math.round(mockChange * 10) / 10),
    };
  };

  const [studentsTrend] = useState(calculateTrend());
  const [revenueTrend] = useState(calculateTrend());
  const [expensesTrend] = useState(calculateTrend());
  const [profitTrend] = useState(calculateTrend());

  // التحقق من الصلاحيات
  const canManageFees = role === "owner" || role === "accountant";
  const canManageExpenses = role !== "teacher";

  // عرض شاشة التحميل
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // عرض شاشة اختيار المدرسة إذا كان المستخدم في عدة مدارس
  if (!schoolId && allSchools.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <School className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">اختر مدرسة</h2>
            <p className="text-gray-500 mb-6">
              أنت مسجل في {allSchools.length} مدرسة. يرجى اختيار مدرسة للعمل
              عليها.
            </p>
            <div className="space-y-3">
              {allSchools.map((school) => (
                <button
                  key={school.school_id}
                  onClick={() => switchSchool(school.school_id)}
                  className="w-full p-4 text-right bg-gray-50 hover:bg-blue-50 rounded-xl transition-all duration-200 border border-gray-100 hover:border-blue-200"
                >
                  <div className="font-medium text-gray-900">
                    المدرسة #{school.school_id.slice(0, 8)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    الدور:{" "}
                    {school.role === "owner"
                      ? "مالك"
                      : school.role === "admin"
                        ? "مدير"
                        : school.role === "accountant"
                          ? "محاسب"
                          : "معلم"}
                    {school.is_primary && " (أساسية)"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">لا يوجد مدرسة مرتبطة بالمستخدم</p>
        </div>
      </div>
    );
  }

  const roleName =
    role === "owner"
      ? "مالك"
      : role === "accountant"
        ? "محاسب"
        : role === "teacher"
          ? "معلم"
          : "مشرف";

  return (
    <div className="min-h-screen bg-gray-50/50 relative" dir="rtl">
      {/* خلفية متحركة مع صورة */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${backgrounds[currentBackground].image})`,
            opacity: 0.15,
          }}
        />

        <div
          className={`absolute inset-0 bg-gradient-to-br ${backgrounds[currentBackground].overlay} transition-all duration-1000`}
        />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.03),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.03),transparent_50%)]" />

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {backgrounds.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBackground(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentBackground === index
                  ? "w-6 bg-blue-600"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
<div className="flex items-center gap-4">
  <div
    className="relative group cursor-pointer"
    onClick={() => handleViewChange("dashboard")}
  >
    <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg relative z-10">
      <BarChart3 className="w-6 h-6 text-white" />
    </div>
  </div>

  <div className="h-6 w-px bg-gray-200"></div>

  {/* اللوجو فقط */}
  <div className="flex items-center gap-3">
    <img 
      src={logo} 
      alt="شعار المدرسة" 
      className="h-10 w-auto object-contain"
    />
    <div>
      <p className="text-xs text-gray-500">
        {user?.email} • {roleName}
      </p>
    </div>
  </div>
</div>
              <div className="flex items-center gap-2">
                {/* زر تبديل المدرسة - يظهر فقط إذا كان المستخدم في عدة مدارس */}
                {allSchools.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSchoolSwitcher(!showSchoolSwitcher)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 hover:bg-gray-200/80 rounded-lg transition-all duration-200"
                    >
                      <School className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">
                        تبديل المدرسة
                      </span>
                    </button>

                    {showSchoolSwitcher && (
                      <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                        {allSchools.map((school) => (
                          <button
                            key={school.school_id}
                            onClick={() => {
                              switchSchool(school.school_id);
                              setShowSchoolSwitcher(false);
                            }}
                            className={`w-full p-3 text-right hover:bg-gray-50 transition-all duration-200 ${
                              school.school_id === schoolId ? "bg-blue-50" : ""
                            }`}
                          >
                            <div className="font-medium text-sm text-gray-900">
                              مدرسة #{school.school_id.slice(0, 8)}
                              {school.school_id === schoolId && (
                                <span className="mr-2 text-blue-600 text-xs">
                                  (الحالية)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              الدور:{" "}
                              {school.role === "owner"
                                ? "مالك"
                                : school.role === "admin"
                                  ? "مدير"
                                  : school.role === "accountant"
                                    ? "محاسب"
                                    : "معلم"}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="p-2 hover:bg-gray-100/80 rounded-xl transition-all duration-200 relative"
                >
                  <MessageCircle className="w-4 h-4 text-gray-600" />
                </button>

                <div className="relative">
                  <button className="p-2 hover:bg-gray-100/80 rounded-xl transition-all duration-200 relative">
                    <Bell className="w-4 h-4 text-gray-600" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
                  </button>
                </div>

                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <span className="text-sm">تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* شريط حالة المدرسة */}
        <div className="relative border-b border-gray-200/50 bg-white/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-lg">
                    <School className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      {currentSchool?.schoolName || "جاري التحميل..."}
                    </span>{" "}
                    {role && (
                      <span className="text-xs text-gray-500 mr-2">
                        ({roleName})
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-gray-300 text-lg leading-none">•</span>

                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    <span className="font-medium text-gray-900">
                      {formatNumber(stats.activeStudents)}
                    </span>{" "}
                    طالب نشط
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full border border-green-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-medium text-green-700">
                  مباشر
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* زر الشات */}
        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="group relative w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-600/25 transition-all duration-300 hover:scale-110"
          >
            <MessageCircle className="w-5 h-5 mx-auto transition-transform duration-300 group-hover:rotate-12" />
          </button>
        </div>

        <ModernChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {/* المحتوى الرئيسي */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-6">
            {/* Sidebar */}
            {showSidebar && (
              <aside className="w-64 flex-shrink-0">
                <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-2 sticky top-20 border border-gray-100/50">
                  <ModernMenuItem
                    label="لوحة التحكم"
                    icon={Home}
                    view="dashboard"
                    currentView={currentView}
                    onClick={() => handleViewChange("dashboard")}
                  />
                  <ModernMenuItem
                    label="الطلاب"
                    icon={GraduationCap}
                    view="students"
                    count={stats.activeStudents}
                    currentView={currentView}
                    onClick={() => handleViewChange("students")}
                  />
                  <ModernMenuItem
                    label="المعلمين"
                    icon={Briefcase}
                    view="teachers"
                    currentView={currentView}
                    onClick={() => handleViewChange("teachers")}
                  />
                  <ModernMenuItem
                    label="أولياء الأمور"
                    icon={Heart}
                    view="parents"
                    count={parentsCount}
                    currentView={currentView}
                    onClick={() => handleViewChange("parents")}
                  />

                  {canManageFees && (
                    <ModernMenuItem
                      label="تحصيل المصاريف"
                      icon={Wallet}
                      view="fees"
                      currentView={currentView}
                      onClick={() => handleViewChange("fees")}
                    />
                  )}

                  {canManageExpenses && (
                    <ModernMenuItem
                      label="التكاليف"
                      icon={TrendingDown}
                      view="expenses"
                      currentView={currentView}
                      onClick={() => handleViewChange("expenses")}
                    />
                  )}

                  <ModernMenuItem
                    label="تقرير الأرباح"
                    icon={TrendingUp}
                    view="reports"
                    currentView={currentView}
                    onClick={() => handleViewChange("reports")}
                  />

                  <ModernMenuItem
                    label="الإعدادات"
                    icon={Settings}
                    view="settings"
                    currentView={currentView}
                    onClick={() => handleViewChange("settings")}
                  />

                  <div className="h-px bg-gray-200 my-2"></div>

                  <button
                    onClick={() => setShowSidebar(false)}
                    className="w-full mt-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 rounded-lg transition-colors duration-200"
                  >
                    <ChevronRight className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </aside>
            )}

            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="fixed right-4 top-20 z-40 p-2 bg-white/90 backdrop-blur-xl rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100/50"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {currentView === "dashboard" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900">
                        لوحة التحكم
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="text-blue-600 font-medium">
                          مرحباً بعودتك
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefresh}
                        className="p-2 hover:bg-gray-100/80 rounded-lg transition-all duration-200"
                        title="تحديث"
                      >
                        <RefreshCw className="w-4 h-4 text-gray-600" />
                      </button>
                      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xl rounded-lg p-1 border border-gray-100/50">
                        {["يوم", "أسبوع", "شهر", "سنة"].map((period, index) => {
                          const periods = ["day", "week", "month", "year"];
                          return (
                            <button
                              key={periods[index]}
                              onClick={() => setSelectedPeriod(periods[index])}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                selectedPeriod === periods[index]
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                              }`}
                            >
                              {period}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {dataError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <p className="text-sm text-red-700">{dataError}</p>
                      <button
                        onClick={handleRefresh}
                        className="mr-auto text-sm bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  )}

                  {statsLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="relative">
                        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500">
                          جاري تحميل البيانات...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ModernStatCard
                          title="إجمالي الطلاب"
                          value={stats.totalStudents}
                          icon={Users}
                          trend={studentsTrend.trend}
                          trendValue={studentsTrend.value}
                          color="from-blue-600 to-indigo-600"
                          subValue={`${formatNumber(stats.activeStudents)} نشط`}
                        />
                        <ModernStatCard
                          title="إجمالي المعلمين"
                          value={
                            stats.totalStudents > 0
                              ? Math.ceil(stats.totalStudents / 20)
                              : 0
                          }
                          icon={Briefcase}
                          color="from-emerald-600 to-teal-600"
                          subValue="تقديري بناءً على عدد الطلاب"
                        />
                        <ModernStatCard
                          title="إجمالي الإيرادات"
                          value={stats.totalRevenue}
                          icon={DollarSign}
                          isCurrency={true}
                          trend={revenueTrend.trend}
                          trendValue={revenueTrend.value}
                          color="from-emerald-600 to-teal-600"
                        />
                        <ModernStatCard
                          title="إجمالي التكاليف"
                          value={stats.totalExpenses}
                          icon={TrendingDown}
                          isCurrency={true}
                          trend={expensesTrend.trend}
                          trendValue={expensesTrend.value}
                          color="from-red-600 to-rose-600"
                        />
                        <ModernStatCard
                          title="صافي الربح"
                          value={stats.netProfit}
                          icon={TrendingUp}
                          isCurrency={true}
                          trend={profitTrend.trend}
                          trendValue={profitTrend.value}
                          color="from-purple-600 to-pink-600"
                        />
                        <ModernStatCard
                          title="أولياء الأمور"
                          value={parentsCount}
                          icon={Heart}
                          color="from-purple-600 to-pink-600"
                          subValue="مسجلين في النظام"
                        />
                      </div>

                      {/* الرسم البياني */}
                      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-6 border border-gray-100/50">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              نظرة عامة على الإيرادات
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              آخر 7 أيام
                            </p>
                          </div>
                          <button className="p-2 hover:bg-gray-100/80 rounded-lg transition-colors duration-200">
                            <Maximize2 className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>

                        <div className="h-32 flex items-end gap-2">
                          {revenueData.map((value, i) => (
                            <div
                              key={i}
                              className="flex-1 flex flex-col items-center gap-1"
                            >
                              <div
                                className="w-full bg-gradient-to-t from-blue-600 to-indigo-600 rounded-t-lg transition-all duration-500 hover:from-blue-500 hover:to-indigo-500"
                                style={{ height: `${value}%` }}
                              ></div>
                              <span className="text-xs text-gray-500">
                                {days[i]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* الإجراءات السريعة */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                          إجراءات سريعة
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          <QuickActionCard
                            title="إضافة طالب"
                            description="تسجيل طالب جديد في النظام"
                            icon={UserPlus}
                            color="from-blue-600 to-indigo-600"
                            onClick={() => handleViewChange("students")}
                          />
                          <QuickActionCard
                            title="إضافة ولي أمر"
                            description="تسجيل ولي أمر جديد"
                            icon={Heart}
                            color="from-purple-600 to-pink-600"
                            onClick={() => handleViewChange("parents")}
                          />
                          {canManageFees && (
                            <QuickActionCard
                              title="تسجيل مصروف"
                              description="تسجيل مصروفات جديدة"
                              icon={Wallet}
                              color="from-emerald-600 to-teal-600"
                              onClick={() => handleViewChange("fees")}
                            />
                          )}
                          {canManageExpenses && (
                            <QuickActionCard
                              title="إضافة مصروف"
                              description="تسجيل مصروفات إدارية"
                              icon={TrendingDown}
                              color="from-red-600 to-rose-600"
                              onClick={() => handleViewChange("expenses")}
                            />
                          )}
                          <QuickActionCard
                            title="عرض التقارير"
                            description="تحليل الأرباح والخسائر"
                            icon={BarChart3}
                            color="from-purple-600 to-pink-600"
                            onClick={() => handleViewChange("reports")}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : currentView === "students" ? (
                <StudentsManager onUpdate={handleRefresh} />
              ) : currentView === "teachers" ? (
                <TeachersManager onUpdate={handleRefresh} />
              ) : currentView === "parents" ? (
                <ParentsManager onUpdate={handleRefresh} />
              ) : currentView === "fees" ? (
                <FeesManager onUpdate={handleRefresh} />
              ) : currentView === "expenses" ? (
                <ExpensesManager onUpdate={handleRefresh} />
              ) : currentView === "reports" ? (
                <ProfitReport />
              ) : currentView === "settings" ? (
                <SettingsManager />
              ) : (
                <div className="bg-white/90 backdrop-blur-xl rounded-xl p-8 text-center">
                  <p className="text-gray-500">جاري التطوير...</p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
