import React, { useState, useEffect, useRef } from 'react';
import { 
  Beaker, CheckCircle2, XCircle, Play, RotateCcw, Mic, Volume2, 
  HelpCircle, Sparkles, ArrowRight, Activity, ShieldCheck, Check, X, Minus, Plus 
} from 'lucide-react';
import { runAlgorithmTests, TestCaseResult } from '../utils/testSuite';
import { alignSyllables, calculateMetrics, cleanVietnameseToken } from '../utils/alignment';
import { AlignmentToken } from '../types';

export const AlgorithmSandbox: React.FC = () => {
  // Kết quả kiểm thử tự động
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Bộ thử nghiệm căn chỉnh tương tác trực tiếp
  const [interactiveOriginal, setInteractiveOriginal] = useState(
    'Mặt trời vừa ló dạng qua rặng tre đầu làng. Đàn chim hót líu lo chào ngày mới.'
  );
  const [interactiveSpoken, setInteractiveSpoken] = useState(
    'Mặt trời vừa ló dạng qua rặng đầu làng. Đàn chim chim hót liu lo chào ngày mới vui tươi.'
  );
  const [interactiveTokens, setInteractiveTokens] = useState<AlignmentToken[]>([]);
  const [interactiveDuration, setInteractiveDuration] = useState(15);

  // Bộ kiểm tra Micro phần cứng thực tế (Real Audio Diagnostic)
  const [micTestState, setMicTestState] = useState<'idle' | 'recording' | 'success' | 'failed'>('idle');
  const [micTestVolume, setMicTestVolume] = useState(0);
  const [micDiagnosticMessage, setMicDiagnosticMessage] = useState<string | null>(null);
  const [maxVolumeDetected, setMaxVolumeDetected] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Chạy test tự động khi mở trang
  useEffect(() => {
    handleRunAllTests();
    handleRunInteractiveAlignment();
  }, []);

  const handleRunAllTests = () => {
    setIsTestRunning(true);
    setTimeout(() => {
      const results = runAlgorithmTests();
      setTestResults(results);
      setIsTestRunning(false);
    }, 150);
  };

  const handleRunInteractiveAlignment = () => {
    const tokens = alignSyllables(interactiveOriginal, interactiveSpoken);
    setInteractiveTokens(tokens);
  };

  const interactiveMetrics = calculateMetrics(interactiveTokens, interactiveDuration);

  // Kiểm tra micro phần cứng thực tế trong 3 giây
  const handleStartMicDiagnostic = async () => {
    setMicTestState('recording');
    setMicTestVolume(0);
    setMaxVolumeDetected(0);
    setMicDiagnosticMessage('Đang thu âm thử nghiệm trong 3 giây... Hãy nói một câu vào micro!');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let localMax = 0;

      const check = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = sum / buffer.length;
        const norm = Math.min(100, Math.round((avg / 128) * 100));
        setMicTestVolume(norm);
        if (norm > localMax) {
          localMax = norm;
          setMaxVolumeDetected(localMax);
        }
        animFrameRef.current = requestAnimationFrame(check);
      };
      check();

      // Dừng sau 3 giây và đánh giá kết quả thật
      setTimeout(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }

        setMicTestVolume(0);
        if (localMax > 5) {
          setMicTestState('success');
          setMicDiagnosticMessage(
            `Xác nhận micro hoạt động tốt! Cường độ âm thanh cao nhất đo được là ${localMax}%. Micro đã sẵn sàng cho bài kiểm tra đọc.`
          );
        } else {
          setMicTestState('failed');
          setMicDiagnosticMessage(
            `Cảnh báo: Không phát hiện thấy tín hiệu âm thanh hoặc âm lượng quá nhỏ (Cường độ cao nhất chỉ ${localMax}%). Vui lòng kiểm tra lại mic hoặc cài đặt âm lượng máy tính.`
          );
        }
      }, 3000);
    } catch (err: any) {
      setMicTestState('failed');
      setMicDiagnosticMessage(`Lỗi micro: ${err.message}. Không thể kết nối phần cứng micro.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-blue-600" />
          Khu vực Kiểm thử Thuật toán Căn chỉnh & Chẩn đoán Micro
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Tách biệt hoàn toàn với cơ sở dữ liệu học sinh thật · Minh chứng độ chuẩn xác của thuật toán Levenshtein DP
        </p>
      </div>

      {/* Phần 1: Chẩn đoán Micro Thực tế (3 giây) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Chẩn đoán Phần cứng Micro Thật (3 Giây)
            </h3>
            <p className="text-xs text-slate-500">
              Quy tắc trung thực: Không tuyên bố micro hoạt động nếu chưa thử và thu âm thanh thực tế
            </p>
          </div>

          <button
            onClick={handleStartMicDiagnostic}
            disabled={micTestState === 'recording'}
            className="flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition"
          >
            <Mic className="w-4 h-4" />
            {micTestState === 'recording' ? 'Đang thử nghiệm mic...' : 'Bắt đầu kiểm tra Micro 3s'}
          </button>
        </div>

        {/* Thanh VU meter chẩn đoán */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-blue-600" />
              Cường độ âm thanh tức thời:
            </span>
            <span className="font-mono font-bold">{micTestVolume}%</span>
          </div>

          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                micTestVolume > 70 ? 'bg-red-500' : micTestVolume > 20 ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
              style={{ width: `${micTestVolume}%` }}
            />
          </div>

          {micDiagnosticMessage && (
            <div
              className={`p-3 rounded-lg text-xs mt-2 flex items-start gap-2 ${
                micTestState === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : micTestState === 'failed'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {micTestState === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <span>{micDiagnosticMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Phần 2: Danh sách 8 Test Cases Thuật toán Tự động */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Bộ Kiểm thử Tự động Thuật toán Căn chỉnh (Test Suite)
              </h3>
              {testResults.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                  {testResults.filter(t => t.passed).length}/{testResults.length} ĐẠT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kiểm tra thực tế các trường hợp biên: 100% đúng, bỏ token giữa, lặp kề nhau, dấu tiếng Việt, chuỗi rỗng, chia cho 0, chuẩn 90 wpm, chống cộng đôi
            </p>
          </div>

          <button
            onClick={handleRunAllTests}
            disabled={isTestRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isTestRunning ? 'Đang chạy kiểm thử...' : 'Chạy lại toàn bộ test'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {testResults.map((test) => (
            <div
              key={test.id}
              className={`p-4 rounded-xl border transition ${
                test.passed
                  ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                  : 'bg-red-50/50 border-red-200 text-red-950'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {test.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs md:text-sm">{test.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{test.description}</p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    test.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {test.passed ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT'}
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Kỳ vọng (Expected):</span>
                  <p className="font-mono text-slate-700 mt-0.5">{test.expected}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Thực tế (Actual):</span>
                  <p className="font-mono text-slate-800 font-semibold mt-0.5">{test.actual}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phần 3: Công cụ Kiểm thử Căn chỉnh Tương tác Trực tiếp */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Công cụ Thử nghiệm Căn chỉnh Tương tác (Interactive Alignment Sandbox)
          </h3>
          <p className="text-xs text-slate-500">
            Giáo viên có thể gõ bất kỳ đoạn văn bản gốc và lời đọc giả định để quan sát thuật toán căn chỉnh Needleman-Wunsch
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Văn bản bài đọc gốc (Original):
            </label>
            <textarea
              rows={4}
              value={interactiveOriginal}
              onChange={(e) => setInteractiveOriginal(e.target.value)}
              className="w-full p-2.5 text-xs [font-family:Arial,'Segoe_UI',Tahoma,sans-serif] border border-slate-300 rounded-lg leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lời đọc của học sinh (Spoken/Transcript):
            </label>
            <textarea
              rows={4}
              value={interactiveSpoken}
              onChange={(e) => setInteractiveSpoken(e.target.value)}
              className="w-full p-2.5 text-xs [font-family:Arial,'Segoe_UI',Tahoma,sans-serif] border border-slate-300 rounded-lg leading-relaxed"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">Thời gian đọc giả định:</span>
            <input
              type="number"
              min="1"
              value={interactiveDuration}
              onChange={(e) => setInteractiveDuration(Number(e.target.value))}
              className="w-16 p-1.5 text-xs border border-slate-300 rounded-md font-mono text-center"
            />
            <span className="text-slate-500">giây</span>
          </div>

          <button
            onClick={handleRunInteractiveAlignment}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Chạy Căn chỉnh Ngay
          </button>
        </div>

        {/* Kết quả căn chỉnh tương tác */}
        {interactiveTokens.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
              Kết quả căn chỉnh từng âm tiết:
            </span>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-2 text-xs leading-loose [font-family:Arial,'Segoe_UI',Tahoma,sans-serif]">
              {interactiveTokens.map((t) => {
                let badge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                let sym = '✓';
                if (t.type === 'substitution') {
                  badge = 'bg-red-50 text-red-800 border-red-300';
                  sym = '×';
                } else if (t.type === 'deletion') {
                  badge = 'bg-amber-50 text-amber-800 border-amber-300 line-through';
                  sym = '−';
                } else if (t.type === 'insertion') {
                  badge = 'bg-purple-50 text-purple-800 border-purple-300';
                  sym = '+';
                } else if (t.type === 'repetition') {
                  badge = 'bg-indigo-50 text-indigo-800 border-indigo-300';
                  sym = '⟳';
                }
                return (
                  <span key={t.id} className={`px-2 py-0.5 rounded border inline-flex items-center gap-1 font-sans ${badge}`}>
                    <span className="font-bold">{sym}</span>
                    <span className="[font-variant-ligatures:none]">{(t.originalToken || t.spokenToken)?.normalize('NFC')}</span>
                    {t.type === 'substitution' && t.spokenToken && (
                      <span className="opacity-75">({t.spokenToken.normalize('NFC')})</span>
                    )}
                  </span>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-100 rounded">Đúng: <strong>{interactiveMetrics.matchCount}</strong></div>
              <div className="p-2 bg-red-50 text-red-800 rounded">Sai: <strong>{interactiveMetrics.substitutionCount}</strong></div>
              <div className="p-2 bg-amber-50 text-amber-800 rounded">Bỏ: <strong>{interactiveMetrics.deletionCount}</strong></div>
              <div className="p-2 bg-blue-50 text-blue-800 rounded">Tốc độ đúng: <strong>{interactiveMetrics.accuracySpeedWpm} t/p</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
