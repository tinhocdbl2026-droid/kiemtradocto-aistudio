import React, { useState, useMemo } from 'react';
import { 
  History, Search, Download, Trash2, Printer, Eye, Play, Volume2, 
  CheckCircle2, AlertCircle, AlertTriangle, X, Filter, FileSpreadsheet, Clock 
} from 'lucide-react';
import { TestResult, AuditLog } from '../types';
import { dbService } from '../utils/db';

interface ResultsHistoryProps {
  results: TestResult[];
  onDeleteResult: (id: string) => Promise<void>;
  onOpenPrintPreview: (result: TestResult) => void;
  onRefreshResults: () => Promise<void>;
}

export const ResultsHistory: React.FC<ResultsHistoryProps> = ({
  results,
  onDeleteResult,
  onOpenPrintPreview,
  onRefreshResults,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending'>('all');

  // Modal xem chi tiết
  const [viewingResult, setViewingResult] = useState<TestResult | null>(null);
  const [viewingAudioUrl, setViewingAudioUrl] = useState<string | null>(null);
  const [viewingAuditLogs, setViewingAuditLogs] = useState<AuditLog[]>([]);

  // Modal xác nhận xóa
  const [deleteConfirmResult, setDeleteConfirmResult] = useState<TestResult | null>(null);

  // Danh sách các lớp trong kết quả
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.studentSnapshot.className) set.add(r.studentSnapshot.className);
    });
    return Array.from(set).sort();
  }, [results]);

  // Lọc kết quả
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const matchSearch =
        r.studentSnapshot.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.studentSnapshot.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.passageSnapshot.title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchGrade = selectedGrade === 'all' || r.studentSnapshot.grade === selectedGrade;
      const matchClass = selectedClass === 'all' || r.studentSnapshot.className === selectedClass;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'confirmed' && r.status === 'confirmed_by_teacher') ||
        (statusFilter === 'pending' && r.status === 'suggested_pending_review');

      return matchSearch && matchGrade && matchClass && matchStatus;
    }).sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());
  }, [results, searchTerm, selectedGrade, selectedClass, statusFilter]);

  // Xem chi tiết một kết quả
  const handleOpenDetail = async (result: TestResult) => {
    setViewingResult(result);
    setViewingAudioUrl(null);

    // Tải nhật ký audit
    try {
      const logs = await dbService.getAuditLogs(result.id);
      setViewingAuditLogs(logs);
    } catch {
      setViewingAuditLogs([]);
    }

    // Tải audio blob nếu có lưu
    if (result.hasAudioStored) {
      try {
        const blob = await dbService.getAudioBlob(result.id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setViewingAudioUrl(url);
        }
      } catch (err) {
        console.warn('Không thể tải audio blob:', err);
      }
    }
  };

  const handleCloseDetail = () => {
    if (viewingAudioUrl) {
      URL.revokeObjectURL(viewingAudioUrl);
    }
    setViewingResult(null);
    setViewingAudioUrl(null);
    setViewingAuditLogs([]);
  };

  // Xác nhận xóa
  const handleConfirmDelete = async () => {
    if (!deleteConfirmResult) return;
    await onDeleteResult(deleteConfirmResult.id);
    setDeleteConfirmResult(null);
    if (viewingResult?.id === deleteConfirmResult.id) {
      handleCloseDetail();
    }
  };

  // Xuất file CSV chuẩn UTF-8 BOM và chống Formula Injection
  const handleExportCSV = () => {
    const headers = [
      'STT',
      'Mã học sinh',
      'Họ và tên',
      'Khối',
      'Lớp',
      'Năm học',
      'Bài đọc',
      'Ngày kiểm tra',
      'Thời gian đọc (giây)',
      'Tổng âm tiết',
      'Số âm tiết đúng',
      'Số lỗi đọc sai',
      'Số lỗi bỏ sót',
      'Số lỗi thêm/lặp',
      'Tốc độ đọc đúng (tiếng/phút)',
      'Điểm máy đề xuất',
      'Điểm giáo viên xác nhận',
      'Trạng thái phê duyệt',
      'Giáo viên kiểm tra',
      'Nhận xét sư phạm',
    ];

    const rows = filteredResults.map((r, idx) => [
      idx + 1,
      r.studentSnapshot.code,
      r.studentSnapshot.fullName,
      r.studentSnapshot.grade,
      r.studentSnapshot.className,
      r.studentSnapshot.schoolYear,
      r.passageSnapshot.title,
      new Date(r.testDate).toLocaleString('vi-VN'),
      r.actualDurationSeconds,
      r.metrics.totalPassageTokens,
      r.metrics.matchCount,
      r.metrics.substitutionCount,
      r.metrics.deletionCount,
      r.metrics.insertionCount + r.metrics.repetitionCount,
      r.metrics.accuracySpeedWpm,
      r.suggestedScore,
      r.confirmedScore,
      r.status === 'confirmed_by_teacher' ? 'Đã duyệt' : 'Chờ kiểm tra',
      r.confirmedByTeacherName,
      r.teacherFeedback,
    ]);

    const csvContent = dbService.generateCSV(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ket_Qua_Kiem_Tra_Doc_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Lịch sử & Kết quả Kiểm tra Đọc
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tổng số: <strong className="text-blue-700">{results.length}</strong> bài kiểm tra · Lưu trữ an toàn trên thiết bị
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredResults.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Xuất báo cáo CSV (Excel)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh, mã HS, bài đọc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
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

        <div>
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

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full py-2 px-3 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="confirmed">Đã giáo viên xác nhận</option>
            <option value="pending">Chờ kiểm tra đối soát</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredResults.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">Chưa có kết quả kiểm tra nào</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Các bài kiểm tra đọc đã thực hiện sẽ được lưu trữ tại đây để xem lại, đối soát và in phiếu kết quả A4.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Ngày giờ</th>
                  <th className="py-3 px-4">Học sinh</th>
                  <th className="py-3 px-4 text-center">Lớp</th>
                  <th className="py-3 px-4">Bài đọc</th>
                  <th className="py-3 px-4 text-center">Thời gian</th>
                  <th className="py-3 px-4 text-center">Tốc độ đúng</th>
                  <th className="py-3 px-4 text-center">Điểm số</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((res) => (
                  <tr key={res.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(res.testDate).toLocaleDateString('vi-VN')}
                      <span className="block text-[10px] text-slate-400">
                        {new Date(res.testDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {res.studentSnapshot.fullName}
                      <span className="block text-[11px] font-mono font-normal text-slate-400">
                        {res.studentSnapshot.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-xs">
                        {res.studentSnapshot.className}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {res.passageSnapshot.title}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {res.actualDurationSeconds > 0 ? `${res.actualDurationSeconds.toFixed(1)}s` : <span className="text-[11px] text-slate-400 italic">Chưa xác định</span>}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-blue-800">
                      {res.metrics.isSpeedValid && res.actualDurationSeconds > 0 ? (
                        <>
                          {res.metrics.accuracySpeedWpm} <span className="text-[10px] font-normal text-slate-400">t/p</span>
                        </>
                      ) : (
                        <span className="text-[11px] font-normal text-slate-400 italic">Chưa xác định</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {res.status === 'confirmed_by_teacher' && typeof res.confirmedScore === 'number' ? (
                        <>
                          <span className="font-bold text-slate-900 text-sm">
                            {res.confirmedScore.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 block"> / {res.rubricSnapshot?.maxTotalScore ?? 10}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-amber-800 text-xs">
                            {res.suggestedScore !== undefined ? `${res.suggestedScore.toFixed(2)} (Đề xuất)` : 'Chưa chấm'}
                          </span>
                          <span className="text-[10px] text-amber-600 block">Chưa xác nhận</span>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {res.status === 'confirmed_by_teacher' ? (
                        <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                          ✓ Đã duyệt
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 whitespace-nowrap">
                          Chưa xác nhận
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetail(res)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Xem chi tiết kết quả"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenPrintPreview(res)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="In phiếu A4"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmResult(res)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Xóa bài kiểm tra"
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

      {/* Modal Xem chi tiết bài kiểm tra */}
      {viewingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">
                  Chi tiết Phiếu Kiểm tra: {viewingResult.studentSnapshot.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  Lớp {viewingResult.studentSnapshot.className} · {new Date(viewingResult.testDate).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                onClick={handleCloseDetail}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs md:text-sm">
              {/* Thẻ âm thanh nếu có */}
              {viewingAudioUrl && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    Bản ghi âm đã lưu:
                  </span>
                  <audio controls src={viewingAudioUrl} className="h-8 max-w-sm w-full" />
                </div>
              )}

              {/* Thông số định lượng */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 block">Thời gian thực:</span>
                  <strong className="text-base text-slate-900 font-mono">
                    {viewingResult.actualDurationSeconds > 0
                      ? `${viewingResult.actualDurationSeconds.toFixed(1)}s`
                      : 'Chưa xác định'}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Tốc độ đúng:</span>
                  <strong className="text-base text-blue-700 font-mono">
                    {viewingResult.metrics.isSpeedValid && viewingResult.actualDurationSeconds > 0
                      ? `${viewingResult.metrics.accuracySpeedWpm} t/p`
                      : 'Chưa xác định'}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Đúng / Tổng số:</span>
                  <strong className="text-base text-emerald-700 font-mono">
                    {viewingResult.metrics.matchCount} / {viewingResult.metrics.totalPassageTokens}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">
                    {viewingResult.status === 'confirmed_by_teacher' ? 'Điểm chính thức:' : 'Điểm đề xuất:'}
                  </span>
                  <strong className="text-base text-slate-900 font-mono">
                    {viewingResult.status === 'confirmed_by_teacher' && typeof viewingResult.confirmedScore === 'number'
                      ? `${viewingResult.confirmedScore.toFixed(2)} / ${viewingResult.rubricSnapshot?.maxTotalScore ?? 10}`
                      : `${viewingResult.suggestedScore?.toFixed(2) ?? 'Chưa chấm'} (Chưa xác nhận)`}
                  </strong>
                </div>
              </div>

              {/* Căn chỉnh âm tiết */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Bài đọc và Căn chỉnh âm tiết:
                </h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 leading-loose flex flex-wrap gap-2 text-sm [font-family:Arial,'Segoe_UI',Tahoma,sans-serif]">
                  {viewingResult.alignmentTokens.map((t) => {
                    let badge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    let sym = '✓';
                    if (t.type === 'substitution') {
                      badge = 'bg-red-50 text-red-800 border-red-200';
                      sym = '×';
                    } else if (t.type === 'deletion') {
                      badge = 'bg-amber-50 text-amber-800 border-amber-200 line-through';
                      sym = '−';
                    } else if (t.type === 'insertion') {
                      badge = 'bg-purple-50 text-purple-800 border-purple-200';
                      sym = '+';
                    } else if (t.type === 'repetition') {
                      badge = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                      sym = '⟳';
                    }
                    return (
                      <span key={t.id} className={`px-2 py-0.5 rounded border text-xs font-sans inline-flex items-center gap-1 ${badge}`}>
                        <span className="font-bold opacity-75">{sym}</span>
                        <span className="[font-variant-ligatures:none]">{(t.originalToken || t.spokenToken)?.normalize('NFC')}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Nhận xét giáo viên */}
              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                <span className="text-xs font-semibold text-blue-900 block mb-1">
                  Nhận xét của Giáo viên ({viewingResult.confirmedByTeacherName}):
                </span>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{viewingResult.teacherFeedback}"
                </p>
              </div>

              {/* Nhật ký Audit Trail nếu có */}
              {viewingAuditLogs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Nhật ký Kiểm toán / Chỉnh sửa của Giáo viên ({viewingAuditLogs.length}):
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                    {viewingAuditLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-slate-50/70 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <strong className="text-slate-800">{log.action}</strong>
                          <span className="font-mono text-[10px]">{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                        </div>
                        {(log.beforeValue !== undefined || log.afterValue !== undefined) && (
                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded border border-slate-200 font-mono text-slate-700">
                            <div>
                              <span className="text-slate-400 text-[10px] block font-sans">Giá trị trước:</span>
                              <span className="text-amber-800 line-through">{log.beforeValue || '(Trống)'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block font-sans">Giá trị sau:</span>
                              <span className="text-emerald-800 font-semibold">{log.afterValue || '(Trống)'}</span>
                            </div>
                          </div>
                        )}
                        <p className="text-slate-600 text-[11px]">
                          <strong className="text-slate-700">Lý do:</strong> {log.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => onOpenPrintPreview(viewingResult)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
              >
                <Printer className="w-4 h-4" />
                In Phiếu A4
              </button>

              <button
                type="button"
                onClick={handleCloseDetail}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận xóa kết quả */}
      {deleteConfirmResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Xác nhận xóa bài kiểm tra</h3>
                <p className="text-xs text-slate-500">Thao tác này sẽ xóa kết quả và bản ghi âm liên quan.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700">
              <p>Học sinh: <strong className="text-slate-900">{deleteConfirmResult.studentSnapshot.fullName}</strong></p>
              <p>Bài đọc: {deleteConfirmResult.passageSnapshot.title}</p>
              <p className="text-slate-500 mt-1">Ngày thi: {new Date(deleteConfirmResult.testDate).toLocaleDateString('vi-VN')}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmResult(null)}
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
    </div>
  );
};

// Cập nhật theo phiếu giáo viên ngày 13/10/2026.
