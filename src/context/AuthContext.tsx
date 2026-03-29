import { createContext, useContext, useEffect, useState,useRef, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  schoolId: string | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, schoolName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const fetchSchool = async (userId: string) => {
    const { data, error } = await supabase
      .from('school_users')
      .select('school_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('fetchSchool error:', error);
      return { schoolId: null, role: null };
    }

    return {
      schoolId: data?.school_id ?? null,
      role: data?.role ?? null,
    };
  };

useEffect(() => {
  const initAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      const res = await fetchSchool(currentUser.id);
      setSchoolId(res.schoolId);
      setRole(res.role);
    } else {
      setSchoolId(null);
      setRole(null);
    }

    initialized.current = true;
    setLoading(false);
  };

  initAuth();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        const res = await fetchSchool(currentUser.id);
        setSchoolId(res.schoolId);
        setRole(res.role);
      } else {
        setSchoolId(null);
        setRole(null);
      }

      // 🔥 مهم: اقفل loading بعد أول تحديث فعلي
      if (!initialized.current) {
        setLoading(false);
        initialized.current = true;
      }
    }
  );

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

const signUp = async (email: string, password: string, schoolName: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) return { error };

  const userId = data.user.id;

  // ✅ تحقق مما إذا كانت المدرسة موجودة مسبقاً
  const { data: existingSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('name', schoolName)
    .maybeSingle();

  const school = existingSchool || (await supabase
    .from('schools')
    .insert([{ name: schoolName }])
    .select()
    .maybeSingle()).data;

  if (!school) return { error: new Error('Failed to create school') };

  const { error: linkError } = await supabase
    .from('school_users')
    .insert([{ user_id: userId, school_id: school.id, role: 'owner' }]);

  if (linkError) return { error: linkError };

  return { error: null };
};
console.log("loading:", loading);
console.log("user:", user);



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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

