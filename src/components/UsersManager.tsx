import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface SchoolUser {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'teacher' | 'accountant';
}

export default function UsersManager() {
  const { schoolId } = useAuth();
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;

    loadUsers();
  }, [schoolId]);

  const loadUsers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('school_users')
      .select('id, user_id, role')
      .eq('school_id', schoolId);

    if (error) {
      console.error(error);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  };

  const updateRole = async (id: string, newRole: string) => {
    const { error } = await supabase
      .from('school_users')
      .update({ role: newRole })
      .eq('id', id);

    if (!error) {
      loadUsers();
    }
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase
      .from('school_users')
      .delete()
      .eq('id', id);

    if (!error) {
      loadUsers();
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">إدارة المستخدمين</h2>

      {loading ? (
        <div className="text-center py-6">جاري التحميل...</div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between border p-3 rounded-lg"
            >
              <div>
                <p className="font-medium">{user.user_id}</p>
                <p className="text-sm text-gray-500">{user.role}</p>
              </div>

              <div className="flex gap-2">
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="accountant">Accountant</option>
                </select>

                <button
                  onClick={() => deleteUser(user.id)}
                  className="text-red-600 text-sm hover:underline"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-center text-gray-500 py-6">
              لا يوجد مستخدمين
            </div>
          )}
        </div>
      )}
    </div>
  );
}