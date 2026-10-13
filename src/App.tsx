import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { StudentManager } from './components/StudentManager';
import { PassageManager } from './components/PassageManager';
import { TestSession } from './components/TestSession';
import { ResultsHistory } from './components/ResultsHistory';
import { RubricConfig } from './components/RubricConfig';
import { BackupManager } from './components/BackupManager';
import { AlgorithmSandbox } from './components/AlgorithmSandbox';
import { PedagogicalGuide } from './components/PedagogicalGuide';
import { PrintA4Modal } from './components/PrintA4Modal';
import { Student, Passage, TestResult, GradeRubric, AppSettings, AuditLog } from './types';
import { dbService, DEFAULT_SETTINGS, DEFAULT_RUBRICS } from './utils/db';
import { countVietnameseSyllables } from './utils/alignment';

// Danh mục bài đọc mẫu minh họa do ứng dụng tạo (dành cho thư viện bài đọc ban đầu)
const INITIAL_CURRICULUM_PASSAGES: Passage[] = [
  {
    id: 'passage_init_1',
    title: 'Đi học',
    grade: 1,
    source: 'Bài minh họa cần giáo viên duyệt',
    content: 'Hôm nay trời nắng chang chang. Mèo con đi học chẳng mang thứ gì. Chỉ mang một cái bút chì và một mẩu bánh mì con con.',
    syllableCount: 28,
    notes: 'Lưu ý học sinh ngắt nghỉ đúng câu thơ, phát âm chuẩn âm ch và tr.',
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 500000,
  },
  {
    id: 'passage_init_2',
    title: 'Mùa vàng trên cánh đồng',
    grade: 2,
    source: 'Bài minh họa cần giáo viên duyệt',
    content: 'Mùa thu đến, cánh đồng quê em khoác lên mình chiếc áo màu vàng rực rỡ. Những bông lúa trĩu nặng đung đưa trong làn gió mát lành. Hương lúa mới thoang thoảng bay khắp đường làng.',
    syllableCount: 37,
    notes: 'Chú ý phát âm vần uốc (khoác), âm tr (trĩu nặng), vần oang (thoang thoảng).',
    createdAt: Date.now() - 400000,
    updatedAt: Date.now() - 400000,
  },
  {
    id: 'passage_init_3',
    title: 'Tiếng chim buổi sáng',
    grade: 3,
    source: 'Bài minh họa cần giáo viên duyệt',
    content: 'Sáng sớm, khi vầng đông vừa rạng, đàn chim sẻ ríu rít chuyền cành trên vòm me xanh biếc. Tiếng hót trong veo làm bừng tỉnh cả không gian yên tĩnh của xóm nhỏ.',
    syllableCount: 35,
    notes: 'Chú ý phân biệt s/x (sáng sớm/xóm nhỏ), r/ch (ríu rít/chuyền cành).',
    createdAt: Date.now() - 300000,
    updatedAt: Date.now() - 300000,
  },
  {
    id: 'passage_init_4',
    title: 'Dế Mèn bênh vực kẻ yếu',
    grade: 4,
    source: 'Bài minh họa cần giáo viên duyệt',
    content: 'Một hôm, qua một vùng cỏ xước xanh dài, tôi chợt nghe tiếng khóc tỉ tê. Đi vài bước nữa, tôi gặp chị Nhà Trò ngồi gục đầu bên tảng đá cuội. Chị mặc áo thâm dài, đôi cánh mỏng manh như cánh bướm non.',
    syllableCount: 46,
    notes: 'Rèn đọc giọng chậm rãi, cảm thông; ngắt câu đúng dấu phẩy.',
    createdAt: Date.now() - 200000,
    updatedAt: Date.now() - 200000,
  },
  {
    id: 'passage_init_5',
    title: 'Nét đẹp quê hương Rạch Giá',
    grade: 5,
    source: 'Bài minh họa cần giáo viên duyệt',
    content: 'Thành phố Rạch Giá nằm bên bờ vịnh biển hiền hòa. Mỗi sớm mai, khi những đoàn thuyền đánh cá trở về bến đỗ, không khí bến cảng lại tấp nập, rộn rã tiếng cười nói của ngư dân.',
    syllableCount: 38,
    notes: 'Đọc diễn cảm, phát âm rõ tên địa danh Rạch Giá và các từ tấp nập, rộn rã.',
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('test');
  const [isLoading, setIsLoading] = useState(true);

  // Dữ liệu ứng dụng
  const [students, setStudents] = useState<Student[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [rubrics, setRubrics] = useState<GradeRubric[]>(DEFAULT_RUBRICS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Modal in phiếu A4
  const [printPreviewResult, setPrintPreviewResult] = useState<TestResult | null>(null);

  // Tải toàn bộ dữ liệu từ IndexedDB
  const loadAllData = useCallback(async () => {
    try {
      const loadedStudents = await dbService.getStudents();
      let loadedPassages = await dbService.getPassages();

      // Nếu thư viện bài đọc chưa có bài nào, khởi tạo 5 bài đọc mẫu chuẩn SGK
      if (loadedPassages.length === 0) {
        for (const p of INITIAL_CURRICULUM_PASSAGES) {
          p.syllableCount = countVietnameseSyllables(p.content);
          await dbService.savePassage(p);
        }
        loadedPassages = await dbService.getPassages();
      }

      const loadedResults = await dbService.getTestResults();
      const loadedRubrics = await dbService.getRubrics();
      const loadedSettings = await dbService.getSettings();

      setStudents(loadedStudents);
      setPassages(loadedPassages);
      setTestResults(loadedResults);
      setRubrics(loadedRubrics.length > 0 ? loadedRubrics : DEFAULT_RUBRICS);
      setSettings(loadedSettings);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu từ IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Số lượng kết quả đang chờ kiểm tra đối soát
  const pendingReviewCount = testResults.filter((r) => r.status === 'suggested_pending_review').length;

  // Handlers CRUD Học sinh
  const handleAddStudent = async (student: Student) => {
    await dbService.saveStudent(student);
    setStudents((prev) => [...prev, student]);
  };

  const handleUpdateStudent = async (student: Student) => {
    await dbService.saveStudent(student);
    setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
  };

  const handleDeleteStudent = async (id: string) => {
    await dbService.deleteStudent(id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  // Handlers CRUD Bài đọc
  const handleAddPassage = async (passage: Passage) => {
    await dbService.savePassage(passage);
    setPassages((prev) => [...prev, passage]);
  };

  const handleUpdatePassage = async (passage: Passage) => {
    await dbService.savePassage(passage);
    setPassages((prev) => prev.map((p) => (p.id === passage.id ? passage : p)));
  };

  const handleDeletePassage = async (id: string) => {
    await dbService.deletePassage(id);
    setPassages((prev) => prev.filter((p) => p.id !== id));
  };

  // Handler Lưu kết quả bài kiểm tra
  const handleSaveResult = async (
    result: TestResult,
    audioBlob: Blob | null,
    auditLogs: AuditLog[]
  ) => {
    await dbService.saveTestResult(result);

    // Lưu audio blob nếu giáo viên bật lưu và có audio
    if (audioBlob && settings.allowAudioPersistence) {
      try {
        await dbService.saveAudioBlob(result.id, audioBlob);
      } catch (e) {
        console.warn('Không thể lưu audio blob:', e);
      }
    }

    // Lưu các nhật ký audit
    for (const log of auditLogs) {
      await dbService.logAudit(log);
    }

    setTestResults((prev) => [result, ...prev.filter((r) => r.id !== result.id)]);
  };

  const handleDeleteResult = async (id: string) => {
    await dbService.deleteTestResult(id);
    setTestResults((prev) => prev.filter((r) => r.id !== id));
  };

  // Handler Tiêu chí & Cài đặt
  const handleSaveRubric = async (rubric: GradeRubric) => {
    await dbService.saveRubric(rubric);
    setRubrics((prev) => prev.map((r) => (r.grade === rubric.grade ? rubric : r)));
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    await dbService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">
          ỨNG DỤNG KIỂM TRA ĐỌC TO LỚP 3
        </h2>
        <p className="text-xs text-slate-500 mt-1">Đang khởi tạo cơ sở dữ liệu IndexedDB an toàn...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col text-slate-900">
      {/* Thanh điều hướng và biểu ngữ trường */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingReviewCount={pendingReviewCount}
      />

      {/* Nội dung chính theo tab đang chọn */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-16">
        {activeTab === 'test' && (
          <TestSession
            students={students}
            passages={passages}
            rubrics={rubrics}
            teacherName={settings.teacherName}
            allowAudioPersistence={settings.allowAudioPersistence}
            onSaveResult={handleSaveResult}
            onOpenPrintPreview={(res) => setPrintPreviewResult(res)}
          />
        )}

        {activeTab === 'students' && (
          <StudentManager
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        )}

        {activeTab === 'passages' && (
          <PassageManager
            passages={passages}
            onAddPassage={handleAddPassage}
            onUpdatePassage={handleUpdatePassage}
            onDeletePassage={handleDeletePassage}
          />
        )}

        {activeTab === 'history' && (
          <ResultsHistory
            results={testResults}
            onDeleteResult={handleDeleteResult}
            onOpenPrintPreview={(res) => setPrintPreviewResult(res)}
            onRefreshResults={loadAllData}
          />
        )}

        {activeTab === 'rubrics' && (
          <RubricConfig
            rubrics={rubrics}
            onSaveRubric={handleSaveRubric}
          />
        )}

        {activeTab === 'backup' && (
          <BackupManager
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onRefreshAllData={loadAllData}
          />
        )}

        {activeTab === 'sandbox' && <AlgorithmSandbox />}

        {activeTab === 'guide' && <PedagogicalGuide />}
      </main>

      {/* Footer sư phạm */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Ứng dụng Kiểm tra Đọc Học sinh Tiểu học · Sáng kiến của <strong>Cô Trương Kim Thoại</strong>
          </span>
          <span className="text-slate-400">
            Trường Tiểu học Đinh Bộ Lĩnh, phường Rạch Giá, tỉnh An Giang · Dữ liệu lưu cục bộ
          </span>
        </div>
      </footer>

      {/* Modal In phiếu kết quả A4 */}
      {printPreviewResult && (
        <PrintA4Modal
          result={printPreviewResult}
          onClose={() => setPrintPreviewResult(null)}
        />
      )}
    </div>
  );
}
