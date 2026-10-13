import React, { useState } from 'react';
import { 
  Database, Download, Upload, ShieldCheck, AlertCircle, CheckCircle2, 
  Trash2, HardDrive, Info, Clock, AlertTriangle, X 
} from 'lucide-react';
import { AppSettings } from '../types';
import { dbService } from '../utils/db';

interface BackupManagerProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => Promise<void>;
  onRefreshAllData: () => Promise<void>;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAllData,
}) => {
  const [currentSettings, setCurrentSettings] = useState<AppSettings>({ ...settings });
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null);

  // Trạng thái xuất file
  const [isExporting, setIsExporting] = useState(false);

  // Trạng thái nhập file & preview modal
  const [importJsonText, setImportJsonText] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [restoreStatusMsg, setRestoreStatusMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);

  // Dọn dẹp âm thanh cũ
  const [cleaningStatus, setCleaningStatus] = useState<string | null>(null);

  // Lưu cài đặt
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings(currentSettings);
    setSettingsSaveMsg('Đã lưu cấu hình ứng dụng thành công!');
    setTimeout(() => setSettingsSaveMsg(null), 3000);
  };

  // Xuất file sao lưu JSON
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const jsonContent = await dbService.exportBackupJSON();
      const dateStr = new Date().toISOString().slice(0, 10);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sao_Luu_Kiem_Tra_Doc_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Lỗi xuất bản sao lưu: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Đọc file sao lưu JSON tải lên
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreErrorMsg(null);
    setRestoreStatusMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      setImportJsonText(text);

      const check = dbService.validateBackupJSON(text);
      if (!check.isValid) {
        setRestoreErrorMsg(check.error || 'Tệp không hợp lệ.');
        setValidationResult(null);
      } else {
        setValidationResult(check);
        setIsRestoreModalOpen(true);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Thực hiện khôi phục
  const handleExecuteRestore = async () => {
    if (!validationResult?.parsedData) return;
    try {
      await dbService.restoreBackup(validationResult.parsedData, restoreMode);
      await onRefreshAllData();
      setRestoreStatusMsg(
        restoreMode === 'overwrite'
          ? 'Đã khôi phục và ghi đè toàn bộ dữ liệu thành công!'
          : 'Đã gộp dữ liệu sao lưu vào cơ sở dữ liệu hiện tại thành công!'
      );
      setTimeout(() => {
        setIsRestoreModalOpen(false);
        setValidationResult(null);
        setRestoreStatusMsg(null);
      }, 1500);
    } catch (err: any) {
      setRestoreErrorMsg('Lỗi khôi phục: ' + err.message);
    }
  };

  // Dọn dẹp âm thanh cũ
  const handleCleanAudio = async () => {
    try {
      const count = await dbService.cleanOldAudioBlobs(currentSettings.audioRetentionDays);
      setCleaningStatus(`Đã giải phóng ${count} tệp âm thanh cũ hơn thời hạn quy định.`);
      setTimeout(() => setCleaningStatus(null), 3000);
    } catch (err: any) {
      alert('Lỗi dọn dẹp âm thanh: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Sao lưu Dữ liệu & Quản lý Bộ nhớ Cục bộ
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Bảo vệ dữ liệu học tập của học sinh · Hoàn toàn độc lập trên thiết bị của giáo viên
        </p>

        {/* Thông báo minh bạch về lưu trữ */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-950">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            Minh bạch về Lưu trữ & Bảo mật Thông tin:
          </div>
          <p className="leading-relaxed">
            Toàn bộ danh sách học sinh, bài đọc, kết quả kiểm tra và bản ghi âm được <strong>lưu trữ trực tiếp và bền vững trong bộ nhớ IndexedDB của trình duyệt trên thiết bị này</strong>.
          </p>
          <p className="leading-relaxed text-blue-800">
            <strong>Lưu ý về giọng nói:</strong> Tính năng nhận dạng trực tuyến Web Speech API của Chrome có thể gửi dữ liệu âm thanh tới máy chủ của Google/trình duyệt để xử lý nhận diện tiếng Việt (vì vậy ứng dụng <strong>mặc định TẮT</strong> tính năng này và yêu cầu giáo viên chủ động đồng ý trước khi bật). Thầy cô có thể sử dụng hoàn toàn chế độ ghi âm cục bộ và chép lời thủ công để đảm bảo 100% dữ liệu không rời khỏi máy tính. Không yêu cầu khóa API hay phí dịch vụ.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phần 1: Xuất & Khôi phục sao lưu */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              Sao lưu & Khôi phục Dữ liệu
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tải toàn bộ cơ sở dữ liệu (học sinh, bài đọc, kết quả, tiêu chí) về máy tính dưới dạng tệp tin JSON tiêu chuẩn.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <span className="font-semibold text-slate-800 block">Thao tác an toàn:</span>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                <li>Tệp JSON đã được kiểm tra tính hợp lệ trước khi áp dụng.</li>
                <li>Có tính năng xem trước số lượng bản ghi để chống ghi đè nhầm.</li>
                <li>Tùy chọn gộp thêm hoặc thay thế hoàn toàn.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Đang đóng gói dữ liệu...' : 'Tải tệp Sao lưu về máy (.JSON)'}
            </button>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khôi phục từ tệp sao lưu (.JSON):
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {restoreErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{restoreErrorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Phần 2: Cài đặt lưu trữ Âm thanh & Thông tin trường */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Chính sách Lưu trữ Âm thanh & Đơn vị
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs md:text-sm">
            {settingsSaveMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{settingsSaveMsg}</span>
              </div>
            )}

            {/* Bật/Tắt lưu âm thanh */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentSettings.allowAudioPersistence}
                  onChange={(e) => setCurrentSettings({ ...currentSettings, allowAudioPersistence: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">
                    Cho phép lưu trữ file âm thanh vào bộ nhớ máy
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Mặc định tắt (chỉ nghe lại trong phiên kiểm tra). Nếu bật, các bản thu âm sẽ được lưu vào IndexedDB để nghe lại trong Lịch sử.
                  </span>
                </div>
              </label>
            </div>

            {/* Thời hạn lưu âm thanh */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thời hạn tự động dọn dẹp âm thanh:
              </label>
              <select
                value={currentSettings.audioRetentionDays}
                onChange={(e) => setCurrentSettings({ ...currentSettings, audioRetentionDays: Number(e.target.value) })}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value={7}>Tự động xóa sau 7 ngày</option>
                <option value={30}>Tự động xóa sau 30 ngày (Khuyến nghị)</option>
                <option value={90}>Tự động xóa sau 90 ngày</option>
                <option value={0}>Lưu vĩnh viễn (Cho đến khi giáo viên chủ động xóa)</option>
              </select>
            </div>

            {/* Tên Giáo viên & Trường */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giáo viên:</label>
                <input
                  type="text"
                  value={currentSettings.teacherName}
                  onChange={(e) => setCurrentSettings({ ...currentSettings, teacherName: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trường:</label>
                <input
                  type="text"
                  value={currentSettings.schoolName}
                  onChange={(e) => setCurrentSettings({ ...currentSettings, schoolName: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleCleanAudio}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                title="Dọn dẹp các bản thu âm quá hạn ngay bây giờ"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Dọn âm thanh cũ ngay
              </button>

              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
              >
                Lưu cấu hình
              </button>
            </div>

            {cleaningStatus && (
              <p className="text-xs text-emerald-700 font-medium mt-1">{cleaningStatus}</p>
            )}
          </form>
        </div>
      </div>

      {/* Modal Xem trước và Xác nhận Khôi phục JSON */}
      {isRestoreModalOpen && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                Kiểm tra Bản sao lưu trước khi Khôi phục
              </h3>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-blue-900">Chi tiết nội dung tệp sao lưu:</p>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>Học sinh: <strong>{validationResult.preview?.studentsCount}</strong></div>
                <div>Bài đọc: <strong>{validationResult.preview?.passagesCount}</strong></div>
                <div>Kết quả thi: <strong>{validationResult.preview?.testResultsCount}</strong></div>
                <div>Tiêu chí khối: <strong>{validationResult.preview?.rubricsCount}</strong></div>
                <div className="col-span-2">Nhật ký sửa (Audit): <strong>{validationResult.preview?.auditLogsCount ?? 0}</strong></div>
              </div>
              {validationResult.preview?.exportedAt && (
                <p className="text-[11px] text-slate-500 pt-1 border-t border-blue-200/50">
                  Thời điểm xuất file: {new Date(validationResult.preview.exportedAt).toLocaleString('vi-VN')}
                </p>
              )}
            </div>

            {/* Chọn chế độ khôi phục */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-800">Chọn phương thức khôi phục:</label>
              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">Gộp thêm dữ liệu (Khuyến nghị)</span>
                    <span className="text-slate-500 text-[11px]">
                      Giữ nguyên dữ liệu hiện có và thêm các học sinh/bài đọc mới vào hệ thống.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2.5 bg-red-50/50 rounded-lg border border-red-200 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'overwrite'}
                    onChange={() => setRestoreMode('overwrite')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-red-900 block">Ghi đè hoàn toàn</span>
                    <span className="text-red-700 text-[11px]">
                      Xóa toàn bộ dữ liệu hiện tại và thay thế bằng bản sao lưu này. Hãy cẩn thận!
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {restoreStatusMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{restoreStatusMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
