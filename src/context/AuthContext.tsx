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

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchSchool(currentUser.id);
      }

      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchSchool(currentUser.id);
        } else {
          setSchoolId(null);
          setRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchSchool = async (userId: string) => {
    const { data, error } = await supabase
      .from('school_users')
      .select('school_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching school data:', error);
      return;
    }

    if (data) {
      setSchoolId(data.school_id);
      setRole(data.role);
    } else {
      console.warn('User not linked to any school');
      setSchoolId(null);
      setRole(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signUp = async (email: string, password: string, schoolName: string) => {
    // 1. Create user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      return { error };
    }

    const userId = data.user.id;

    // 2. Create school
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert([{ name: schoolName }])
      .select()
      .single();

    if (schoolError) {
      return { error: schoolError };
    }

    // 3. Link user to school
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