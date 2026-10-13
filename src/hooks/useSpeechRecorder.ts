/**
 * Hook quản lý Ghi âm thật (getUserMedia, MediaRecorder, AudioContext VU-Meter)
 * và Nhận dạng giọng nói (webkitSpeechRecognition vi-VN).
 * Chống race condition khi kết thúc ghi âm:
 * - Dùng ref lưu trữ transcript thời gian thực
 * - Await recognition final/end có timeout hợp lý
 * - Flush interim transcript còn lại (không làm mất từ cuối)
 * - Trả về transcript finalized trực tiếp từ stopRecording()
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  isSupportedSTT: boolean;
  recognitionStatus: string;
  audioBlob: Blob | null;
  audioUrl: string | null;
  volumeLevel: number;
  isLowVolumeWarning: boolean;
  micError: string | null;

  elapsedSeconds: number;
  rawDurationSeconds: number;
  pausedDurationSeconds: number;

  finalTranscript: string;
  interimTranscript: string;
  setFinalTranscript: (text: string) => void;

  startRecording: (enableOnlineSTT?: boolean) => Promise<boolean>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<string>;
  resetRecording: () => void;
  loadRecording: (blob: Blob) => Promise<number>;
}

export function useSpeechRecorder(): UseSpeechRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isLowVolumeWarning, setIsLowVolumeWarning] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [recognitionStatus, setRecognitionStatus] = useState('Sẵn sàng nhận giọng khi bắt đầu đọc');

  // Đồng hồ performance.now()
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [rawDurationSeconds, setRawDurationSeconds] = useState(0);
  const [pausedDurationSeconds, setPausedDurationSeconds] = useState(0);

  // Lời đọc từ STT (state dùng cho UI)
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  // REFS LƯU TRỮ TỨC THỜI (chống stale closure)
  const sessionIdRef = useRef(0);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  // Refs quản lý tài nguyên phần cứng
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Cờ theo dõi có bật online STT hay không
  const isOnlineSTTEnabledRef = useRef<boolean>(false);

  // Quản lý thời gian
  const startTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<any>(null);

  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  isRecordingRef.current = isRecording;
  isPausedRef.current = isPaused;

  const win = typeof window !== 'undefined' ? (window as unknown as IWindowSpeechRecognition) : null;
  const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;
  const isSupportedSTT = !!SpeechRecognitionClass;

  const releaseTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setVolumeLevel(0);
  }, []);

  const initSpeechRecognition = useCallback(() => {
    if (!SpeechRecognitionClass) { setRecognitionStatus('Trình duyệt không hỗ trợ nhận giọng'); setMicError('Trình duyệt không hỗ trợ nhận giọng tự động. Hãy dùng Chrome hoặc nhập bản chép sau khi nghe bản ghi.'); return; }

    try {
      const sessionId = sessionIdRef.current;
      const recognition = new SpeechRecognitionClass();
      let recognitionFailures = 0;
      const committed = new Set<number>();
      recognition.lang = 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => { if (sessionId !== sessionIdRef.current) return; committed.clear(); setRecognitionStatus('Đang lắng nghe tiếng Việt…'); };
      recognition.onresult = (event: any) => {
        if (sessionId !== sessionIdRef.current) return;
        recognitionFailures = 0;
        setRecognitionStatus('Đã nhận được lời đọc');
        setMicError(null);
        let currentInterim = '';
        let currentFinalPiece = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal && !committed.has(i)) {
            committed.add(i);
            currentFinalPiece += res[0].transcript + ' ';
          } else if (!res.isFinal) {
            currentInterim += res[0].transcript;
          }
        }

        if (currentFinalPiece) {
          const trimmed = currentFinalPiece.trim();
          finalTranscriptRef.current = finalTranscriptRef.current
            ? `${finalTranscriptRef.current} ${trimmed}`
            : trimmed;
          setFinalTranscript(finalTranscriptRef.current);
        }

        interimTranscriptRef.current = currentInterim;
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        if (sessionId !== sessionIdRef.current || event.error === 'aborted') return;
        recognitionFailures++;
        const details:Record<string,string> = {'not-allowed':'Chưa được cấp quyền nhận giọng/micro. Hãy mở ứng dụng ở tab riêng và kiểm tra quyền của trang.', 'service-not-allowed':'Trình duyệt hoặc chính sách máy đang chặn dịch vụ nhận dạng.', 'network':'Không kết nối được dịch vụ nhận dạng. Kiểm tra Internet rồi thử lại.', 'audio-capture':'Dịch vụ nhận dạng chưa lấy được âm thanh từ micro.', 'no-speech':'Chưa nghe thấy lời nói. Đọc gần micro và kiểm tra mức âm lượng.', 'language-not-supported':'Dịch vụ chưa hỗ trợ ngôn ngữ tiếng Việt trên trình duyệt này.'};
        setRecognitionStatus('Nhận giọng gặp lỗi: '+event.error);
        setMicError((details[event.error]||('Nhận giọng gặp lỗi '+event.error))+ ' Bản thu âm cục bộ vẫn dùng để nghe đối soát; chưa kết luận lỗi phát âm.');
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || recognitionFailures >= 3) isOnlineSTTEnabledRef.current = false;
      };

      recognition.onend = () => {
        if(sessionId !== sessionIdRef.current)return;
        if(interimTranscriptRef.current.trim()){finalTranscriptRef.current=[finalTranscriptRef.current,interimTranscriptRef.current.trim()].filter(Boolean).join(' ');interimTranscriptRef.current='';setFinalTranscript(finalTranscriptRef.current);setInterimTranscript('');}
        if (sessionId === sessionIdRef.current && isRecordingRef.current && !isPausedRef.current && isOnlineSTTEnabledRef.current) {
          setTimeout(() => {
            if (sessionId !== sessionIdRef.current || !isRecordingRef.current || isPausedRef.current || !isOnlineSTTEnabledRef.current) return;
            committed.clear();
            try { recognition.start(); } catch (e:any) { setRecognitionStatus('Không khởi động lại được nhận giọng');setMicError('Không khởi động lại được nhận giọng: '+(e.message||String(e))); }
          }, 250);
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      setRecognitionStatus('Không khởi tạo được nhận giọng');
      setMicError('Không khởi tạo được nhận giọng. Ghi âm cục bộ vẫn hoạt động.');
    }
  }, [SpeechRecognitionClass]);

  // Bắt đầu ghi âm
  const startRecording = async (enableOnlineSTT: boolean = false): Promise<boolean> => {
    const sessionId = ++sessionIdRef.current;
    const chunks: Blob[] = [];
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    setMicError(null);
    setIsLowVolumeWarning(false);
    audioChunksRef.current = [];
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');

    isOnlineSTTEnabledRef.current = enableOnlineSTT;
    setRecognitionStatus(enableOnlineSTT?'Đang khởi động nhận giọng…':'Nhận giọng đang tắt — chỉ ghi âm cục bộ');

    try {
      // 1. Thu âm cục bộ
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (sessionId !== sessionIdRef.current) { stream.getTracks().forEach(t => t.stop()); return false; }
      mediaStreamRef.current = stream;

      // 2. Thiết lập Web Audio API đo volume (VU meter)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      if(sessionId !== sessionIdRef.current){stream.getTracks().forEach(t=>t.stop());return false;}

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lowVolumeCounter = 0;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setVolumeLevel(normalized);

        if (normalized < 3) {
          lowVolumeCounter++;
          if (lowVolumeCounter > 240) {
            setIsLowVolumeWarning(true);
          }
        } else {
          lowVolumeCounter = 0;
          setIsLowVolumeWarning(false);
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();

      // 3. Khởi động MediaRecorder ghi âm cục bộ
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (sessionId !== sessionIdRef.current) return;
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;

      isRecordingRef.current = true;
      isPausedRef.current = false;
      // 4. Khởi động SpeechRecognition nếu được bật
      if (enableOnlineSTT) {
        initSpeechRecognition();
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e:any) { isOnlineSTTEnabledRef.current=false;setRecognitionStatus('Không bật được nhận giọng');setMicError('Không bật được nhận giọng: '+(e.message||String(e))+'. Bản ghi âm cục bộ vẫn hoạt động.'); }
        }
      }

      // 5. Khởi động đồng hồ thời gian performance.now()
      startTimeRef.current = performance.now();
      totalPausedTimeRef.current = 0;
      setElapsedSeconds(0);
      setRawDurationSeconds(0);
      setPausedDurationSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        const now = performance.now();
        const rawSec = (now - startTimeRef.current) / 1000;
        const pausedSec = totalPausedTimeRef.current / 1000;
        const actualSec = Math.max(0, rawSec - pausedSec);

        setRawDurationSeconds(Math.round(rawSec * 10) / 10);
        setPausedDurationSeconds(Math.round(pausedSec * 10) / 10);
        setElapsedSeconds(Math.round(actualSec * 10) / 10);
      }, 100);

      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);
      return true;
    } catch (err: any) {
      isRecordingRef.current=false;isPausedRef.current=false;
      if(recognitionRef.current){try{recognitionRef.current.abort();}catch{} recognitionRef.current=null;}
      if(mediaRecorderRef.current?.state==='recording'){try{mediaRecorderRef.current.stop();}catch{}}
      releaseTracks();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Quyền truy cập micro đã bị từ chối. Nếu đang mở ứng dụng trong khung Preview nhúng (iframe), trình duyệt có thể hạn chế quyền truy cập Micro. Thầy cô vui lòng mở trực tiếp đường dẫn ứng dụng trong tab mới của trình duyệt (hoặc mở Preview toàn màn hình) để cấp quyền Micro.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicError('Không tìm thấy thiết bị micro nào được kết nối với máy tính.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMicError('Micro đang bị chiếm dụng bởi một ứng dụng khác (Zoom, Meet, Zalo...).');
      } else {
        setMicError(`Lỗi khởi động micro: ${err.message || 'Không xác định'}`);
      }
      return false;
    }
  };

  const pauseRecording = () => {
    if (!isRecording || isPaused) return;

    pauseStartTimeRef.current = performance.now();
    isPausedRef.current = true;
    setIsPaused(true);
    setRecognitionStatus('Đang tạm dừng nhận giọng');

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const resumeRecording = () => {
    if (!isRecording || !isPaused) return;

    const pauseDuration = performance.now() - pauseStartTimeRef.current;
    totalPausedTimeRef.current += pauseDuration;
    isPausedRef.current = false;
    setIsPaused(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }

    if (isOnlineSTTEnabledRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e:any) { setRecognitionStatus('Không tiếp tục được nhận giọng');setMicError('Không tiếp tục được nhận giọng: '+(e.message||String(e))); }
    }

    timerIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const rawSec = (now - startTimeRef.current) / 1000;
      const pausedSec = totalPausedTimeRef.current / 1000;
      const actualSec = Math.max(0, rawSec - pausedSec);

      setRawDurationSeconds(Math.round(rawSec * 10) / 10);
      setPausedDurationSeconds(Math.round(pausedSec * 10) / 10);
      setElapsedSeconds(Math.round(actualSec * 10) / 10);
    }, 100);
  };

  // KẾT THÚC GHI ÂM: AWAIT RECOGNITION FINAL VỚI TIMEOUT & FLUSH INTERIM
  const stopRecording = async (): Promise<string> => {
    const sessionId = sessionIdRef.current;
    if (!isRecordingRef.current) return finalTranscriptRef.current.trim();

    isRecordingRef.current = false;
    setIsRecording(false);
    setIsPaused(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const now = performance.now();
    let additionalPause = 0;
    if (isPausedRef.current) {
      additionalPause = now - pauseStartTimeRef.current;
    }
    const finalTotalPaused = totalPausedTimeRef.current + additionalPause;
    const finalRaw = (now - startTimeRef.current) / 1000;
    const finalPaused = finalTotalPaused / 1000;
    const finalActual = Math.max(0, finalRaw - finalPaused);

    setRawDurationSeconds(Math.round(finalRaw * 10) / 10);
    setPausedDurationSeconds(Math.round(finalPaused * 10) / 10);
    setElapsedSeconds(Math.round(finalActual * 10) / 10);

    // Chờ SpeechRecognition flush kết quả final cuối cùng
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      await new Promise<void>((resolve) => {
        let isDone = false;
        const complete = () => {
          if (!isDone) {
            isDone = true;
            resolve();
          }
        };

        const timeoutTimer = setTimeout(complete, 2500);

        const prevEnd = rec.onend;
        rec.onend = () => {
          clearTimeout(timeoutTimer);
          complete();
          if (typeof prevEnd === 'function') prevEnd();
        };

        try {
          rec.stop();
        } catch {
          clearTimeout(timeoutTimer);
          complete();
        }
      });
      if (sessionId !== sessionIdRef.current) return '';
      recognitionRef.current = null;
    }

    if (sessionId !== sessionIdRef.current) return '';

    // FLUSH INTERIM CÒN LẠI: Không bao giờ làm mất 2-3 tiếng cuối của học sinh
    if (interimTranscriptRef.current.trim()) {
      const remainingInterim = interimTranscriptRef.current.trim();
      finalTranscriptRef.current = finalTranscriptRef.current
        ? `${finalTranscriptRef.current} ${remainingInterim}`
        : remainingInterim;
      interimTranscriptRef.current = '';
      setFinalTranscript(finalTranscriptRef.current);
      setInterimTranscript('');
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    releaseTracks();

    setRecognitionStatus(finalTranscriptRef.current.trim()?'Đã nhận lời đọc — chờ giáo viên đối soát':isOnlineSTTEnabledRef.current?'Chưa nhận được lời đọc':'Nhận giọng đang tắt hoặc chưa hoạt động');
    return finalTranscriptRef.current.trim();
  };

  const resetRecording = () => {
    ++sessionIdRef.current;
    isRecordingRef.current = false;
    isPausedRef.current = false;
    isOnlineSTTEnabledRef.current = false;
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { try { mediaRecorderRef.current.stop(); } catch {} }
    mediaRecorderRef.current = null;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    releaseTracks();
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');
    setElapsedSeconds(0);
    setRawDurationSeconds(0);
    setPausedDurationSeconds(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setMicError(null);
    setRecognitionStatus('Sẵn sàng nhận giọng khi bắt đầu đọc');
    setIsLowVolumeWarning(false);
    setIsRecording(false);
    setIsPaused(false);
  };

  useEffect(() => {
    return () => {
      ++sessionIdRef.current;
      isRecordingRef.current = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      releaseTracks();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [releaseTracks]);

  const loadRecording = async (blob: Blob) => {
    if (isRecordingRef.current || !blob.size || blob.size > 10 * 1024 * 1024) throw new Error('Bản ghi không hợp lệ hoặc quá 10 MB.');
    const session = sessionIdRef.current;
    const context = new AudioContext();
    let seconds: number;
    try { seconds = (await context.decodeAudioData(await blob.arrayBuffer())).duration; }
    finally { await context.close(); }
    if (session !== sessionIdRef.current) throw new Error('Phiên đã được đặt lại.');
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) throw new Error('Bản ghi phải có thời lượng tối đa 10 phút.');
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob));
    setElapsedSeconds(seconds); setRawDurationSeconds(seconds); setPausedDurationSeconds(0);
    return seconds;
  };

  return {
    isRecording,
    isPaused,
    isSupportedSTT,
    recognitionStatus,
    audioBlob,
    audioUrl,
    volumeLevel,
    isLowVolumeWarning,
    micError,
    elapsedSeconds,
    rawDurationSeconds,
    pausedDurationSeconds,
    finalTranscript,
    interimTranscript,
    setFinalTranscript: (text: string) => {
      finalTranscriptRef.current = text;
      setFinalTranscript(text);
    },
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    loadRecording,
  };
}
