import React, { useState, useMemo } from 'react';
import { 
  BookOpen, Plus, Copy, Trash2, Edit3, Search, Upload, FileText, 
  Image as ImageIcon, AlertCircle, CheckCircle2, X, AlertTriangle, Eye, HelpCircle, Loader2, Sparkles 
} from 'lucide-react';
import { Passage } from '../types';
import { countVietnameseSyllables } from '../utils/alignment';
import { readTxtFile, readDocxFile, readPdfFile, runTesseractOCR } from '../utils/documentParser';

interface PassageManagerProps {
  passages: Passage[];
  onAddPassage: (passage: Passage) => Promise<void>;
  onUpdatePassage: (passage: Passage) => Promise<void>;
  onDeletePassage: (id: string) => Promise<void>;
}

export const PassageManager: React.FC<PassageManagerProps> = ({
  passages,
  onAddPassage,
  onUpdatePassage,
  onDeletePassage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');

  // Modal thêm/sửa bài đọc
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    grade: 1,
    source: 'Bài minh họa do ứng dụng tạo',
    content: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Modal xác nhận xóa
  const [deleteConfirmPassage, setDeleteConfirmPassage] = useState<Passage | null>(null);

  // Modal trích xuất tài liệu (File TXT / DOCX / PDF / Ảnh)
  const [isImportFileModalOpen, setIsImportFileModalOpen] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [importWarningMessage, setImportWarningMessage] = useState<string | null>(null);
  const [extractedDraftContent, setExtractedDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftGrade, setDraftGrade] = useState(1);
  const [draftSource, setDraftSource] = useState('Bài minh họa do ứng dụng tạo');
  const [uploadedImagePreviewUrl, setUploadedImagePreviewUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // Trạng thái OCR bằng Tesseract.js
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');

  // Lọc bài đọc
  const filteredPassages = useMemo(() => {
    return passages.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.source.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGrade = selectedGrade === 'all' || p.grade === selectedGrade;
      return matchSearch && matchGrade;
    }).sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.title.localeCompare(b.title);
    });
  }, [passages, searchTerm, selectedGrade]);

  const liveSyllableCount = useMemo(() => {
    return countVietnameseSyllables(formData.content);
  }, [formData.content]);

  const draftSyllableCount = useMemo(() => {
    return countVietnameseSyllables(extractedDraftContent);
  }, [extractedDraftContent]);

  const handleOpenAdd = () => {
    setEditingPassage(null);
    setFormData({
      title: '',
      grade: 1,
      source: 'Bài minh họa do ứng dụng tạo',
      content: '',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (passage: Passage) => {
    setEditingPassage(passage);
    setFormData({
      title: passage.title,
      grade: passage.grade,
      source: passage.source,
      content: passage.content,
      notes: passage.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDuplicate = async (passage: Passage) => {
    const newPassage: Passage = {
      id: `passage_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: `${passage.title} (Bản sao)`,
      grade: passage.grade,
      source: passage.source,
      content: passage.content,
      syllableCount: passage.syllableCount,
      notes: passage.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await onAddPassage(newPassage);
  };

  const handleSavePassage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = formData.title.trim();
    const trimmedContent = formData.content.trim();

    if (!trimmedTitle) {
      setFormError('Vui lòng nhập tên bài đọc.');
      return;
    }
    if (!trimmedContent) {
      setFormError('Vui lòng nhập nội dung bài đọc.');
      return;
    }

    if (/^(Không thể tự động giải nén tệp DOCX|Lỗi xử lý tệp:|Lỗi khi đọc tệp DOCX:)/u.test(trimmedContent)) {
      setFormError('Đây là thông báo lỗi nhập tệp, không phải bài đọc. Hãy nhập lại văn bản gốc.');
      return;
    }
    const syllableCount = countVietnameseSyllables(trimmedContent);

    const payload: Passage = {
      id: editingPassage ? editingPassage.id : `passage_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: trimmedTitle,
      grade: Number(formData.grade),
      source: formData.source.trim() || 'Bài minh họa do ứng dụng tạo',
      content: trimmedContent,
      syllableCount,
      notes: formData.notes.trim(),
      createdAt: editingPassage ? editingPassage.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    if (editingPassage) {
      await onUpdatePassage(payload);
    } else {
      await onAddPassage(payload);
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmPassage) return;
    await onDeletePassage(deleteConfirmPassage.id);
    setDeleteConfirmPassage(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatusMessage(null);
    setImportWarningMessage(null);
    setExtractedDraftContent('');
    setUploadedImagePreviewUrl(null);
    setSelectedImageFile(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    const baseTitle = fileName.replace(/\.[^/.]+$/, '');
    setDraftTitle(baseTitle);

    try {
      if (lowerName.endsWith('.txt')) {
        const text = await readTxtFile(file);
        setExtractedDraftContent(text);
        setImportStatusMessage('Đã đọc nội dung tệp văn bản TXT thành công.');
      } else if (lowerName.endsWith('.docx')) {
        const text = await readDocxFile(file);
        setExtractedDraftContent(text);
        setImportStatusMessage('Đã trích xuất văn bản từ tệp DOCX.');
      } else if (lowerName.endsWith('.pdf')) {
        const result = await readPdfFile(file);
        if (result.isScanned) {
          setImportWarningMessage(
            'Cảnh báo: Đây là tệp PDF dạng scan ảnh (không có lớp văn bản số ký tự). Giáo viên vui lòng sao chép văn bản trực tiếp hoặc tải ảnh chụp trang sách để chạy OCR bằng Tesseract.'
          );
        } else {
          setExtractedDraftContent(result.text);
          setImportStatusMessage('Đã trích xuất lớp văn bản từ tệp PDF.');
        }
      } else if (/\.(png|jpe?g|webp|bmp)$/i.test(lowerName)) {
        // Tệp ảnh
        const previewUrl = URL.createObjectURL(file);
        setUploadedImagePreviewUrl(previewUrl);
        setSelectedImageFile(file);
        setImportStatusMessage(
          'Đã tải tệp ảnh. Thầy cô có thể bấm nút "Chạy Tesseract OCR trích xuất chữ" bên dưới để quét chữ tự động.'
        );
      } else {
        setImportWarningMessage('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .txt, .docx, .pdf hoặc ảnh (.png, .jpg).');
      }
    } catch (err: any) {
      setExtractedDraftContent('');
      setImportStatusMessage(null);
      setImportWarningMessage('Lỗi xử lý tệp: ' + err.message);
    }
  };

  // Kích hoạt OCR thật bằng Tesseract
  const handleTriggerTesseractOCR = async () => {
    if (!selectedImageFile) return;
    setIsOcrProcessing(true);
    setOcrProgress(0);
    setOcrStatusText('Đang khởi tạo Tesseract OCR cục bộ...');

    try {
      const extractedText = await runTesseractOCR(selectedImageFile, (progress, status) => {
        setOcrProgress(progress);
        setOcrStatusText(`Đang xử lý Tesseract: ${status} (${progress}%)`);
      });

      if (extractedText) {
        setExtractedDraftContent(extractedText);
        setImportStatusMessage('Tesseract OCR hoàn tất! Giáo viên vui lòng duyệt và chỉnh sửa kỹ dấu thanh tiếng Việt.');
      } else {
        setImportWarningMessage('Tesseract không tìm thấy văn bản rõ ràng trong ảnh này. Vui lòng đối chiếu hình ảnh và gõ trực tiếp.');
      }
    } catch (err: any) {
      setImportWarningMessage(`Lỗi Tesseract OCR: ${err.message}`);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleApplyImportedDraft = () => {
    if (!extractedDraftContent.trim()) {
      setImportWarningMessage('Chưa có nội dung bài đọc nào để lưu.');
      return;
    }

    setEditingPassage(null);
    setFormData({
      title: draftTitle || 'Bài đọc mới',
      grade: draftGrade,
      source: draftSource || 'Bài minh họa do ứng dụng tạo',
      content: extractedDraftContent.trim(),
      notes: '',
    });

    setIsImportFileModalOpen(false);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Thư viện Bài đọc Học sinh
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tổng số: <strong className="text-blue-700">{passages.length}</strong> bài đọc · Đếm đơn vị âm tiết chuẩn tiếng Việt
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setExtractedDraftContent('');
              setDraftTitle('');
              setImportStatusMessage(null);
              setImportWarningMessage(null);
              setUploadedImagePreviewUrl(null);
              setSelectedImageFile(null);
              setIsImportFileModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Nhập từ TXT / DOCX / PDF / Ảnh OCR
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Thêm bài đọc mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên bài đọc, nguồn hoặc nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Khối lớp:</label>
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
      </div>

      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-blue-900 font-medium">Quy chuẩn đếm âm tiết sư phạm:</strong>{' '}
          Đơn vị đếm là <em>âm tiết (tiếng)</em> được phân cách bởi khoảng trắng, không phải phân đoạn từ ghép hay từ phức ngữ pháp. Khi so sánh nhận diện, hệ thống loại bỏ dấu câu (chấm, phẩy...) nhưng giữ nguyên vẹn 100% dấu thanh và chữ gốc tiếng Việt.
        </div>
      </div>

      {filteredPassages.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">Chưa có bài đọc nào</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Thầy cô có thể thêm bài đọc mới bằng cách gõ trực tiếp hoặc tải lên tệp TXT, DOCX, ảnh bài đọc để quét OCR.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            + Thêm bài đọc đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPassages.map((passage) => (
            <div
              key={passage.id}
              className="bg-white rounded-xl border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-sm transition p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block mb-1">
                      Khối {passage.grade}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {passage.title}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono whitespace-nowrap bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    {passage.syllableCount} âm tiết
                  </span>
                </div>

                <p className="text-xs text-slate-500 italic mb-3">
                  Nguồn: {passage.source}
                </p>

                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-100 text-xs text-slate-700 [font-family:Arial,'Segoe_UI',Tahoma,sans-serif] leading-relaxed line-clamp-4 mb-3">
                  {passage.content.normalize('NFC')}
                </div>

                {passage.notes && (
                  <p className="text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded border border-amber-100 mb-3">
                    <strong>Lưu ý:</strong> {passage.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400">
                  Cập nhật: {new Date(passage.updatedAt).toLocaleDateString('vi-VN')}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(passage)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Sao chép bài đọc này"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(passage)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Chỉnh sửa bài đọc"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmPassage(passage)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                    title="Xóa bài đọc"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                {editingPassage ? 'Chỉnh sửa bài đọc' : 'Thêm bài đọc mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassage} className="p-5 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên bài đọc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Con chim chiền chiện"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Khối lớp</label>
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nguồn bài đọc
                </label>
                <input
                  type="text"
                  placeholder="vd: Bài minh họa do ứng dụng tạo"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Nội dung bài đọc <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-mono font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {liveSyllableCount} âm tiết (tiếng)
                  </span>
                </div>
                <textarea
                  rows={8}
                  required
                  placeholder="Nhập hoặc dán toàn bộ nội dung bài đọc bằng tiếng Việt có dấu đầy đủ..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-3 text-xs md:text-sm [font-family:Arial,'Segoe_UI',Tahoma,sans-serif] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú từ khó hoặc lưu ý sư phạm
                </label>
                <input
                  type="text"
                  placeholder="vd: Chú ý phát âm phụ âm tr/ch, dấu ngã..."
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
                  {editingPassage ? 'Lưu thay đổi' : 'Thêm bài đọc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmPassage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Xác nhận xóa bài đọc</h3>
                <p className="text-xs text-slate-500">Bài đọc sẽ bị gỡ khỏi thư viện kiểm tra.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700">
              <p className="font-bold text-slate-900">{deleteConfirmPassage.title}</p>
              <p className="text-slate-500 mt-1">Khối {deleteConfirmPassage.grade} · {deleteConfirmPassage.syllableCount} âm tiết</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmPassage(null)}
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

      {isImportFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Nhập bài đọc từ tệp TXT, DOCX, PDF hoặc Ảnh (Tesseract OCR cục bộ)
              </h3>
              <button
                onClick={() => setIsImportFileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs md:text-sm">
              {importStatusMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{importStatusMessage}</span>
                </div>
              )}

              {importWarningMessage && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{importWarningMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn tệp bài đọc (.txt, .docx, .pdf hoặc ảnh .png/.jpg):
                </label>
                <input
                  type="file"
                  accept=".txt,.docx,.pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {uploadedImagePreviewUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      Hình ảnh bài đọc đối chiếu:
                    </span>

                    <button
                      type="button"
                      onClick={handleTriggerTesseractOCR}
                      disabled={isOcrProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition"
                    >
                      {isOcrProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{ocrStatusText || 'Đang nhận dạng OCR...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Chạy Tesseract OCR trích xuất chữ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isOcrProcessing && (
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all duration-150"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="max-h-60 overflow-auto border border-slate-200 rounded-lg bg-white p-2">
                    <img
                      src={uploadedImagePreviewUrl}
                      alt="Xem trước bài đọc"
                      className="max-w-full h-auto mx-auto object-contain rounded"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 text-blue-900">
                    <Eye className="w-4 h-4 text-blue-600" />
                    Giáo viên duyệt và chỉnh sửa văn bản trước khi lưu:
                  </h4>
                  <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {draftSyllableCount} âm tiết
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tên bài đọc:</label>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="Nhập tên bài đọc..."
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Khối:</label>
                    <select
                      value={draftGrade}
                      onChange={(e) => setDraftGrade(Number(e.target.value))}
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                    >
                      <option value={1}>Khối 1</option>
                      <option value={2}>Khối 2</option>
                      <option value={3}>Khối 3</option>
                      <option value={4}>Khối 4</option>
                      <option value={5}>Khối 5</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Văn bản trích xuất (kiểm tra kỹ dấu thanh tiếng Việt):
                  </label>
                  <textarea
                    rows={8}
                    value={extractedDraftContent}
                    onChange={(e) => setExtractedDraftContent(e.target.value)}
                    placeholder="Nội dung trích xuất sẽ hiển thị ở đây. Thầy cô có thể sửa trực tiếp hoặc gõ/dán vào đây..."
                    className="w-full p-3 text-xs md:text-sm [font-family:Arial,'Segoe_UI',Tahoma,sans-serif] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsImportFileModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyImportedDraft}
                disabled={!extractedDraftContent.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-sm"
              >
                Chấp thuận văn bản & Điền vào bài đọc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
