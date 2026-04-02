// src/components/Login.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  School,
  MapPin,
  Phone,
  CreditCard,
  User,
  ArrowRight,
  ArrowLeft,
  Shield,
  Building2,
  CheckCircle,
} from "lucide-react";
import logo from "../assets/logo.png";
import bg from "../assets/background-wave.png";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth(); // استخدم user بدلاً من isAuthenticated
  const hasRedirected = useRef(false);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const [schoolData, setSchoolData] = useState({
    fullName: "",
    schoolName: "",
    schoolAddress: "",
    schoolPhone: "",
    taxNumber: "",
  });

  const ADMIN_SECRET_CODE = "Mahmoud17237ESD@";

  // التوجيه التلقائي عند تسجيل الدخول - باستخدام user بدلاً من isAuthenticated
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (user && !hasRedirected.current && !authLoading) {
      hasRedirected.current = true;
      timeoutId = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        console.log("🔐 Attempting login for:", email);
        const { error } = await signIn(email, password);

        if (error) {
          console.error("Login error:", error);
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
          setLoading(false);
        } else {
          console.log("✅ Login successful, waiting for redirect...");
          setLoading(false);
        }
      } else {
        if (!schoolData.fullName || !schoolData.schoolName) {
          setError("يرجى إكمال جميع البيانات المطلوبة");
          setLoading(false);
          return;
        }

        console.log("📝 Attempting signup for:", email);

        const { error: signUpError } = await signUp(
          email,
          password,
          schoolData.fullName
        );

        if (signUpError) {
          setError(
            "فشل في إنشاء الحساب. البريد الإلكتروني قد يكون مستخدماً بالفعل"
          );
          setLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { error: rpcError } = await supabase.rpc(
            "create_school_for_user",
            {
              school_name: schoolData.schoolName,
              user_full_name: schoolData.fullName,
            }
          );

          if (rpcError) {
            console.error("RPC error:", rpcError);
            setError("فشل في إنشاء المدرسة");
            setLoading(false);
            return;
          }
        }

        alert("✅ تم إنشاء الحساب بنجاح!");
        setIsLogin(true);
        setCurrentStep(1);
        setEmail("");
        setPassword("");
        setSchoolData({
          fullName: "",
          schoolName: "",
          schoolAddress: "",
          schoolPhone: "",
          taxNumber: "",
        });

        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("حدث خطأ. يرجى المحاولة مرة أخرى");
      setLoading(false);
    }
  };

  const handleAdminAccess = () => {
    if (adminCode === ADMIN_SECRET_CODE) {
      setShowAdminPanel(true);
      setIsLogin(false);
      setCurrentStep(1);
      setAdminCode("");
      setError("");
    } else {
      setError("❌ الكود السري غير صحيح");
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!email || !password || password.length < 6) {
        setError("يرجى إدخال بريد إلكتروني صالح وكلمة مرور لا تقل عن 6 أحرف");
        return;
      }
      if (!schoolData.fullName) {
        setError("يرجى إدخال اسم المستخدم");
        return;
      }
    }
    setError("");
    setCurrentStep(2);
  };

  const prevStep = () => {
    setCurrentStep(1);
    setError("");
  };

  // عرض شاشة تحميل إذا كان auth قيد التحميل
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* خلفية متحركة */}
      <div className="absolute inset-0 bg-black/40 z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 z-0"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img src={logo} alt="شعار التطبيق" className="h-30 w-auto mb-3 relative z-10" />
            </div>
            <p className="text-gray-600 text-center text-sm">
              ERP متكامل لإدارة المدارس والمؤسسات التعليمية بكل سهولة وأمان
            </p>
          </div>

          {!showAdminPanel && (
            <div className="flex gap-2 mb-6 bg-gray-100/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 text-sm ${
                  isLogin
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                تسجيل الدخول
              </button>
            </div>
          )}

          {showAdminPanel && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-medium text-amber-800">لوحة تحكم المسؤول</h3>
              </div>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setCurrentStep(1);
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all text-sm ${
                    isLogin
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setCurrentStep(1);
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all text-sm ${
                    !isLogin
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  إنشاء حساب جديد
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isLogin ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني
                  </label>
                  <div className="relative group">
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                      placeholder="example@school.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative group">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pr-10 pl-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جارٍ التحميل...</span>
                    </div>
                  ) : (
                    "تسجيل الدخول"
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-sm font-medium transition-colors ${
                        currentStep === 1 ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      الخطوة 1: بيانات الدخول
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                    <span
                      className={`text-sm font-medium transition-colors ${
                        currentStep === 2 ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      الخطوة 2: بيانات المدرسة
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 rounded-full"
                      style={{ width: currentStep === 1 ? "50%" : "100%" }}
                    />
                  </div>
                </div>

                {currentStep === 1 ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم الكامل
                      </label>
                      <div className="relative group">
                        <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.fullName}
                          onChange={(e) =>
                            setSchoolData({
                              ...schoolData,
                              fullName: e.target.value,
                            })
                          }
                          className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                          placeholder="أحمد محمد"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        البريد الإلكتروني
                      </label>
                      <div className="relative group">
                        <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                          placeholder="example@school.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        كلمة المرور
                      </label>
                      <div className="relative group">
                        <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pr-10 pl-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        كلمة المرور يجب أن تكون 6 أحرف على الأقل
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={nextStep}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <span>التالي: بيانات المدرسة</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم المدرسة <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <Building2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.schoolName}
                          onChange={(e) =>
                            setSchoolData({
                              ...schoolData,
                              schoolName: e.target.value,
                            })
                          }
                          className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                          placeholder="مدارس الإدارة التعليمية"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        عنوان المدرسة
                      </label>
                      <div className="relative group">
                        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.schoolAddress}
                          onChange={(e) =>
                            setSchoolData({
                              ...schoolData,
                              schoolAddress: e.target.value,
                            })
                          }
                          className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                          placeholder="القاهرة، مصر"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        هاتف المدرسة
                      </label>
                      <div className="relative group">
                        <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                        <input
                          type="tel"
                          value={schoolData.schoolPhone}
                          onChange={(e) =>
                            setSchoolData({
                              ...schoolData,
                              schoolPhone: e.target.value,
                            })
                          }
                          className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                          placeholder="01234567890"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الرقم الضريبي (اختياري)
                      </label>
                      <div className="relative group">
                        <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.taxNumber}
                          onChange={(e) =>
                            setSchoolData({
                              ...schoolData,
                              taxNumber: e.target.value,
                            })
                          }
                          className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                          placeholder="123-456-789"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>السابق</span>
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>جارٍ الإنشاء...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>إنشاء الحساب</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <div className="w-4 h-4 mt-0.5 flex-shrink-0">⚠️</div>
                <p>{error}</p>
              </div>
            )}
          </form>

          {!showAdminPanel && (
            <div className="mt-6">
              <div className="relative">
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="كود المسؤول"
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50 pr-10"
                />
                <button
                  type="button"
                  onClick={handleAdminAccess}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs bg-gradient-to-r from-amber-600 to-orange-600 text-white px-3 py-1 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-300"
                >
                  دخول
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>نظام إدارتــي لحسابات المدارس والمؤسسات التعليمية</p>
          <p className="text-xs mt-1">© 2024 جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
}