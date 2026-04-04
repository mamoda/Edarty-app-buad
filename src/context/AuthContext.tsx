// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { SchoolUser, User as AppUser } from "../types/database";

// تمديد نوع SchoolUser لإضافة school_name
interface ExtendedSchoolUser extends SchoolUser {
  school_name?: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  userProfile: AppUser | null;
  currentSchool: {
    schoolId: string;
    schoolName: string;
    role: 'owner' | 'admin' | 'teacher' | 'accountant';
    isPrimary: boolean;
  } | null;
  allSchools: ExtendedSchoolUser[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    schoolName: string,
    fullName?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchSchool: (schoolId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [currentSchool, setCurrentSchool] = useState<AuthContextType['currentSchool']>(null);
  const [allSchools, setAllSchools] = useState<ExtendedSchoolUser[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب ملف المستخدم من جدول users
  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("fetchUserProfile error:", error);
      return null;
    }

    return data as AppUser;
  };

  // جلب جميع مدارس المستخدم مع أسماء المدارس
  const fetchUserSchools = async (userId: string) => {
    const { data, error } = await supabase
      .from("school_users")
      .select(`
        id,
        user_id,
        school_id,
        role,
        is_primary,
        created_at,
        schools:school_id (
          name
        )
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("fetchUserSchools error:", error);
      return [];
    }

    // تحويل البيانات لإضافة اسم المدرسة
    return data.map(item => ({
      id: item.id,
      user_id: item.user_id,
      school_id: item.school_id,
      role: item.role,
      is_primary: item.is_primary,
      created_at: item.created_at,
      school_name: (item.schools as any)?.name || "غير محدد"
    })) as ExtendedSchoolUser[];
  };

  // جلب اسم المدرسة من ID (احتياطي)
  const fetchSchoolName = async (schoolId: string): Promise<string> => {
    const { data, error } = await supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .single();
    
    if (error) {
      console.error("fetchSchoolName error:", error);
      return "غير محدد";
    }
    
    return data?.name || "غير محدد";
  };

  useEffect(() => {
    const handleSession = async (session: any) => {
      setLoading(true);

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // جلب ملف المستخدم
        const profile = await fetchUserProfile(currentUser.id);
        setUserProfile(profile);

        // جلب مدارس المستخدم
        const schools = await fetchUserSchools(currentUser.id);
        setAllSchools(schools);
        
        // تعيين المدرسة الحالية
        if (schools.length > 0) {
          // محاولة جلب آخر مدرسة تم استخدامها من localStorage
          const lastSchoolId = localStorage.getItem(`lastSchoolId_${currentUser.id}`);
          const lastSchool = schools.find(s => s.school_id === lastSchoolId);
          
          // أو اختيار المدرسة الأساسية
          const primarySchool = schools.find(s => s.is_primary);
          
          const defaultSchool = lastSchool || primarySchool || schools[0];
          
          if (defaultSchool) {
            setCurrentSchool({
              schoolId: defaultSchool.school_id,
              schoolName: defaultSchool.school_name || await fetchSchoolName(defaultSchool.school_id),
              role: defaultSchool.role,
              isPrimary: defaultSchool.is_primary || false,
            });
          }
        } else {
          setCurrentSchool(null);
        }
      } else {
        setUserProfile(null);
        setAllSchools([]);
        setCurrentSchool(null);
      }

      setLoading(false);
    };

    // أول تحميل
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await handleSession(session);
    };

    initAuth();

    // الاستماع لتغييرات المصادقة
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    schoolName: string,
    fullName?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
        }
      }
    });

    if (error || !data.user) return { error };

    const userId = data.user.id;

    // البحث عن المدرسة
    const { data: existingSchool, error: schoolError } = await supabase
      .from("schools")
      .select("id")
      .eq("name", schoolName)
      .maybeSingle();

    if (schoolError) return { error: schoolError };

    let schoolId: string;

    // إنشاء مدرسة جديدة إذا لم تكن موجودة
    if (!existingSchool) {
      const { data: newSchool, error: createError } = await supabase
        .from("schools")
        .insert([{ 
          name: schoolName,
          subscription_plan: 'free'
        }])
        .select()
        .single();

      if (createError || !newSchool) {
        return { error: new Error("Failed to create school") };
      }
      schoolId = newSchool.id;
    } else {
      schoolId = existingSchool.id;
    }

    // إضافة المستخدم كمستخدم للمدرسة
    const { error: linkError } = await supabase
      .from("school_users")
      .insert([
        {
          user_id: userId,
          school_id: schoolId,
          role: "owner",
          is_primary: true,
        },
      ]);

    if (linkError) return { error: linkError };

    // إضافة معلومات المستخدم في جدول users
    const { error: profileError } = await supabase
      .from("users")
      .upsert({
        id: userId,
        email: email,
        full_name: fullName || email.split('@')[0],
      });

    if (profileError) {
      console.error("Error creating user profile:", profileError);
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setCurrentSchool(null);
    setAllSchools([]);
  };

  const switchSchool = async (schoolId: string) => {
    const school = allSchools.find(s => s.school_id === schoolId);
    if (school && user) {
      // جلب اسم المدرسة إذا لم يكن موجوداً
      let schoolName = school.school_name;
      if (!schoolName) {
        schoolName = await fetchSchoolName(schoolId);
      }
      
      setCurrentSchool({
        schoolId: school.school_id,
        schoolName: schoolName,
        role: school.role,
        isPrimary: school.is_primary || false,
      });
      
      // حفظ آخر مدرسة للمستخدم
      localStorage.setItem(`lastSchoolId_${user.id}`, schoolId);
      
      // إعادة تحميل البيانات إذا لزم الأمر
      window.dispatchEvent(new CustomEvent('schoolChanged', { 
        detail: { schoolId: school.school_id, role: school.role, schoolName: schoolName }
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        currentSchool,
        allSchools,
        loading,
        signIn,
        signUp,
        signOut,
        switchSchool,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}