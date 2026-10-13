import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Filter, Upload, Download, Trash2, Edit3, 
  AlertCircle, CheckCircle2, X, FileSpreadsheet, AlertTriangle 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../types';

interface StudentManagerProps {
  students: Student[];
  onAddStudent: (student: Student) => Promise<void>;
  onUpdateStudent: (student: Student) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    fullName: '',
    className: '',
    grade: 1,
    schoolYear: '2025-2026',
    orderNumber: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importColumnMapping, setImportColumnMapping] = useState({
    code: '',
    fullName: '',
    className: '',
    grade: '',
    orderNumber: '',
    schoolYear: '',
  });
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update'>('skip');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.schoolYear) set.add(s.schoolYear);
    });
    if (set.size === 0) set.add('2025-2026');
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGrade = selectedGrade === 'all' || s.grade === selectedGrade;
      const matchClass = selectedClass === 'all' || s.className === selectedClass;
      const matchYear = selectedYear === 'all' || s.schoolYear === selectedYear;
      return matchSearch && matchGrade && matchClass && matchYear;
    }).sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      if (a.className !== b.className) return a.className.localeCompare(b.className);
      return (a.orderNumber || 0) - (b.orderNumber || 0);
    });
  }, [students, searchTerm, selectedGrade, selectedClass, selectedYear]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      code: `HS${String(students.length + 1).padStart(3, '0')}`,
      fullName: '',
      className: '1A',
      grade: 1,
      schoolYear: '2025-2026',
      orderNumber: String(students.length + 1),
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      code: student.code,
      fullName: student.fullName,
      className: student.className,
      grade: student.grade,
      schoolYear: student.schoolYear,
      orderNumber: student.orderNumber ? String(student.orderNumber) : '',
      notes: student.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formData.fullName.trim();
    const trimmedCode = formData.code.trim();

    if (!trimmedName) {
      setFormError('Vui lòng nhập họ và tên học sinh.');
      return;
    }
    if (!trimmedCode) {
      setFormError('Vui lòng nhập mã học sinh.');
      return;
    }

    const isCodeDuplicate = students.some(
      (s) => s.code.toLowerCase() === trimmedCode.toLowerCase() && s.id !== editingStudent?.id
    );
    if (isCodeDuplicate) {
      setFormError(`Mã học sinh "${trimmedCode}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`);
      return;
    }

    const payload: Student = {
      id: editingStudent ? editingStudent.id : `student_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      code: trimmedCode,
      fullName: trimmedName,
      className: formData.className.trim(),
      grade: Number(formData.grade),
      schoolYear: formData.schoolYear.trim(),
      orderNumber: formData.orderNumber ? Number(formData.orderNumber) : undefined,
      notes: formData.notes.trim(),
      createdAt: editingStudent ? editingStudent.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    if (editingStudent) {
      await onUpdateStudent(payload);
    } else {
      await onAddStudent(payload);
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmStudent) return;
    await onDeleteStudent(deleteConfirmStudent.id);
    setDeleteConfirmStudent(null);
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'STT': 1,
        'Mã học sinh': 'HS0101',
        'Họ và tên': 'Nguyễn Văn An',
        'Lớp': '1A',
        'Khối': 1,
        'Năm học': '2025-2026',
        'Ghi chú': 'Học sinh mới',
      },
      {
        'STT': 2,
        'Mã học sinh': 'HS0102',
        'Họ và tên': 'Trần Thị Mai',
        'Lớp': '1A',
        'Khối': 1,
        'Năm học': '2025-2026',
        'Ghi chú': '',
      },
      {
        'STT': 3,
        'Mã học sinh': 'HS0201',
        'Họ và tên': 'Lê Hoàng Long',
        'Lớp': '2B',
        'Khối': 2,
        'Năm học': '2025-2026',
        'Ghi chú': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Mau');
    XLSX.writeFile(wb, 'Mau_Nhap_Hoc_Sinh_Tieu_Hoc.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length < 2) {
          setImportError('Tệp không có dữ liệu hoặc chỉ có dòng tiêu đề.');
          return;
        }

        const headers: string[] = (rawJson[0] as string[]).map((h) => String(h || '').trim());
        setDetectedHeaders(headers);

        const rows: any[] = [];
        for (let i = 1; i < rawJson.length; i++) {
          const rowData = rawJson[i];
          if (!rowData || rowData.length === 0) continue;
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = rowData[idx] !== undefined ? String(rowData[idx]).trim() : '';
          });
          if (Object.values(rowObj).some((val) => Boolean(val))) {
            rows.push(rowObj);
          }
        }

        setImportRows(rows);

        const findHeader = (keywords: string[]) => {
          return headers.find((h) => {
            const lower = h.toLowerCase();
            return keywords.some((k) => lower.includes(k));
          }) || '';
        };

        setImportColumnMapping({
          code: findHeader(['mã', 'ma hs', 'code', 'số hiệu']),
          fullName: findHeader(['họ và tên', 'họ tên', 'hoten', 'tên', 'name']),
          className: findHeader(['lớp', 'lop', 'class']),
          grade: findHeader(['khối', 'khoi', 'grade']),
          orderNumber: findHeader(['stt', 'thứ tự', 'order']),
          schoolYear: findHeader(['năm học', 'nam hoc', 'niên khóa', 'year']),
        });
      } catch (err: any) {
        setImportError('Lỗi đọc tệp Excel/CSV: ' + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = async () => {
    if (!importColumnMapping.fullName) {
      setImportError('Bắt buộc phải ánh xạ cột "Họ và tên".');
      return;
    }

    try {
      let addedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < importRows.length; i++) {
        const row = importRows[i];
        const rawName = row[importColumnMapping.fullName] || '';
        if (!rawName.trim()) {
          skippedCount++;
          continue;
        }

        const rawCode = (importColumnMapping.code ? row[importColumnMapping.code] : '') || `HS${Date.now()}_${i}`;
        const rawClass = (importColumnMapping.className ? row[importColumnMapping.className] : '') || '1A';
        const rawGrade = Number(importColumnMapping.grade ? row[importColumnMapping.grade] : '') || 1;
        const rawOrder = Number(importColumnMapping.orderNumber ? row[importColumnMapping.orderNumber] : '') || (i + 1);
        const rawYear = (importColumnMapping.schoolYear ? row[importColumnMapping.schoolYear] : '') || '2025-2026';

        const existingIndex = students.findIndex(
          (s) => s.code.toLowerCase() === rawCode.toLowerCase() ||
                 (s.fullName.toLowerCase() === rawName.toLowerCase() && s.className.toLowerCase() === rawClass.toLowerCase())
        );

        if (existingIndex >= 0) {
          if (duplicateMode === 'skip') {
            skippedCount++;
            continue;
          } else {
            const old = students[existingIndex];
            await onUpdateStudent({
              ...old,
              fullName: rawName,
              className: rawClass,
              grade: rawGrade,
              orderNumber: rawOrder,
              schoolYear: rawYear,
              updatedAt: Date.now(),
            });
            updatedCount++;
          }
        } else {
          await onAddStudent({
            id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            code: rawCode,
            fullName: rawName,
            className: rawClass,
            grade: rawGrade,
            orderNumber: rawOrder,
            schoolYear: rawYear,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          addedCount++;
        }
      }

      setImportSuccess(`Nhập thành công: Thêm mới ${addedCount} học sinh, Cập nhật ${updatedCount}, Bỏ qua ${skippedCount}.`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportRows([]);
        setImportSuccess(null);
      }, 1500);
    } catch (err: any) {
      setImportError('Lỗi trong quá trình lưu học sinh: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Hồ sơ & Danh sách Học sinh
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tổng số: <strong className="text-blue-700">{students.length}</strong> học sinh trong hệ thống · Lưu trữ cục bộ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Tải file Excel mẫu để nhập liệu"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Excel mẫu
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Nhập XLSX / CSV
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            Thêm học sinh mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo họ tên hoặc mã học sinh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Khối:</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full py-2 px-3 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">Tất cả khối</option>
            <option value={1}>Khối 1</option>
            <option value={2}>Khối 2</option>
            <option value={3}>Khối 3</option>
            <option value={4}>Khối 4</option>
            <option value={5}>Khối 5</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Lớp:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full py-2 px-3 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">Tất cả lớp</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>Lớp {cls}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">Chưa có học sinh nào phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Không tìm thấy hồ sơ học sinh theo điều kiện lọc hiện tại. Thầy cô có thể thêm học sinh mới hoặc nhập danh sách lớp từ file Excel/CSV.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                + Thêm học sinh
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
              >
                Nhập từ Excel
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4 w-28">Mã HS</th>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4 w-24 text-center">Khối</th>
                  <th className="py-3 px-4 w-24 text-center">Lớp</th>
                  <th className="py-3 px-4 w-32">Năm học</th>
                  <th className="py-3 px-4 text-right w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                      {student.orderNumber || idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {student.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {student.fullName}
                      {student.notes && (
                        <span className="block text-[11px] font-normal text-slate-400 truncate max-w-xs">
                          {student.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-medium text-slate-700">Khối {student.grade}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {student.className}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {student.schoolYear}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmStudent(student)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Xóa học sinh"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                {editingStudent ? 'Chỉnh sửa thông tin học sinh' : 'Thêm học sinh mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã học sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: HS0101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số thứ tự trong lớp (STT)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="vd: 1"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập đầy đủ họ và tên có dấu"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Khối</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value={1}>Khối 1</option>
                    <option value={2}>Khối 2</option>
                    <option value={3}>Khối 3</option>
                    <option value={4}>Khối 4</option>
                    <option value={5}>Khối 5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: 1A, 2B"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Năm học</label>
                <input
                  type="text"
                  placeholder="vd: 2025-2026"
                  value={formData.schoolYear}
                  onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú thêm</label>
                <input
                  type="text"
                  placeholder="Ghi chú đặc điểm phát âm, lưu ý..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                >
                  {editingStudent ? 'Lưu thay đổi' : 'Thêm học sinh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Xác nhận xóa học sinh</h3>
                <p className="text-xs text-slate-500">Thao tác này sẽ xóa hồ sơ khỏi bộ nhớ máy.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1">
              <p>Họ và tên: <strong className="text-slate-900">{deleteConfirmStudent.fullName}</strong></p>
              <p>Mã HS: <span className="font-mono">{deleteConfirmStudent.code}</span> · Lớp: <strong>{deleteConfirmStudent.className}</strong></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmStudent(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-sm"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Nhập danh sách học sinh từ file Excel (.xlsx, .xls) hoặc CSV
              </h3>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportRows([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs md:text-sm">
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn tệp Excel hoặc CSV trên máy tính của bạn:
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {importRows.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-900 font-medium">
                      Đã đọc được: <strong className="text-blue-700">{importRows.length}</strong> dòng dữ liệu. Vui lòng kiểm tra đối soát cột:
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Cột Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={importColumnMapping.fullName}
                        onChange={(e) => setImportColumnMapping({ ...importColumnMapping, fullName: e.target.value })}
                        className="w-full p-2 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">-- Chọn cột --</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cột Mã HS</label>
                      <select
                        value={importColumnMapping.code}
                        onChange={(e) => setImportColumnMapping({ ...importColumnMapping, code: e.target.value })}
                        className="w-full p-2 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">-- Tự động sinh mã --</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cột Lớp</label>
                      <select
                        value={importColumnMapping.className}
                        onChange={(e) => setImportColumnMapping({ ...importColumnMapping, className: e.target.value })}
                        className="w-full p-2 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">-- Mặc định 1A --</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cột Khối</label>
                      <select
                        value={importColumnMapping.grade}
                        onChange={(e) => setImportColumnMapping({ ...importColumnMapping, grade: e.target.value })}
                        className="w-full p-2 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">-- Tự suy từ lớp --</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cột STT</label>
                      <select
                        value={importColumnMapping.orderNumber}
                        onChange={(e) => setImportColumnMapping({ ...importColumnMapping, orderNumber: e.target.value })}
                        className="w-full p-2 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">-- Tự đánh số --</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cột Năm học</label>
                      <select
                        value={importColumnMapping.schoolYear}
                        onChange={(e) => setImportColumnMapping({ ...importColumnMapping, schoolYear: e.target.value })}
                        className="w-full p-2 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">-- 2025-2026 --</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">Xử lý khi phát hiện học sinh đã tồn tại:</label>
                    <div className="flex items-center gap-4 text-xs text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateMode"
                          checked={duplicateMode === 'skip'}
                          onChange={() => setDuplicateMode('skip')}
                        />
                        <span>Bỏ qua (Giữ nguyên bản ghi cũ)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateMode"
                          checked={duplicateMode === 'update'}
                          onChange={() => setDuplicateMode('update')}
                        />
                        <span>Cập nhật thông tin mới</span>
                      </label>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                      Xem trước 3 dòng đầu tiên trong tệp:
                    </div>
                    <div className="overflow-x-auto max-h-32 text-xs divide-y divide-slate-100">
                      {importRows.slice(0, 3).map((r, i) => (
                        <div key={i} className="p-2 flex gap-4 text-slate-600">
                          <span>Dòng {i + 1}:</span>
                          <span className="font-medium text-slate-900">
                            {importColumnMapping.fullName ? r[importColumnMapping.fullName] : 'Chưa chọn họ tên'}
                          </span>
                          <span>Lớp: {importColumnMapping.className ? r[importColumnMapping.className] : '—'}</span>
                          <span>Mã: {importColumnMapping.code ? r[importColumnMapping.code] : 'Tự sinh'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportRows([]);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Đóng
              </button>
              {importRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                >
                  Bắt đầu nhập vào danh sách
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
