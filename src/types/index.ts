/**
 * Hệ thống kiểu dữ liệu cho Ứng dụng Kiểm tra Đọc Học sinh Tiểu học
 * Tác giả: Cô Trương Kim Thoại - Trường Tiểu học Đinh Bộ Lĩnh, phường Rạch Giá, tỉnh An Giang
 */

export interface Student {
  id: string;
  code: string; // Mã học sinh (vd: HS0101)
  fullName: string; // Họ và tên
  className: string; // Lớp (vd: 1A, 2B, 3C)
  grade: number; // Khối 1 - 5
  schoolYear: string; // Năm học (vd: 2025-2026)
  orderNumber?: number; // Số thứ tự trong danh sách lớp
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Passage {
  id: string;
  title: string; // Tên bài đọc
  grade: number; // Khối 1 - 5
  source: string; // Nguồn: ghi rõ "Bài minh họa do ứng dụng tạo" nếu chưa có nguồn xác minh
  content: string; // Nội dung bài đọc đầy đủ
  syllableCount: number; // Số đơn vị âm tiết (tách khoảng trắng)
  notes?: string; // Ghi chú từ ngữ khó đọc
  createdAt: number;
  updatedAt: number;
}

export type AlignmentType = 
  | 'match'        // Đúng: ✓ (Xanh)
  | 'substitution' // Sai / Thay thế: × (Đỏ)
  | 'deletion'     // Bỏ sót từ: − (Cam)
  | 'insertion'    // Đọc thêm từ: + (Tím)
  | 'repetition';  // Lặp từ (tập con của từ thêm): ⟳ (Chàm/Tím)

export interface AlignmentToken {
  id: string;
  originalToken?: string; // Từ trong bài đọc gốc
  spokenToken?: string;   // Từ học sinh đọc nhận dạng được
  cleanOriginal?: string; // Từ gốc đã bỏ dấu câu, chữ thường
  cleanSpoken?: string;   // Từ đọc đã bỏ dấu câu, chữ thường
  type: AlignmentType;
  isRepetition?: boolean; // Đánh dấu là repetition (tập con của insertion)
  isTeacherModified?: boolean;
  teacherReason?: string;
}

export interface TestMetrics {
  totalPassageTokens: number; // Tổng số âm tiết trong văn bản gốc
  totalSpokenTokens: number;  // Tổng số âm tiết đọc được = match + substitution + insertion
  matchCount: number;         // Số âm tiết đọc đúng
  substitutionCount: number;  // Số âm tiết đọc sai / thay thế
  deletionCount: number;      // Số âm tiết bỏ sót
  insertionCount: number;     // Tổng số âm tiết thêm (đã bao gồm các từ lặp lại, không cộng đôi)
  repetitionCount: number;    // Số âm tiết lặp lại kề nhau (tập con của insertionCount)
  totalSpeedWpm: number;      // Tốc độ đọc tổng thể: (totalSpokenTokens * 60) / thời gian_giây
  accuracySpeedWpm: number;   // Tốc độ đọc đúng: (matchCount * 60) / thời gian_giây
  isSpeedValid: boolean;      // false khi thời gian <= 0 (hiển thị Chưa xác định)
}

export interface ManualCriteriaScores {
  [key: string]: number | null | undefined;
  accuracy: number | null;                // Đọc đúng âm, vần, tiếng (máy gợi ý)
  punctuation?: number | null;     // Ngắt nghỉ đúng dấu câu (để trống nếu chưa chấm)
  expression?: number | null;      // Đọc diễn cảm, âm lượng phù hợp (để trống nếu chưa chấm)
  postureVolume?: number | null;   // Tư thế đọc, phát âm rõ ràng (để trống nếu chưa chấm)
}

export interface GradeRubric {
  version?: string;
  accuracyErrorGroupSize?: number;
  readingMaxScore?: number;
  answerMaxScore?: number;
  criteria?: Array<{ key: string; label: string; max: number; section: 'reading' | 'answer' }>;
  grade: number;
  name: string;
  isPresetNote: string; // "Minh họa tham khảo – chưa phải thang đánh giá chính thức của Bộ GD&ĐT"
  maxTotalScore: number; // Thường là 10.0
  accuracyMaxScore: number; // vd: 6.0
  penaltyPerError: number; // vd: 0.25 (mỗi lỗi trừ 0.25)
  punctuationMaxScore: number; // vd: 2.0
  expressionMaxScore: number; // vd: 1.0
  postureVolumeMaxScore: number; // vd: 1.0
  targetSpeedMin: number; // Tốc độ chuẩn tối thiểu (tiếng/phút)
  targetSpeedMax: number; // Tốc độ chuẩn tối đa (tiếng/phút)
}

export interface TestResult {
  id: string;
  studentId: string;
  passageId: string;
  studentSnapshot: {
    code: string;
    fullName: string;
    className: string;
    grade: number;
    schoolYear: string;
    orderNumber?: number;
  };
  passageSnapshot: {
    title: string;
    grade: number;
    syllableCount: number;
    source: string;
    content: string;
  };
  rubricSnapshot?: GradeRubric; // Lưu snapshot tiêu chí tại thời điểm kiểm tra
  testDate: string;
  teacherConfirmedErrorCount?: number;
  answerQuestion?: string;
  answerNotes?: string;
  rawDurationSeconds: number;
  pausedDurationSeconds: number;
  actualDurationSeconds: number;
  isDurationManual?: boolean;
  manualDurationReason?: string;
  rawTranscript: string;
  editedTranscript?: string;
  sttEngine: 'webkitSpeechRecognition' | 'manual_transcript';
  alignmentTokens: AlignmentToken[];
  metrics: TestMetrics;
  suggestedScore: number;
  confirmedScore?: number; // Chỉ có khi confirmed=true
  manualCriteriaScores: ManualCriteriaScores;
  teacherFeedback: string;
  status: 'suggested_pending_review' | 'confirmed_by_teacher';
  confirmedAt?: number;
  confirmedByTeacherName: string;
  schoolName: string;
  schoolAddress: string;
  hasAudioStored: boolean;
  audioStorageKey?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLog {
  id: string;
  testResultId: string;
  timestamp: number;
  action: string;
  beforeValue: string;
  afterValue: string;
  reason: string;
  performedBy: string;
}

export interface AppSettings {
  allowAudioPersistence: boolean; // Giáo viên chủ động bật lưu âm thanh lâu dài vào IndexedDB
  audioRetentionDays: number; // 0 = vĩnh viễn, 7 = 7 ngày, 30 = 30 ngày
  consentOnlineSTT: boolean; // Đồng ý bật Web Speech API (có thể gửi âm thanh đến máy chủ của Google/trình duyệt), mặc định FALSE
  teacherName: string;
  schoolName: string;
  schoolLocation: string;
}

// Cập nhật theo phiếu giáo viên ngày 13/10/2026.
