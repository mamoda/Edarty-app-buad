import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { School, Lock } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const { signIn, signUp } = useAuth();

  const ADMIN_SECRET_CODE = 'Mahmoud17237ESD@'; // غير هذا الرقم السري

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        setError(isLogin ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'فشل في إنشاء الحساب');
      }
    } catch (err) {
      setError('حدث خطأ. يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAccess = () => {
    if (adminCode === ADMIN_SECRET_CODE) {
      setShowAdminPanel(true);
      setIsLogin(false); // التبديل إلى وضع إنشاء الحساب
      setAdminCode('');
    } else {
      alert('الكود السري غير صحيح');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-4 rounded-full mb-4">
              <School className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارتــي</h1>
            <p className="text-gray-600 text-center">بيانات أكثر وتقارير أدق وسهولة استخدام</p>
          </div>

          {/* إظهار أزرار التبديل فقط للمستخدمين العاديين أو إذا كان لوحة المسؤول ظاهرة */}
          {!showAdminPanel && (
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  isLogin
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                تسجيل الدخول
              </button>
              {/* زر إنشاء حساب غير متاح للمستخدمين العاديين */}
            </div>
          )}

          {/* لوحة المسؤول - تظهر فقط بعد إدخال الكود السري */}
          {showAdminPanel && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-800">لوحة تحكم المسؤول</h3>
              </div>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    isLogin
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    !isLogin
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  إنشاء حساب جديد
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="example@school.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'جارٍ التحميل...' : isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </button>
          </form>

          {/* حقل إدخال الكود السري للمسؤول */}
          {!showAdminPanel && (
            <div className="mt-4">
              <div className="relative">
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="كود المسؤول"
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleAdminAccess}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                >
                  دخول
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>نظام إدارتــي لحسابات المدارس والمؤسسات التعليمية</p>
        </div>
      </div>
    </div>
  );
}