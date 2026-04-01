// src/hooks/useSchoolData.ts
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface SchoolData {
  schoolName: string;
  schoolEmail: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolTaxNumber: string;
  schoolIdentifier: string;
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  features: string[];
}

export function useSchoolData() {
  const { user, schoolId, role } = useAuth(); // استخدم user و schoolId فقط
  const [schoolName, setSchoolName] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolTaxNumber, setSchoolTaxNumber] = useState('');
  const [schoolIdentifier, setSchoolIdentifier] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (schoolId) {
      loadSchoolData();
    } else {
      setLoading(false);
    }
  }, [schoolId]);

  const loadSchoolData = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('name, email, address, phone, tax_number, identifier, subscription_plan, subscription_expires_at, features')
        .eq('id', schoolId)
        .single();

      if (error) throw error;

      if (data) {
        setSchoolName(data.name || '');
        setSchoolEmail(data.email || '');
        setSchoolAddress(data.address || '');
        setSchoolPhone(data.phone || '');
        setSchoolTaxNumber(data.tax_number || '');
        setSchoolIdentifier(data.identifier || '');
        setSubscriptionPlan(data.subscription_plan || null);
        setSubscriptionExpiresAt(data.subscription_expires_at || null);
        setFeatures(data.features || []);
      }
    } catch (error) {
      console.error('Error loading school data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSchoolData = async () => {
    await loadSchoolData();
  };

  return {
    schoolName,
    schoolEmail,
    schoolAddress,
    schoolPhone,
    schoolTaxNumber,
    schoolIdentifier,
    subscriptionPlan,
    subscriptionExpiresAt,
    features,
    loading,
    refreshSchoolData,
  };
}