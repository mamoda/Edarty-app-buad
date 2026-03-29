import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  const fetchSchool = async (userId: string) => {
    try {
      console.log("CURRENT USER ID:", userId);

      const { data, error } = await supabase
        .from('school_users')
        .select('school_id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error(error);
        return { schoolId: null, role: null };
      }

      return {
        schoolId: data?.school_id ?? null,
        role: data?.role ?? null,
      };
    } catch (err) {
      console.error(err);
      return { schoolId: null, role: null };
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        const currentUser = session?.user ?? null;

        if (!isMounted) return;

        setUser(currentUser);

        if (currentUser) {
          const res = await fetchSchool(currentUser.id);
          setSchoolId(res.schoolId);
          setRole(res.role);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

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

        setLoading(false); // مهم جدًا هنا
      }
    );

    return () => {
      isMounted = false;
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
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error || !data.user) {
        return { error };
      }

      const userId = data.user.id;

      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .insert([{ name: schoolName }])
        .select()
        .maybeSingle();

      if (schoolError || !school) {
        return { error: schoolError };
      }

      const { error: linkError } = await supabase
        .from('school_users')
        .insert([
          {
            user_id: userId,
            school_id: school.id,
            role: 'owner',
          },
        ]);

      if (linkError) {
        return { error: linkError };
      }

      return { error: null };
    } catch (err) {
      console.error(err);
      return { error: err as Error };
    }
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}