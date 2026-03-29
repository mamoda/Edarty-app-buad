import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Role = 'owner' | 'admin' | 'teacher' | 'accountant';

interface AuthContextType {
  user: User | null;
  schoolId: string | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  // 👇 تجيب بيانات المدرسة + الدور
  const fetchUserSchool = async (userId: string) => {
    const { data, error } = await supabase
      .from('school_users')
      .select('school_id, role')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching school data:', error);
      return null;
    }

    return data;
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const schoolData = await fetchUserSchool(currentUser.id);
        setSchoolId(schoolData?.school_id ?? null);
        setRole(schoolData?.role ?? null);
      }

      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const schoolData = await fetchUserSchool(currentUser.id);
          setSchoolId(schoolData?.school_id ?? null);
          setRole(schoolData?.role ?? null);
        } else {
          setSchoolId(null);
          setRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });

    // 🔥 مهم: بعد التسجيل هتعمل school + تربط user (بعد كده)
    // حالياً سيبها كده لحد ما نعمل flow الإنشاء

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSchoolId(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        schoolId,
        role,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}