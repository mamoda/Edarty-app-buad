// src/components/FeesManager.tsx (النسخة الكاملة والمحسنة)
import { useState, useEffect } from "react";
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  CheckCircle,
  CreditCard,
  Banknote,
  Landmark,
  FileText,
  Printer,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  Receipt,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Fee, Student } from "../types/database";

interface FeesManagerProps {
  onUpdate: () => void;
}

interface StudentBalance {
  student_id: string;
  student_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  total_paid: number;
  total_refunded: number;
  net_paid: number;
  balance: number;
  last_payment_date: string | null;
  last_payment_method?: string;
  status: "مدين" | "دائن" | "متوازن";
  payment_percentage: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance_after: number;
  payment_method?: string;
}

export default function FeesManager({ onUpdate }: FeesManagerProps) {
  const { currentSchool } = useAuth();
  const schoolId = currentSchool?.schoolId;
  const role = currentSchool?.role;

  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentBalances, setStudentBalances] = useState<StudentBalance[]>([]);
  const [studentTransactions, setStudentTransactions] = useState<Transaction[]>([]);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [selectedView, setSelectedView] = useState<"dashboard" | "students" | "transactions">("dashboard");
  const [schoolName, setSchoolName] = useState("نظام إدارتي");

  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_type: "رسوم دراسية",
    payment_date: new Date().toISOString().split("T")[0],
    academic_year: new Date().getFullYear().toString(),
    notes: "",
    payment_method: "cash" as "cash" | "card" | "bank_transfer" | "check",
  });

  // جلب اسم المدرسة
  useEffect(() => {
    const fetchSchoolName = async () => {
      if (schoolId) {
        try {
          const { data, error } = await supabase
            .from("schools")
            .select("name")
            .eq("id", schoolId)
            .single();
          
          if (error) throw error;
          if (data?.name) {
            setSchoolName(data.name);
          }
        } catch (error) {
          console.error("Error fetching school name:", error);
          setSchoolName("نظام إدارتي");
        }
      }
    };
    
    fetchSchoolName();
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId, selectedMonth, selectedYear]);

  useEffect(() => {
    calculateBalances();
  }, [fees, students]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentTransactions(selectedStudent.id);
    }
  }, [selectedStudent, fees]);

  const formatNumber = (num: number, fractionDigits: number = 2) => {
    return Number(num).toLocaleString("ar-EG", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const getMonthName = (month: number) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[month - 1];
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4 text-green-600" />;
      case 'card': return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'bank_transfer': return <Landmark className="w-4 h-4 text-purple-600" />;
      case 'check': return <FileText className="w-4 h-4 text-orange-600" />;
      default: return <DollarSign className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "دائن":
        return "text-green-600 bg-green-100";
      case "مدين":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const loadData = async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay}`;

      const [feesRes, studentsRes] = await Promise.all([
        supabase
          .from("fees")
          .select("*")
          .eq("school_id", schoolId)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .order("payment_date", { ascending: false }),
        supabase
          .from("students")
          .select("*")
          .eq("school_id", schoolId)
          .order("full_name"),
      ]);

      if (feesRes.error) throw feesRes.error;
      if (studentsRes.error) throw studentsRes.error;

      const feesWithStudents = (feesRes.data || []).map(fee => ({
        ...fee,
        student: studentsRes.data?.find(s => s.id === fee.student_id) || null
      }));

      setFees(feesWithStudents);
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBalances = () => {
    const balances: StudentBalance[] = students.map((student) => {
      const studentFees = fees.filter((f) => f.student_id === student.id);
      
      const total_paid = studentFees
        .filter(f => f.amount > 0)
        .reduce((sum, fee) => sum + fee.amount, 0);
      
      const total_refunded = studentFees
        .filter(f => f.amount < 0)
        .reduce((sum, fee) => sum + Math.abs(fee.amount), 0);

      const net_paid = total_paid - total_refunded;
      const balance = net_paid - 5000; // افتراض رسوم 5000 ج.م

      const last_payment = studentFees.length > 0
        ? studentFees.sort(
            (a, b) =>
              new Date(b.payment_date).getTime() -
              new Date(a.payment_date).getTime(),
          )[0]
        : null;

      let last_payment_method;
      if (last_payment?.notes) {
        try {
          const notes = JSON.parse(last_payment.notes);
          last_payment_method = notes.payment_method;
        } catch {
          last_payment_method = 'cash';
        }
      }

      let status: "مدين" | "دائن" | "متوازن" = "متوازن";
      if (balance < -100) status = "مدين";
      if (balance > 100) status = "دائن";

      return {
        student_id: student.id,
        student_name: student.full_name,
        grade: student.grade,
        parent_name: student.parent_name,
        parent_phone: student.parent_phone,
        total_paid,
        total_refunded,
        net_paid,
        balance,
        last_payment_date: last_payment?.payment_date || null,
        last_payment_method,
        status,
        payment_percentage: 5000 > 0 ? (net_paid / 5000) * 100 : 0,
      };
    });

    setStudentBalances(balances);
  };

  const loadStudentTransactions = (studentId: string) => {
    const studentFees = fees.filter((f) => f.student_id === studentId);

    let runningBalance = 0;
    const transactions: Transaction[] = studentFees
      .sort(
        (a, b) =>
          new Date(a.payment_date).getTime() -
          new Date(b.payment_date).getTime(),
      )
      .map((fee) => {
        runningBalance += fee.amount;
        
        let paymentMethod = 'cash';
        if (fee.notes) {
          try {
            const notes = JSON.parse(fee.notes);
            paymentMethod = notes.payment_method || 'cash';
          } catch {}
        }

        return {
          id: fee.id,
          date: fee.payment_date,
          description: fee.payment_type,
          amount: fee.amount,
          balance_after: runningBalance,
          payment_method: paymentMethod,
        };
      });

    setStudentTransactions(transactions);
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP-${year}${month}${day}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      const receiptNumber = generateReceiptNumber();

      const notesData = {
        text: formData.notes,
        payment_method: formData.payment_method,
        receipt_number: receiptNumber,
        timestamp: new Date().toISOString(),
      };

      const feeData = {
        student_id: formData.student_id,
        amount: parseFloat(formData.amount),
        payment_type: formData.payment_type,
        payment_date: formData.payment_date,
        academic_year: formData.academic_year,
        notes: JSON.stringify(notesData),
        school_id: schoolId,
        user_id: currentSchool?.schoolId,
      };

      if (editingFee) {
        const { error } = await supabase
          .from("fees")
          .update(feeData)
          .eq("id", editingFee.id)
          .eq("school_id", schoolId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("fees").insert([feeData]);
        if (error) throw error;
      }

      const student = students.find(s => s.id === formData.student_id);
      
      if (student) {
        const receipt = {
          receipt_number: receiptNumber,
          student_name: student.full_name,
          grade: student.grade,
          amount: parseFloat(formData.amount),
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          payment_type: formData.payment_type,
          notes: formData.notes,
        };
        setCurrentReceipt(receipt);
        setShowReceiptModal(true);
      }

      resetForm();
      loadData();
      onUpdate();
    } catch (error) {
      console.error("Error saving fee:", error);
      alert("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدفعة؟")) return;

    try {
      const { error } = await supabase
        .from("fees")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      loadData();
      onUpdate();
    } catch (error) {
      console.error("Error deleting fee:", error);
      alert("حدث خطأ أثناء حذف الدفعة");
    }
  };

  const handleEdit = (fee: Fee) => {
    let paymentMethod = "cash";
    let notesText = "";
    
    if (fee.notes) {
      try {
        const notes = JSON.parse(fee.notes);
        paymentMethod = notes.payment_method || "cash";
        notesText = notes.text || "";
      } catch {
        notesText = fee.notes;
      }
    }

    setEditingFee(fee);
    setFormData({
      student_id: fee.student_id,
      amount: Math.abs(fee.amount).toString(),
      payment_type: fee.payment_type,
      payment_date: fee.payment_date,
      academic_year: fee.academic_year,
      notes: notesText,
      payment_method: paymentMethod as any,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      amount: "",
      payment_type: "رسوم دراسية",
      payment_date: new Date().toISOString().split("T")[0],
      academic_year: new Date().getFullYear().toString(),
      notes: "",
      payment_method: "cash",
    });
    setEditingFee(null);
    setShowForm(false);
  };

  const printReceipt = () => {
    if (!currentReceipt) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDate = (date: string) =>
      new Date(date).toLocaleDateString("ar-EG");

    const paymentMethodLabel = 
      currentReceipt.payment_method === 'cash' ? 'نقدي' :
      currentReceipt.payment_method === 'card' ? 'بطاقة ائتمان' :
      currentReceipt.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إيصال دفع - ${currentReceipt.student_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; background: #f3f4f6; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .receipt { max-width: 400px; width: 100%; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid rgba(0,0,0,0.05); }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #e5e7eb; padding-bottom: 20px; }
          .school-name { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #059669, #047857); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 5px; }
          .receipt-title { font-size: 18px; color: #6b7280; margin-top: 5px; font-weight: 600; }
          .receipt-number { background: #f0fdf4; padding: 15px; border-radius: 12px; text-align: center; margin-bottom: 20px; border: 1px solid #dcfce7; }
          .receipt-number .value { font-size: 20px; font-weight: 800; color: #059669; font-family: monospace; letter-spacing: 1px; }
          .details { margin-bottom: 20px; background: #f9fafb; padding: 15px; border-radius: 12px; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
          .amount-section { background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #bbf7d0; }
          .amount-section .value { font-size: 42px; font-weight: 800; color: #059669; line-height: 1.2; }
          .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px dashed #e5e7eb; font-size: 11px; color: #9ca3af; }
          @media print { body { background: white; padding: 0; } .receipt { box-shadow: none; border: 1px solid #e5e7eb; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="school-name">${schoolName || "نظام إدارتي"}</div>
            <div class="receipt-title">💰 إيصال دفع المصاريف الدراسية</div>
          </div>
          <div class="receipt-number">
            <div class="value">${currentReceipt.receipt_number}</div>
          </div>
          <div class="details">
            <div class="detail-row"><span>👤 اسم الطالب:</span><span>${currentReceipt.student_name}</span></div>
            <div class="detail-row"><span>📚 الصف الدراسي:</span><span>${currentReceipt.grade}</span></div>
            <div class="detail-row"><span>📅 تاريخ الدفع:</span><span>${formatDate(currentReceipt.payment_date)}</span></div>
            <div class="detail-row"><span>💳 طريقة الدفع:</span><span>${paymentMethodLabel}</span></div>
            <div class="detail-row"><span>📝 نوع الدفعة:</span><span>${currentReceipt.payment_type}</span></div>
          </div>
          <div class="amount-section">
            <div class="value">${currentReceipt.amount.toFixed(2)} ج.م</div>
          </div>
          ${currentReceipt.notes ? `<div class="notes" style="background: #fef9e3; padding: 10px; border-radius: 8px; margin-top: 15px; font-size: 12px; color: #92400e;"><span>📝 ملاحظات:</span> ${currentReceipt.notes}</div>` : ''}
          <div class="footer"><p>${schoolName || "نظام إدارتي"} - إدارة المصاريف الدراسية</p></div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const printStatement = (student: Student, balance: StudentBalance) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDate = (date: string) =>
      new Date(date).toLocaleDateString("ar-EG");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${student.full_name}</title>
        <style>
          body { font-family: 'Cairo', sans-serif; background: #f3f4f6; padding: 20px; }
          .statement { max-width: 800px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .school-name { font-size: 24px; font-weight: bold; color: #059669; }
          .balance-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .balance-card { background: #f8fafc; padding: 15px; border-radius: 10px; text-align: center; border-right: 4px solid #059669; }
          .balance-value { font-size: 20px; font-weight: bold; color: #059669; }
          .transactions-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .transactions-table th { background: #059669; color: white; padding: 12px; }
          .transactions-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .deposit { color: #059669; }
          .withdrawal { color: #dc2626; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px dashed #e5e7eb; text-align: center; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="statement">
          <div class="header">
            <div class="school-name">${schoolName || "نظام إدارتي"}</div>
            <div style="font-size: 12px; color: #6b7280;">كشف حساب الطالب</div>
          </div>
          <div class="balance-info">
            <div class="balance-card"><div>إجمالي المدفوعات</div><div class="balance-value">${formatNumber(balance.total_paid)} ج.م</div></div>
            <div class="balance-card"><div>صافي المدفوعات</div><div class="balance-value">${formatNumber(balance.net_paid)} ج.م</div></div>
            <div class="balance-card"><div>الرصيد الحالي</div><div class="balance-value" style="color: ${balance.balance >= 0 ? "#059669" : "#dc2626"}">${formatNumber(balance.balance)} ج.م</div></div>
          </div>
          <table class="transactions-table">
            <thead>
              <tr>
                <th class="text-right py-3 px-2">التاريخ</th>
                <th class="text-right py-3 px-2">البيان</th>
                <th class="text-right py-3 px-2">المبلغ</th>
                <th class="text-right py-3 px-2">طريقة الدفع</th>
                <th class="text-right py-3 px-2">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${studentTransactions.map(t => `
                <tr>
                  <td class="py-3 px-2">${formatDate(t.date)}</td>
                  <td class="py-3 px-2">${t.description}</td>
                  <td class="py-3 px-2 ${t.amount >= 0 ? "deposit" : "withdrawal"}">${t.amount >= 0 ? "+" : "-"}${formatNumber(Math.abs(t.amount))}</td>
                  <td class="py-3 px-2">
                    ${t.payment_method === 'cash' ? 'نقدي' :
                      t.payment_method === 'card' ? 'بطاقة' :
                      t.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}
                  </td>
                  <td class="py-3 px-2">${formatNumber(t.balance_after)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="footer"><p>${schoolName || "نظام إدارتي"} - إدارة المصاريف الدراسية</p></div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const filteredBalances = studentBalances.filter(
    (b) =>
      b.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.parent_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredFees = fees.filter(fee =>
    fee.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.payment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.academic_year.includes(searchTerm)
  );

  const paymentTypes = [
    "رسوم دراسية",
    "رسوم الكتب",
    "رسوم الأنشطة",
    "رسوم الزي المدرسي",
    "رسوم الباص",
    "دفعة مقدمة",
    "أخرى",
  ];

  const paymentMethods = [
    { value: "cash", label: "نقدي", icon: Banknote },
    { value: "card", label: "بطاقة ائتمان", icon: CreditCard },
    { value: "bank_transfer", label: "تحويل بنكي", icon: Landmark },
    { value: "check", label: "شيك", icon: FileText },
  ];

  // حساب الإحصائيات
  const totalPaid = fees.reduce((sum, f) => sum + (f.amount > 0 ? f.amount : 0), 0);
  const totalRefunded = fees.reduce((sum, f) => sum + (f.amount < 0 ? Math.abs(f.amount) : 0), 0);
  const netCollected = totalPaid - totalRefunded;

  const paymentMethodStats = {
    cash: 0,
    card: 0,
    bank_transfer: 0,
    check: 0,
  };

  fees.forEach(fee => {
    const amount = Math.abs(fee.amount);
    if (fee.notes) {
      try {
        const notes = JSON.parse(fee.notes);
        const method = notes.payment_method;
        if (method === 'cash') paymentMethodStats.cash += amount;
        else if (method === 'card') paymentMethodStats.card += amount;
        else if (method === 'bank_transfer') paymentMethodStats.bank_transfer += amount;
        else if (method === 'check') paymentMethodStats.check += amount;
        else paymentMethodStats.cash += amount;
      } catch {
        paymentMethodStats.cash += amount;
      }
    } else {
      paymentMethodStats.cash += amount;
    }
  });

  return (
    <div className="space-y-6">
      {/* باقي الكود كما هو - لم يتغير */}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">تحصيل المصاريف</h2>
          <p className="text-sm text-gray-500 mt-1">
            تسجيل ومتابعة المدفوعات والعمليات المالية
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">إضافة دفعة</span>
          </button>
          <button
            onClick={() => loadData()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="تحديث"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-2 flex gap-2 overflow-x-auto border border-gray-100/50">
        <button
          onClick={() => setSelectedView("dashboard")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            selectedView === "dashboard"
              ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md"
              : "hover:bg-gray-100"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>لوحة المعلومات</span>
        </button>
        <button
          onClick={() => setSelectedView("students")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            selectedView === "students"
              ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md"
              : "hover:bg-gray-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>أرصدة الطلاب</span>
        </button>
        <button
          onClick={() => setSelectedView("transactions")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            selectedView === "transactions"
              ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md"
              : "hover:bg-gray-100"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>سجل العمليات</span>
        </button>
      </div>

      {/* Dashboard View */}
      {selectedView === "dashboard" && (
        <>
          {/* Filter */}
          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">تصفية حسب:</span>
                </div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 text-sm"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                    <option key={month} value={month}>{getMonthName(month)}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 text-sm"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
                <Wallet className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">صافي التحصيل:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatNumber(netCollected)} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
              <div className="relative p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-gray-500">إجمالي المدفوعات</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(totalPaid)} ج.م</p>
                  </div>
                  <div className="relative mr-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl blur-xl opacity-30"></div>
                    <div className="relative p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
              <div className="relative p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-gray-500">إجمالي الاستردادات</p>
                    <p className="text-2xl font-bold text-red-600">{formatNumber(totalRefunded)} ج.م</p>
                  </div>
                  <div className="relative mr-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl blur-xl opacity-30"></div>
                    <div className="relative p-3 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl shadow-lg">
                      <TrendingDown className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
              <div className="relative p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-gray-500">عدد العمليات</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(fees.length, 0)}</p>
                  </div>
                  <div className="relative mr-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl blur-xl opacity-30"></div>
                    <div className="relative p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50">
              <div className="relative p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-gray-500">متوسط الدفعة</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {fees.length > 0 ? formatNumber(netCollected / fees.length) : "٠"} ج.م
                    </p>
                  </div>
                  <div className="relative mr-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl blur-xl opacity-30"></div>
                    <div className="relative p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Banknote className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">مدفوعات نقدية</p>
                  <p className="text-lg font-bold text-gray-900">{formatNumber(paymentMethodStats.cash)} ج.م</p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">مدفوعات بطاقة</p>
                  <p className="text-lg font-bold text-gray-900">{formatNumber(paymentMethodStats.card)} ج.م</p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Landmark className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">تحويل بنكي</p>
                  <p className="text-lg font-bold text-gray-900">{formatNumber(paymentMethodStats.bank_transfer)} ج.م</p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">شيكات</p>
                  <p className="text-lg font-bold text-gray-900">{formatNumber(paymentMethodStats.check)} ج.م</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Students Balances View */}
      {selectedView === "students" && (
        <>
          {/* Search Bar */}
          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث في أرصدة الطلاب..."
                className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
              />
            </div>
          </div>

          {/* Students Balances List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500">جاري تحميل البيانات...</p>
              </div>
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-12 text-center border border-gray-100/50">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات</h3>
              <p className="text-gray-600">لم يتم العثور على طلاب</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBalances.map((balance) => {
                const student = students.find(s => s.id === balance.student_id);
                return (
                  <div
                    key={balance.student_id}
                    className="group bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80 cursor-pointer"
                    onClick={() => {
                      if (student) {
                        setSelectedStudent(student);
                        loadStudentTransactions(student.id);
                        setShowStatementModal(true);
                      }
                    }}
                  >
                    <div className="relative p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900">{balance.student_name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(balance.status)}`}>
                              {balance.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">الصف:</span>
                              <span className="font-medium text-gray-900 mr-2">{balance.grade}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">ولي الأمر:</span>
                              <span className="font-medium text-gray-900 mr-2">{balance.parent_name}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">الهاتف:</span>
                              <span className="font-medium text-gray-900 mr-2" dir="ltr">{balance.parent_phone}</span>
                            </div>
                            {balance.last_payment_date && (
                              <div>
                                <span className="text-gray-600">آخر دفعة:</span>
                                <span className="font-medium text-gray-900 mr-2 flex items-center gap-1">
                                  {balance.last_payment_date}
                                  {balance.last_payment_method && (
                                    <span className="mr-1">
                                      {getPaymentMethodIcon(balance.last_payment_method)}
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-left">
                            <p className="text-sm text-gray-600">الرصيد الحالي</p>
                            <p className={`text-2xl font-bold ${balance.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatNumber(balance.balance)} ج.م
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (student) {
                                  printStatement(student, balance);
                                }
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="طباعة كشف حساب"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ ...formData, student_id: balance.student_id });
                                setShowForm(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="تسديد"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Payment Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">نسبة السداد</span>
                          <span className="font-medium">{balance.payment_percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              balance.payment_percentage >= 100
                                ? "bg-green-600"
                                : balance.payment_percentage >= 50
                                ? "bg-yellow-600"
                                : "bg-red-600"
                            } rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(100, balance.payment_percentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-600">
                            المدفوع: {formatNumber(balance.net_paid)} ج.م
                          </span>
                          <span className="text-gray-600">
                            المستحق: 5,000.00 ج.م
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Transactions View */}
      {selectedView === "transactions" && (
        <>
          {/* Search Bar */}
          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-gray-100/50">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث في العمليات..."
                className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
              />
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500">جاري تحميل البيانات...</p>
              </div>
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-12 text-center border border-gray-100/50">
              <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد عمليات</h3>
              <p className="text-gray-600">لم يتم تسجيل أي عمليات مالية</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredFees.map((fee) => {
                let paymentMethod = "cash";
                let notesText = "";
                if (fee.notes) {
                  try {
                    const notes = JSON.parse(fee.notes);
                    paymentMethod = notes.payment_method || "cash";
                    notesText = notes.text || "";
                  } catch {
                    notesText = fee.notes;
                  }
                }

                return (
                  <div
                    key={fee.id}
                    className="group bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
                  >
                    <div className="relative p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {fee.amount > 0 ? (
                            <ArrowUpCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <ArrowDownCircle className="w-6 h-6 text-red-600" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <p className="font-medium text-gray-900">{fee.student?.full_name}</p>
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full flex items-center gap-1">
                                {getPaymentMethodIcon(paymentMethod)}
                                <span>
                                  {paymentMethod === 'cash' ? 'نقدي' :
                                   paymentMethod === 'card' ? 'بطاقة' :
                                   paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-600">{fee.payment_type}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">{fee.payment_date}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">{fee.academic_year}</span>
                            </div>
                            {notesText && (
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="font-medium">ملاحظات:</span> {notesText}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-left">
                          <p className={`font-bold ${fee.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fee.amount >= 0 ? "+" : "-"}
                            {formatNumber(Math.abs(fee.amount))} ج.م
                          </p>
                        </div>
                        <div className="flex gap-1 mr-4">
                          <button
                            onClick={() => handleEdit(fee)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(fee.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingFee ? "تعديل الدفعة" : "إضافة دفعة جديدة"}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الطالب <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  required
                >
                  <option value="">اختر الطالب</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} - {student.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الدفعة <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  required
                >
                  <option value="">اختر نوع الدفعة</option>
                  {paymentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  طريقة الدفع <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ (ج.م) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الدفع <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السنة الدراسية
                </label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50"
                  placeholder="2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 resize-none"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  بعد إتمام العملية سيتم تحديث رصيد الطالب تلقائياً
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-medium"
                >
                  {editingFee ? "حفظ التعديلات" : "إضافة الدفعة"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-xl transition-all duration-300 font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && currentReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">تمت العملية بنجاح</h3>
                <p className="text-gray-600 mt-1">رقم الإيصال: {currentReceipt.receipt_number}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الطالب:</span>
                    <span className="font-medium">{currentReceipt.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الصف:</span>
                    <span className="font-medium">{currentReceipt.grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المبلغ:</span>
                    <span className="font-bold text-xl text-green-600">{currentReceipt.amount.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">التاريخ:</span>
                    <span>{new Date(currentReceipt.payment_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">طريقة الدفع:</span>
                    <span className="flex items-center gap-1">
                      {currentReceipt.payment_method === 'cash' && <Banknote className="w-4 h-4 text-green-600" />}
                      {currentReceipt.payment_method === 'card' && <CreditCard className="w-4 h-4 text-blue-600" />}
                      {currentReceipt.payment_method === 'bank_transfer' && <Landmark className="w-4 h-4 text-purple-600" />}
                      {currentReceipt.payment_method === 'check' && <FileText className="w-4 h-4 text-orange-600" />}
                      <span>
                        {currentReceipt.payment_method === 'cash' ? 'نقدي' :
                         currentReceipt.payment_method === 'card' ? 'بطاقة' :
                         currentReceipt.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={printReceipt}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  <span>طباعة الإيصال</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-xl transition-all"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statement Modal */}
      {showStatementModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">كشف حساب الطالب</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedStudent.full_name} - {selectedStudent.grade}</p>
              </div>
              <button
                onClick={() => {
                  setShowStatementModal(false);
                  setSelectedStudent(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {(() => {
                const balance = studentBalances.find(b => b.student_id === selectedStudent.id);
                return (
                  <>
                    {/* Balance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 text-center">
                        <p className="text-sm text-gray-600">إجمالي المدفوعات</p>
                        <p className="text-2xl font-bold text-green-600">{balance ? formatNumber(balance.total_paid) : "0"} ج.م</p>
                      </div>
                      <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-4 text-center">
                        <p className="text-sm text-gray-600">إجمالي الاستردادات</p>
                        <p className="text-2xl font-bold text-red-600">{balance ? formatNumber(balance.total_refunded) : "0"} ج.م</p>
                      </div>
                      <div className={`bg-gradient-to-r rounded-xl p-4 text-center ${balance && balance.balance >= 0 ? "from-blue-50 to-indigo-50" : "from-orange-50 to-red-50"}`}>
                        <p className="text-sm text-gray-600">الرصيد الحالي</p>
                        <p className={`text-2xl font-bold ${balance && balance.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                          {balance ? formatNumber(balance.balance) : "0"} ج.م
                        </p>
                      </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">التاريخ</th>
                            <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">البيان</th>
                            <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">المبلغ</th>
                            <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">طريقة الدفع</th>
                            <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">الرصيد</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentTransactions.map((t, index) => (
                            <tr key={t.id} className={`border-b border-gray-100 ${index % 2 === 0 ? "bg-gray-50/50" : ""}`}>
                              <td className="py-3 px-2 text-sm">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                              <td className="py-3 px-2 text-sm font-medium">{t.description}</td>
                              <td className="py-3 px-2 text-sm">
                                <span className={t.amount >= 0 ? "text-green-600" : "text-red-600"}>
                                  {t.amount >= 0 ? "+" : "-"}{formatNumber(Math.abs(t.amount))} ج.م
                                </span>
                              </td>
                              <td className="py-3 px-2 text-sm flex items-center gap-1">
                                {getPaymentMethodIcon(t.payment_method)}
                                <span>
                                  {t.payment_method === 'cash' ? 'نقدي' :
                                   t.payment_method === 'card' ? 'بطاقة' :
                                   t.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-sm font-medium">{formatNumber(t.balance_after)} ج.م</td>
                            </tr>
                          ))}
                        </tbody>
                       </table>
                    </div>

                    {studentTransactions.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">لا توجد عمليات مالية مسجلة لهذا الطالب</p>
                      </div>
                    )}

                    {/* Print Button */}
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => {
                          if (balance) {
                            printStatement(selectedStudent, balance);
                          }
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        <span>طباعة كشف الحساب</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}