import { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Student } from '../types/database';

interface StudentsManagerProps {
  onUpdate: () => void;
}

export default function StudentsManager({ onUpdate }: StudentsManagerProps) {
  const { schoolId , user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    grade: '',
    parent_name: '',
    parent_phone: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    if (schoolId) {
      loadStudents();
    }
  }, [schoolId]);

  const loadStudents = async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStudent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('students').insert([
          {
            ...formData,
            school_id: schoolId,
            user_id: user?.id, // ✅ مهم جدًا
          },
        ]);

        if (error) throw error;
      }

      resetForm();
      loadStudents();
      onUpdate();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadStudents();
      onUpdate();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('حدث خطأ أثناء حذف الطالب');
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name,
      grade: student.grade,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      status: student.status,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      grade: '',
      parent_name: '',
      parent_phone: '',
      status: 'active',
    });
    setEditingStudent(null);
    setShowForm(false);
  };

  const filteredStudents = students.filter((student) =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.parent_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">إدارة الطلاب</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <UserPlus className="w-5 h-5" />
          <span>إضافة طالب</span>
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b flex justify-between">
              <h3 className="font-bold">
                {editingStudent ? 'تعديل الطالب' : 'إضافة طالب'}
              </h3>
              <button onClick={resetForm}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input
                placeholder="اسم الطالب"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />

              <input
                placeholder="الصف"
                value={formData.grade}
                onChange={(e) =>
                  setFormData({ ...formData, grade: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />

              <input
                placeholder="اسم ولي الأمر"
                value={formData.parent_name}
                onChange={(e) =>
                  setFormData({ ...formData, parent_name: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />

              <input
                placeholder="رقم الهاتف"
                value={formData.parent_phone}
                onChange={(e) =>
                  setFormData({ ...formData, parent_phone: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />

              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'active' | 'inactive',
                  })
                }
                className="w-full border p-2 rounded"
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded"
              >
                حفظ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 p-2 border rounded"
          />
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center text-gray-500">لا يوجد طلاب</div>
      ) : (
        <div className="grid gap-4">
          {filteredStudents.map((student) => (
            <div key={student.id} className="bg-white p-4 rounded-xl shadow flex justify-between">
              <div>
                <h3 className="font-bold">{student.full_name}</h3>
                <p className="text-sm text-gray-500">{student.grade}</p>
                <p className="text-sm">{student.parent_name}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleEdit(student)}>
                  <Edit2 />
                </button>
                <button onClick={() => handleDelete(student.id)}>
                  <Trash2 className="text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}