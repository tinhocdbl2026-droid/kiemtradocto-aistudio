/**
 * Thuật toán Căn chỉnh Chuỗi Âm tiết Tiếng Việt (Needleman-Wunsch / Levenshtein DP Backtracking)
 * Đảm bảo:
 * 1. Bỏ một token ở giữa không làm lệch sai hàng loạt các từ phía sau.
 * 2. Phân loại đúng/thay thế/bỏ sót/thêm/lặp từ chuẩn xác.
 * 3. Repetition được phát hiện dựa trên các token đọc kề nhau (adjacent spoken tokens) và là tập con của insertions, không cộng đôi.
 * 4. Giữ nguyên dấu thanh và chữ gốc tiếng Việt, chỉ bỏ dấu câu khi so sánh.
 * 5. Không bao giờ chia cho số <= 0.
 */

import { AlignmentToken, AlignmentType, TestMetrics } from '../types';

/**
 * Danh sách dấu câu tiếng Việt và ký tự đặc biệt cần loại bỏ khi so sánh âm tiết
 */
const PUNCTUATION_REGEX = /[.,;:!?—–\-"'()[\]{}«»“”„…/\\*#@$%^&_+=<>~`]/g;

/**
 * Chuẩn hóa âm tiết tiếng Việt để so sánh:
 * - Chuẩn hóa Unicode NFC
 * - Bỏ dấu câu ngoại vi
 * - Chuyển chữ thường
 * - GIỮ NGUYÊN 100% các ký tự tiếng Việt có dấu: á, à, ả, ã, ạ, ă, â, đ, ê, ô, ơ, ư,...
 */
export function cleanVietnameseToken(token: string): string {
  if (!token) return '';
  return token
    .normalize('NFC')
    .replace(PUNCTUATION_REGEX, '')
    .trim()
    .toLowerCase();
}

/**
 * Tách văn bản thành danh sách đơn vị âm tiết (phân cách bởi khoảng trắng)
 * Giải thích: Đơn vị đếm là âm tiết (tiếng), không phân đoạn từ ghép/từ phức.
 */
export function tokenizeVietnameseText(text: string): string[] {
  if (!text) return [];
  const normalized = text.normalize('NFC').trim();
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(t => t.length > 0);
}

/**
 * Đếm số đơn vị âm tiết
 */
export function countVietnameseSyllables(text: string): number {
  return tokenizeVietnameseText(text).length;
}

/**
 * Căn chỉnh chuỗi âm tiết giữa Bài đọc gốc (Original) và Bản nhận dạng/chép đọc (Spoken)
 * Sử dụng thuật toán quy hoạch động Levenshtein / Needleman-Wunsch với Backtracking
 */
export function alignSyllables(
  originalText: string,
  spokenText: string
): AlignmentToken[] {
  const originalTokens = tokenizeVietnameseText(originalText);
  const spokenTokens = tokenizeVietnameseText(spokenText);

  const n = originalTokens.length;
  const m = spokenTokens.length;

  if (n === 0 && m === 0) return [];

  const cleanOriginal = originalTokens.map(cleanVietnameseToken);
  const cleanSpoken = spokenTokens.map(cleanVietnameseToken);

  // Trường hợp bài đọc có nội dung nhưng học sinh chưa đọc gì
  if (m === 0) {
    return originalTokens.map((orig, idx) => ({
      id: `token-del-${idx}-${Date.now()}`,
      originalToken: orig,
      cleanOriginal: cleanOriginal[idx],
      type: 'deletion',
      isRepetition: false,
    }));
  }

  // Trường hợp bài đọc rỗng nhưng học sinh có nói
  if (n === 0) {
    return spokenTokens.map((spk, idx) => ({
      id: `token-ins-${idx}-${Date.now()}`,
      spokenToken: spk,
      cleanSpoken: cleanSpoken[idx],
      type: 'insertion',
      isRepetition: idx > 0 && cleanSpoken[idx] === cleanSpoken[idx - 1],
    }));
  }

  // Bảng DP
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );

  for (let i = 0; i <= n; i++) {
    dp[i][0] = i * 2;
  }
  for (let j = 0; j <= m; j++) {
    dp[0][j] = j * 2;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const matchCost = cleanOriginal[i - 1] === cleanSpoken[j - 1] ? 0 : 2;
      const subCost = dp[i - 1][j - 1] + matchCost;
      const delCost = dp[i - 1][j] + 2;
      const insCost = dp[i][j - 1] + 2;

      dp[i][j] = Math.min(subCost, delCost, insCost);
    }
  }

  // Backtracking
  const result: AlignmentToken[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const isExact = cleanOriginal[i - 1] === cleanSpoken[j - 1];
      const matchCost = isExact ? 0 : 2;

      if (dp[i][j] === dp[i - 1][j - 1] + matchCost) {
        result.unshift({
          id: `token-${i - 1}-${j - 1}`,
          originalToken: originalTokens[i - 1],
          spokenToken: spokenTokens[j - 1],
          cleanOriginal: cleanOriginal[i - 1],
          cleanSpoken: cleanSpoken[j - 1],
          type: isExact ? 'match' : 'substitution',
          isRepetition: false,
        });
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + 2) {
      result.unshift({
        id: `token-del-${i - 1}`,
        originalToken: originalTokens[i - 1],
        cleanOriginal: cleanOriginal[i - 1],
        type: 'deletion',
        isRepetition: false,
      });
      i--;
      continue;
    }

    if (j > 0 && dp[i][j] === dp[i][j - 1] + 2) {
      result.unshift({
        id: `token-ins-${j - 1}`,
        spokenToken: spokenTokens[j - 1],
        cleanSpoken: cleanSpoken[j - 1],
        type: 'insertion',
        isRepetition: false,
      });
      j--;
      continue;
    }

    if (i > 0 && j > 0) {
      result.unshift({
        id: `token-sub-${i - 1}-${j - 1}`,
        originalToken: originalTokens[i - 1],
        spokenToken: spokenTokens[j - 1],
        cleanOriginal: cleanOriginal[i - 1],
        cleanSpoken: cleanSpoken[j - 1],
        type: 'substitution',
        isRepetition: false,
      });
      i--;
      j--;
    } else if (i > 0) {
      result.unshift({
        id: `token-del-${i - 1}`,
        originalToken: originalTokens[i - 1],
        cleanOriginal: cleanOriginal[i - 1],
        type: 'deletion',
        isRepetition: false,
      });
      i--;
    } else if (j > 0) {
      result.unshift({
        id: `token-ins-${j - 1}`,
        spokenToken: spokenTokens[j - 1],
        cleanSpoken: cleanSpoken[j - 1],
        type: 'insertion',
        isRepetition: false,
      });
      j--;
    }
  }

  // PHÁT HIỆN REPETITION DỰA TRÊN CÁC TOKEN ĐỌC KỀ NHAU (ADJACENT SPOKEN TOKENS)
  // Lấy danh sách các token trong chuỗi lời đọc học sinh theo thứ tự phát âm
  const spokenItems = result.filter(item => Boolean(item.spokenToken));

  for (let k = 0; k < spokenItems.length; k++) {
    const item = spokenItems[k];
    // Chỉ xét các token chêm thêm (insertion)
    if (item.type === 'insertion') {
      const prevSpoken = k > 0 ? spokenItems[k - 1].cleanSpoken : null;
      const nextSpoken = k < spokenItems.length - 1 ? spokenItems[k + 1].cleanSpoken : null;

      // Nếu token chêm thêm này trùng âm tiết với token đọc liền trước hoặc liền sau nó
      if (item.cleanSpoken && (item.cleanSpoken === prevSpoken || item.cleanSpoken === nextSpoken)) {
        item.isRepetition = true;
        item.type = 'repetition';
      }
    }
  }

  return result;
}

