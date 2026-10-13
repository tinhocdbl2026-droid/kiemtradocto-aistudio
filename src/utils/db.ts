/**
 * Quản lý cơ sở dữ liệu IndexedDB bền vững cục bộ
 * Đảm bảo:
 * - Lưu trên trình duyệt/thiết bị của giáo viên, không gửi lên đám mây ngoài
 * - Không có dữ liệu học sinh giả trong dữ liệu thật
 * - Xử lý lỗi Quota / Transaction rõ ràng
 * - Sao lưu JSON có validation preview chống ghi đè ngoài ý muốn
 * - Xuất CSV chuẩn tiếng Việt (UTF-8 BOM) và chống Formula Injection
 */

import { Student, Passage, TestResult, GradeRubric, AuditLog, AppSettings } from '../types';

const DB_NAME = 'DocTieuHoc_DB';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  allowAudioPersistence: false, // Mặc định chỉ lưu trong phiên để bảo vệ quyền riêng tư học sinh
  audioRetentionDays: 30, // Tự động dọn sau 30 ngày nếu bật lưu
  consentOnlineSTT: false, // Mặc định TẮT nhận dạng trực tuyến Web Speech API; chỉ bật khi giáo viên chủ động đồng ý
  teacherName: 'Cô Trương Kim Thoại',
  schoolName: 'Trường Tiểu học Đinh Bộ Lĩnh',
  schoolLocation: 'phường Rạch Giá, tỉnh An Giang',
};

// Bộ tiêu chí mặc định theo 5 khối - GHI RÕ LÀ MINH HỌA THAM KHẢO
export const GRADE3_CRITERIA: Array<{key: string; label: string; max: number; section: 'reading' | 'answer'}> = [
  { key: 'accuracy', label: 'Đọc đúng và đủ nội dung (sai 1–2 lỗi trừ 0,25 điểm)', max: 1.5, section: 'reading' },
  { key: 'volume', label: 'Âm lượng đủ nghe, không quá to hoặc quá nhỏ', max: 0.25, section: 'reading' },
  { key: 'punctuation', label: 'Biết ngắt, nghỉ hơi ở dấu câu; nhịp thơ', max: 0.25, section: 'reading' },
  { key: 'speed', label: 'Đảm bảo tốc độ đọc 70–80 tiếng/phút', max: 0.5, section: 'reading' },
  { key: 'clarity', label: 'Đọc rõ ràng, rành mạch, liên tục', max: 0.25, section: 'reading' },
  { key: 'expression', label: 'Tư thế đọc tự tin; thể hiện được ngữ điệu', max: 0.25, section: 'reading' },
  { key: 'answerContent', label: 'Trả lời đúng trọng tâm', max: 0.5, section: 'answer' },
  { key: 'answerConfidence', label: 'Thái độ tự tin', max: 0.25, section: 'answer' },
  { key: 'answerClarity', label: 'Lời nói rõ ràng', max: 0.25, section: 'answer' },
];
export const GRADE3_RUBRIC: GradeRubric = {
  grade: 3, name: 'Phiếu quan sát đọc to lớp 3 – thang 4 điểm', version: 'grade3-teacher-sheet-v1',
  isPresetNote: 'Theo phiếu quan sát đọc to lớp 3 do giáo viên cung cấp.',
  maxTotalScore: 4, readingMaxScore: 3, answerMaxScore: 1,
  accuracyMaxScore: 1.5, penaltyPerError: 0.25, accuracyErrorGroupSize: 2,
  punctuationMaxScore: 0.25, expressionMaxScore: 0.25, postureVolumeMaxScore: 0.25,
  targetSpeedMin: 70, targetSpeedMax: 80, criteria: GRADE3_CRITERIA,
};

