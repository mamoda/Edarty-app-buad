import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Download,
  FileSpreadsheet,
  FileText 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export default function ProfitReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  useEffect(() => {
    loadReportData();
  }, [selectedYear]);

  const loadReportData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [feesRes, expensesRes] = await Promise.all([
        supabase.from('fees').select('amount, payment_date').eq('user_id', user.id),
        supabase.from('expenses').select('amount, expense_date').eq('user_id', user.id),
      ]);

      if (feesRes.error) throw feesRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const fees = feesRes.data || [];
      const expenses = expensesRes.data || [];

      const years = new Set<string>();
      fees.forEach(f => years.add(new Date(f.payment_date).getFullYear().toString()));
      expenses.forEach(e => years.add(new Date(e.expense_date).getFullYear().toString()));
      setAvailableYears(Array.from(years).sort().reverse());

      const months = [
        'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];

      const monthlyStats: MonthlyData[] = months.map((month, index) => {
        const monthRevenue = fees
          .filter(f => {
            const date = new Date(f.payment_date);
            return date.getFullYear().toString() === selectedYear && date.getMonth() === index;
          })
          .reduce((sum, f) => sum + Number(f.amount), 0);

        const monthExpenses = expenses
          .filter(e => {
            const date = new Date(e.expense_date);
            return date.getFullYear().toString() === selectedYear && date.getMonth() === index;
          })
          .reduce((sum, e) => sum + Number(e.amount), 0);

        return {
          month,
          revenue: monthRevenue,
          expenses: monthExpenses,
          profit: monthRevenue - monthExpenses,
        };
      });

      setMonthlyData(monthlyStats);

      const yearRevenue = monthlyStats.reduce((sum, m) => sum + m.revenue, 0);
      const yearExpenses = monthlyStats.reduce((sum, m) => sum + m.expenses, 0);

      setTotalRevenue(yearRevenue);
      setTotalExpenses(yearExpenses);
      setNetProfit(yearRevenue - yearExpenses);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  // دالة لتصدير البيانات إلى Excel
  const exportToExcel = (data: any[], fileName: string, sheetName: string = 'تقرير') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    // ضبط عرض الأعمدة
    const maxWidth = 50;
    if (data.length > 0) {
      const firstRow = data[0];
      const wscols = Object.keys(firstRow).map(key => ({ 
        wch: Math.min(maxWidth, key.length + 10) 
      }));
      worksheet['!cols'] = wscols;
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `${fileName}_${selectedYear}.xlsx`);
  };

  // دالة لتصدير تقارير متعددة في ملف واحد
  const exportMultipleSheets = (sheets: { data: any[], sheetName: string }[], fileName: string) => {
    const workbook = XLSX.utils.book_new();
    
    sheets.forEach(({ data, sheetName }) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      if (data.length > 0) {
        const firstRow = data[0];
        const wscols = Object.keys(firstRow).map(key => ({ 
          wch: Math.min(50, key.length + 10) 
        }));
        worksheet['!cols'] = wscols;
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `${fileName}_${selectedYear}.xlsx`);
  };

  // تجهيز بيانات التصدير
  const prepareExportData = () => {
    // بيانات التقرير الشهري
    const monthlyReportData = monthlyData.map(item => ({
      'الشهر': item.month,
      'الإيرادات (ج.م)': item.revenue.toFixed(2),
      'التكاليف (ج.م)': item.expenses.toFixed(2),
      'صافي الربح (ج.م)': item.profit.toFixed(2),
      'الحالة': item.profit > 0 ? 'ربح' : item.profit < 0 ? 'خسارة' : 'متعادل'
    }));

    // بيانات الملخص
    const summaryData = [{
      'البيان': 'إجمالي الإيرادات',
      'القيمة (ج.م)': totalRevenue.toFixed(2)
    }, {
      'البيان': 'إجمالي التكاليف',
      'القيمة (ج.م)': totalExpenses.toFixed(2)
    }, {
      'البيان': 'صافي الربح',
      'القيمة (ج.م)': netProfit.toFixed(2)
    }, {
      'البيان': 'نسبة الربح',
      'القيمة': totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%'
    }, {
      'البيان': 'متوسط الإيرادات الشهري',
      'القيمة (ج.م)': (totalRevenue / 12).toFixed(2)
    }, {
      'البيان': 'متوسط التكاليف الشهري',
      'القيمة (ج.م)': (totalExpenses / 12).toFixed(2)
    }, {
      'البيان': 'متوسط الربح الشهري',
      'القيمة (ج.م)': (netProfit / 12).toFixed(2)
    }];

    // أفضل وأسوأ شهر
    const bestMonth = monthlyData.reduce((best, current) => 
      current.profit > best.profit ? current : best
    , monthlyData[0]);
    
    const worstMonth = monthlyData.reduce((worst, current) => 
      current.profit < worst.profit ? current : worst
    , monthlyData[0]);

    const analysisData = [{
      'التحليل': 'أفضل شهر',
      'الشهر': bestMonth?.month || '-',
      'القيمة (ج.م)': bestMonth?.profit.toFixed(2) || '0'
    }, {
      'التحليل': 'أسوأ شهر',
      'الشهر': worstMonth?.month || '-',
      'القيمة (ج.م)': worstMonth?.profit.toFixed(2) || '0'
    }, {
      'التحليل': 'إجمالي الأشهر الرابحة',
      'القيمة': monthlyData.filter(m => m.profit > 0).length.toString()
    }, {
      'التحليل': 'إجمالي الأشهر الخاسرة',
      'القيمة': monthlyData.filter(m => m.profit < 0).length.toString()
    }];

    return {
      monthly: monthlyReportData,
      summary: summaryData,
      analysis: analysisData
    };
  };

  const handleExportAll = () => {
    const data = prepareExportData();
    
    exportMultipleSheets([
      { data: data.summary, sheetName: 'ملخص' },
      { data: data.monthly, sheetName: 'تقرير شهري' },
      { data: data.analysis, sheetName: 'تحليلات' }
    ], `تقرير_الأرباح_${selectedYear}`);
  };

  const handleExportMonthly = () => {
    const data = prepareExportData();
    exportToExcel(data.monthly, `تقرير_شهري_${selectedYear}`, 'تقرير شهري');
  };

  const handleExportSummary = () => {
    const data = prepareExportData();
    exportToExcel(data.summary, `ملخص_${selectedYear}`, 'ملخص');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">تقرير الأرباح والخسائر</h2>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-3 py-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border-none focus:ring-0 outline-none bg-transparent"
            >
              {availableYears.length > 0 ? (
                availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))
              ) : (
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              )}
            </select>
          </div>

          {/* أزرار التصدير */}
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير الكل</span>
          </button>
          
          <button
            onClick={handleExportMonthly}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>تقرير شهري</span>
          </button>
          
          <button
            onClick={handleExportSummary}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>ملخص</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-green-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">إجمالي الإيرادات</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{totalRevenue.toFixed(2)} ج.م</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-red-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">إجمالي التكاليف</span>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{totalExpenses.toFixed(2)} ج.م</p>
            </div>

            <div className={`bg-white rounded-xl shadow-md p-6 border-r-4 ${
              netProfit >= 0 ? 'border-blue-600' : 'border-orange-600'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">صافي الربح</span>
                <TrendingUp className={`w-5 h-5 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} ج.م
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">التقرير الشهري لعام {selectedYear}</h3>
            <div className="overflow-x-auto">
              <table className="w-full" dir="rtl">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-right py-3 px-4 font-bold text-gray-700">الشهر</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">الإيرادات</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">التكاليف</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">الربح/الخسارة</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((data, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{data.month}</td>
                      <td className="py-3 px-4 text-green-600 font-medium">{data.revenue.toFixed(2)} ج.م</td>
                      <td className="py-3 px-4 text-red-600 font-medium">{data.expenses.toFixed(2)} ج.م</td>
                      <td className={`py-3 px-4 font-bold ${
                        data.profit >= 0 ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        {data.profit >= 0 ? '+' : ''}{data.profit.toFixed(2)} ج.م
                      </td>
                      <td className="py-3 px-4 text-center">
                        {data.profit > 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <TrendingUp className="w-3 h-3" />
                            ربح
                          </span>
                        ) : data.profit < 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            <TrendingDown className="w-3 h-3" />
                            خسارة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            متعادل
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr className="font-bold">
                    <td className="py-3 px-4 text-gray-900">الإجمالي</td>
                    <td className="py-3 px-4 text-green-600">{totalRevenue.toFixed(2)} ج.م</td>
                    <td className="py-3 px-4 text-red-600">{totalExpenses.toFixed(2)} ج.م</td>
                    <td className={`py-3 px-4 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} ج.م
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">تحليل الأداء</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">نسبة الربح</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">هامش الربح:</span>
                    <span className="font-bold text-gray-900">
                      {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${netProfit >= 0 ? 'bg-blue-600' : 'bg-orange-600'}`}
                      style={{ width: `${totalRevenue > 0 ? Math.abs((netProfit / totalRevenue) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-3">متوسط شهري</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">الإيرادات:</span>
                    <span className="font-medium text-green-600">{(totalRevenue / 12).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">التكاليف:</span>
                    <span className="font-medium text-red-600">{(totalExpenses / 12).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">الربح:</span>
                    <span className={`font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {(netProfit / 12).toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* إضافة ملخص سريع */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <span className="block text-green-800 font-bold mb-1">أفضل شهر</span>
              <span className="text-gray-900">
                {monthlyData.reduce((best, current) => 
                  current.profit > best.profit ? current : best
                , monthlyData[0])?.month || '-'}
              </span>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <span className="block text-blue-800 font-bold mb-1">الأشهر الرابحة</span>
              <span className="text-gray-900">
                {monthlyData.filter(m => m.profit > 0).length} شهر
              </span>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <span className="block text-orange-800 font-bold mb-1">الأشهر الخاسرة</span>
              <span className="text-gray-900">
                {monthlyData.filter(m => m.profit < 0).length} شهر
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}