/**
 * Tính toán các chỉ số thống kê đọc
 * Chú ý: repetition là tập con của insertion, KHÔNG cộng đôi!
 */
export function calculateMetrics(
  tokens: AlignmentToken[],
  actualDurationSeconds: number
): TestMetrics {
  let matchCount = 0;
  let substitutionCount = 0;
  let deletionCount = 0;
  let insertionCount = 0;
  let repetitionCount = 0;

  for (const t of tokens) {
    if (t.type === 'match') {
      matchCount++;
    } else if (t.type === 'substitution') {
      substitutionCount++;
    } else if (t.type === 'deletion') {
      deletionCount++;
    } else if (t.type === 'insertion' || t.type === 'repetition') {
      // Repetition là tập con của insertion
      insertionCount++;
      if (t.type === 'repetition' || t.isRepetition) {
        repetitionCount++;
      }
    }
  }

  // Tổng số âm tiết của bài đọc = số từ gốc (match + substitution + deletion)
  const totalPassageTokens = matchCount + substitutionCount + deletionCount;
  
  // Tổng số âm tiết học sinh đã đọc = match + substitution + insertion
  // TUYỆT ĐỐI KHÔNG cộng thêm repetitionCount vì repetitionCount đã nằm trong insertionCount!
  const totalSpokenTokens = matchCount + substitutionCount + insertionCount;

  // Tính tốc độ đọc (WPM - Words/Syllables Per Minute)
  // Xử lý chặt chẽ: thời gian <= 0 tuyệt đối không chia!
  const isSpeedValid = actualDurationSeconds > 0;
  const totalSpeedWpm = isSpeedValid
    ? Math.round((totalSpokenTokens * 60) / actualDurationSeconds)
    : 0;

  const accuracySpeedWpm = isSpeedValid
    ? Math.round((matchCount * 60) / actualDurationSeconds)
    : 0;

  return {
    totalPassageTokens,
    totalSpokenTokens,
    matchCount,
    substitutionCount,
    deletionCount,
    insertionCount,
    repetitionCount,
    totalSpeedWpm,
    accuracySpeedWpm,
    isSpeedValid,
  };
}