export const DEFAULT_RUBRICS: GradeRubric[] = [
  {
    grade: 1,
    name: 'Khối 1 - Học kỳ 2',
    isPresetNote: 'Minh họa tham khảo – chưa phải thang đánh giá chính thức của Bộ GD&ĐT',
    maxTotalScore: 10,
    accuracyMaxScore: 6.0,
    penaltyPerError: 0.25,
    punctuationMaxScore: 2.0,
    expressionMaxScore: 1.0,
    postureVolumeMaxScore: 1.0,
    targetSpeedMin: 30,
    targetSpeedMax: 40,
  },
  {
    grade: 2,
    name: 'Khối 2',
    isPresetNote: 'Minh họa tham khảo – chưa phải thang đánh giá chính thức của Bộ GD&ĐT',
    maxTotalScore: 10,
    accuracyMaxScore: 6.0,
    penaltyPerError: 0.25,
    punctuationMaxScore: 2.0,
    expressionMaxScore: 1.0,
    postureVolumeMaxScore: 1.0,
    targetSpeedMin: 50,
    targetSpeedMax: 60,
  },
  {
    grade: 3,
    name: 'Khối 3',
    isPresetNote: 'Minh họa tham khảo – chưa phải thang đánh giá chính thức của Bộ GD&ĐT',
    maxTotalScore: 10,
    accuracyMaxScore: 6.0,
    penaltyPerError: 0.25,
    punctuationMaxScore: 2.0,
    expressionMaxScore: 1.0,
    postureVolumeMaxScore: 1.0,
    targetSpeedMin: 70,
    targetSpeedMax: 80,
  },
  {
    grade: 4,
    name: 'Khối 4',
    isPresetNote: 'Minh họa tham khảo – chưa phải thang đánh giá chính thức của Bộ GD&ĐT',
    maxTotalScore: 10,
    accuracyMaxScore: 6.0,
    penaltyPerError: 0.2,
    punctuationMaxScore: 2.0,
    expressionMaxScore: 1.0,
    postureVolumeMaxScore: 1.0,
    targetSpeedMin: 80,
    targetSpeedMax: 90,
  },
  {
    grade: 5,
    name: 'Khối 5',
    isPresetNote: 'Minh họa tham khảo – chưa phải thang đánh giá chính thức của Bộ GD&ĐT',
    maxTotalScore: 10,
    accuracyMaxScore: 6.0,
    penaltyPerError: 0.2,
    punctuationMaxScore: 2.0,
    expressionMaxScore: 1.0,
    postureVolumeMaxScore: 1.0,
    targetSpeedMin: 90,
    targetSpeedMax: 110,
  },
].map(r => r.grade === 3 ? { ...GRADE3_RUBRIC } : r);

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Học sinh
        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'id' });
          studentStore.createIndex('code', 'code', { unique: false });
          studentStore.createIndex('grade', 'grade', { unique: false });
          studentStore.createIndex('className', 'className', { unique: false });
        }

        // 2. Bài đọc
        if (!db.objectStoreNames.contains('passages')) {
          const passageStore = db.createObjectStore('passages', { keyPath: 'id' });
          passageStore.createIndex('grade', 'grade', { unique: false });
          passageStore.createIndex('title', 'title', { unique: false });
        }

        // 3. Kết quả kiểm tra
        if (!db.objectStoreNames.contains('testResults')) {
          const resultStore = db.createObjectStore('testResults', { keyPath: 'id' });
          resultStore.createIndex('studentId', 'studentId', { unique: false });
          resultStore.createIndex('passageId', 'passageId', { unique: false });
          resultStore.createIndex('testDate', 'testDate', { unique: false });
        }

        // 4. Tiêu chí
        if (!db.objectStoreNames.contains('rubrics')) {
          db.createObjectStore('rubrics', { keyPath: 'grade' });
        }

        // 5. Nhật ký kiểm toán audit
        if (!db.objectStoreNames.contains('auditLogs')) {
          const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
          auditStore.createIndex('testResultId', 'testResultId', { unique: false });
        }

        // 6. Tệp âm thanh thu được
        if (!db.objectStoreNames.contains('audioBlobs')) {
          db.createObjectStore('audioBlobs', { keyPath: 'id' });
        }

        // 7. Cấu hình cài đặt
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        // Khởi tạo rubrics nếu chưa có
        await this.initDefaultRubrics(db);
        // Migration chỉ ID seed do app tạo, không sửa bài người dùng
        await this.migrateSeedPassages(db);
        resolve(db);
      };

      request.onerror = () => {
        reject(new Error(`Không thể mở IndexedDB: ${request.error?.message}`));
      };
    });

    return this.dbPromise;
  }

  private async migrateSeedPassages(db: IDBDatabase): Promise<void> {
    const seedIds = ['passage_init_1', 'passage_init_2', 'passage_init_3', 'passage_init_4', 'passage_init_5'];
    return new Promise((resolve) => {
      const tx = db.transaction('passages', 'readwrite');
      const store = tx.objectStore('passages');
      for (const id of seedIds) {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const passage = getReq.result;
            // Migration chỉ ID seed do app tạo, không sửa bài người dùng, ghi Bài minh họa cần giáo viên duyệt
            if (passage.source !== 'Bài minh họa cần giáo viên duyệt') {
              passage.source = 'Bài minh họa cần giáo viên duyệt';
              store.put(passage);
            }
          }
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private async initDefaultRubrics(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      const tx = db.transaction('rubrics', 'readwrite');
      const store = tx.objectStore('rubrics');
      const grade3Req = store.get(3);
      grade3Req.onsuccess = () => {
        if (grade3Req.result?.version !== GRADE3_RUBRIC.version) store.put(GRADE3_RUBRIC);
      };
      const countReq = store.count();

      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          for (const rubric of DEFAULT_RUBRICS) {
            store.put(rubric);
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // --- CRUD HỌC SINH ---
  async getStudents(): Promise<Student[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('students', 'readonly');
      const store = tx.objectStore('students');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveStudent(student: Student): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('students', 'readwrite');
      const store = tx.objectStore('students');
      const req = store.put(student);
      req.onsuccess = () => resolve();
      req.onerror = () => {
        if (req.error?.name === 'QuotaExceededError') {
          reject(new Error('Bộ nhớ trình duyệt đã đầy (QuotaExceededError). Vui lòng dọn dẹp hoặc sao lưu bớt dữ liệu.'));
        } else {
          reject(req.error);
        }
      };
    });
  }

  async deleteStudent(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('students', 'readwrite');
      const store = tx.objectStore('students');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- CRUD BÀI ĐỌC ---
  async getPassages(): Promise<Passage[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('passages', 'readwrite');
      const store = tx.objectStore('passages');
      const req = store.getAll();
      req.onsuccess = () => {
        const list: Passage[] = req.result || [];
        const seedIds = new Set(['passage_init_1', 'passage_init_2', 'passage_init_3', 'passage_init_4', 'passage_init_5']);
        for (const p of list) {
          // Migration chỉ ID seed do app tạo, không sửa bài người dùng, ghi Bài minh họa cần giáo viên duyệt
          if (seedIds.has(p.id) && p.source !== 'Bài minh họa cần giáo viên duyệt') {
            p.source = 'Bài minh họa cần giáo viên duyệt';
            store.put(p);
          }
        }
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async savePassage(passage: Passage): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('passages', 'readwrite');
      const store = tx.objectStore('passages');
      const req = store.put(passage);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deletePassage(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('passages', 'readwrite');
      const store = tx.objectStore('passages');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- KẾT QUẢ KIỂM TRA ---
  async getTestResults(): Promise<TestResult[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('testResults', 'readonly');
      const store = tx.objectStore('testResults');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveTestResult(result: TestResult): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('testResults', 'readwrite');
      const store = tx.objectStore('testResults');
      const req = store.put(result);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteTestResult(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['testResults', 'audioBlobs', 'auditLogs'], 'readwrite');
      tx.objectStore('testResults').delete(id);
      tx.objectStore('audioBlobs').delete(id);
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- TIÊU CHÍ RUBRICS ---
  async getRubrics(): Promise<GradeRubric[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('rubrics', 'readonly');
      const store = tx.objectStore('rubrics');
      const req = store.getAll();
      req.onsuccess = () => {
        if (!req.result || req.result.length === 0) {
          resolve(DEFAULT_RUBRICS);
        } else {
          resolve(req.result);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveRubric(rubric: GradeRubric): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('rubrics', 'readwrite');
      const store = tx.objectStore('rubrics');
      const req = store.put(rubric);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- NHẬT KÝ AUDIT ---
  async getAuditLogs(testResultId?: string): Promise<AuditLog[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('auditLogs', 'readonly');
      const store = tx.objectStore('auditLogs');
      if (testResultId) {
        const index = store.index('testResultId');
        const req = index.getAll(testResultId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      }
    });
  }

  async logAudit(log: AuditLog): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('auditLogs', 'readwrite');
      const store = tx.objectStore('auditLogs');
      const req = store.put(log);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- LƯU TRỮ ÂM THANH (CHỈ KHI GIÁO VIÊN BẬT CHO PHÉP) ---
  async saveAudioBlob(id: string, blob: Blob): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audioBlobs', 'readwrite');
      const store = tx.objectStore('audioBlobs');
      const req = store.put({ id, blob, createdAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => {
        if (req.error?.name === 'QuotaExceededError') {
          reject(new Error('Bộ nhớ âm thanh đã vượt quá dung lượng cho phép của trình duyệt.'));
        } else {
          reject(req.error);
        }
      };
    });
  }

  async getAudioBlob(id: string): Promise<Blob | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audioBlobs', 'readonly');
      const store = tx.objectStore('audioBlobs');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  }

  async cleanOldAudioBlobs(retentionDays: number): Promise<number> {
    if (retentionDays <= 0) return 0; // Vĩnh viễn
    const db = await this.openDB();
    const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audioBlobs', 'readwrite');
      const store = tx.objectStore('audioBlobs');
      const req = store.openCursor();
      let deleted = 0;

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          if (cursor.value.createdAt && cursor.value.createdAt < threshold) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- CÀI ĐẶT ---
  async getSettings(): Promise<AppSettings> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get('app_settings');
      req.onsuccess = () => resolve(req.result ? req.result.data : DEFAULT_SETTINGS);
      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ id: 'app_settings', data: settings, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- SAO LƯU DỮ LIỆU JSON & KHÔI PHỤC ---
  async exportBackupJSON(): Promise<string> {
    const students = await this.getStudents();
    const passages = await this.getPassages();
    const testResults = await this.getTestResults();
    const rubrics = await this.getRubrics();
    const settings = await this.getSettings();
    const auditLogs = await this.getAuditLogs();

    const backupData = {
      app: 'ỨNG DỤNG KIỂM TRA ĐỌC TO LỚP 3',
      author: 'Cô Trương Kim Thoại',
      school: 'Trường Tiểu học Đinh Bộ Lĩnh, phường Rạch Giá, tỉnh An Giang',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      counts: {
        students: students.length,
        passages: passages.length,
        testResults: testResults.length,
        rubrics: rubrics.length,
        auditLogs: auditLogs.length,
      },
      data: {
        students,
        passages,
        testResults,
        rubrics,
        settings,
        auditLogs,
      },
    };

    return JSON.stringify(backupData, null, 2);
  }

  validateBackupJSON(jsonStr: string): {
    isValid: boolean;
    error?: string;
    preview?: {
      studentsCount: number;
      passagesCount: number;
      testResultsCount: number;
      rubricsCount: number;
      auditLogsCount?: number;
      exportedAt?: string;
    };
    parsedData?: any;
  } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !parsed.data) {
        return { isValid: false, error: 'Tệp JSON không đúng cấu trúc sao lưu của ứng dụng.' };
      }
      const data = parsed.data;
      if (!Array.isArray(data.students) && !Array.isArray(data.passages) && !Array.isArray(data.testResults)) {
        return { isValid: false, error: 'Tệp tin không chứa dữ liệu học sinh hoặc bài đọc hợp lệ.' };
      }

      return {
        isValid: true,
        preview: {
          studentsCount: Array.isArray(data.students) ? data.students.length : 0,
          passagesCount: Array.isArray(data.passages) ? data.passages.length : 0,
          testResultsCount: Array.isArray(data.testResults) ? data.testResults.length : 0,
          rubricsCount: Array.isArray(data.rubrics) ? data.rubrics.length : 0,
          auditLogsCount: Array.isArray(data.auditLogs) ? data.auditLogs.length : 0,
          exportedAt: parsed.exportedAt,
        },
        parsedData: data,
      };
    } catch (e: any) {
      return { isValid: false, error: `Lỗi đọc cú pháp JSON: ${e.message}` };
    }
  }

  async restoreBackup(parsedData: any, mode: 'overwrite' | 'merge'): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const stores = ['students', 'passages', 'testResults', 'rubrics', 'auditLogs'];
      const tx = db.transaction(stores, 'readwrite');

      if (mode === 'overwrite') {
        stores.forEach((storeName) => {
          tx.objectStore(storeName).clear();
        });
      }

      if (Array.isArray(parsedData.students)) {
        const sStore = tx.objectStore('students');
        parsedData.students.forEach((s: Student) => sStore.put(s));
      }

      if (Array.isArray(parsedData.passages)) {
        const pStore = tx.objectStore('passages');
        parsedData.passages.forEach((p: Passage) => pStore.put(p));
      }

      if (Array.isArray(parsedData.testResults)) {
        const rStore = tx.objectStore('testResults');
        parsedData.testResults.forEach((r: TestResult) => rStore.put(r));
      }

      if (Array.isArray(parsedData.rubrics)) {
        const ruStore = tx.objectStore('rubrics');
        parsedData.rubrics.forEach((ru: GradeRubric) => ruStore.put(ru));
      }

      if (Array.isArray(parsedData.auditLogs)) {
        const aStore = tx.objectStore('auditLogs');
        parsedData.auditLogs.forEach((log: AuditLog) => {
          if (log && log.id && log.testResultId) {
            aStore.put(log);
          }
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- XUẤT CSV CHỐNG FORMULA INJECTION & ĐẦY ĐỦ TIẾNG VIỆT ---
  sanitizeCSVCell(val: any): string {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    
    // Chống CSV Formula Injection: nếu bắt đầu bằng =, +, -, @, \t, \r thì chèn thêm dấu nháy đơn '
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Nếu chứa dấu phẩy, nháy kép hoặc xuống dòng thì bao bọc trong dấu nháy kép ""
    if (/[",\n\r]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  generateCSV(headers: string[], rows: any[][]): string {
    // Thêm UTF-8 BOM (\uFEFF) để Excel hiển thị tiếng Việt chuẩn không bị lỗi font
    const bom = '\uFEFF';
    const headerLine = headers.map(h => this.sanitizeCSVCell(h)).join(',');
    const dataLines = rows.map(row => row.map(cell => this.sanitizeCSVCell(cell)).join(','));
    return bom + [headerLine, ...dataLines].join('\r\n');
  }
}

export const dbService = new DatabaseService();