/**
 * Tính điểm đề xuất của hệ thống dựa trên số lỗi và các tiêu chí đã chấm
 * Không tự cộng điểm cho các tiêu chí ngắt nghỉ/diễn cảm/tư thế khi giáo viên chưa đánh giá.
 */
export function calculateSuggestedScore(
  metrics: TestMetrics,
  accuracyMaxScore: number = 6.0,
  penaltyPerError: number = 0.25,
  manualScores?: { punctuation?: number | null; expression?: number | null; postureVolume?: number | null }
): number {
  const totalErrors = metrics.substitutionCount + metrics.deletionCount;
  const errorPenalty = totalErrors * penaltyPerError;
  const suggestedAccuracy = Math.max(0, Number((accuracyMaxScore - errorPenalty).toFixed(1)));
  
  let manualPoints = 0;
  if (manualScores) {
    if (typeof manualScores.punctuation === 'number') manualPoints += manualScores.punctuation;
    if (typeof manualScores.expression === 'number') manualPoints += manualScores.expression;
    if (typeof manualScores.postureVolume === 'number') manualPoints += manualScores.postureVolume;
  }

  return Number((suggestedAccuracy + manualPoints).toFixed(1));
}

/** Điểm theo phiếu giáo viên: mỗi nhóm 1–2 lỗi thực tế trừ 0,25 điểm. */
export function calculateGrade3Accuracy(teacherConfirmedErrors: number): number {
  if (!Number.isFinite(teacherConfirmedErrors) || teacherConfirmedErrors < 0 || !Number.isInteger(teacherConfirmedErrors)) throw new Error('Số lỗi xác nhận phải là số nguyên không âm.');
  return Math.max(0, 1.5 - Math.ceil(teacherConfirmedErrors / 2) * 0.25);
}

// Cập nhật theo phiếu giáo viên ngày 13/10/2026.
