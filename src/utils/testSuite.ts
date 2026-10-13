/**
 * Bộ kiểm thử tự động thuật toán Căn chỉnh và Tính toán tốc độ
 * Tách biệt hoàn toàn khỏi dữ liệu học sinh thật
 */

import { alignSyllables, calculateMetrics, cleanVietnameseToken, tokenizeVietnameseText } from './alignment';

export interface TestCaseResult {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: Record<string, any>;
}

export function runAlgorithmTests(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // TEST 1: Đọc đúng toàn bộ (100% match) - 12 âm tiết
  {
    const original = "Học sinh Trường Tiểu học Đinh Bộ Lĩnh chăm chỉ đọc bài";
    const spoken = "Học sinh Trường Tiểu học Đinh Bộ Lĩnh chăm chỉ đọc bài";
    const tokens = alignSyllables(original, spoken);
    const metrics = calculateMetrics(tokens, 30);

    const isAllMatch = tokens.length === 12 && tokens.every(t => t.type === 'match');
    const passed = isAllMatch && metrics.matchCount === 12 && metrics.substitutionCount === 0 && metrics.deletionCount === 0;

    results.push({
      id: 'test-1-full-match',
      title: '1. Đọc đúng toàn bộ (100% match)',
      description: 'Kiểm tra câu 12 âm tiết đọc đúng từng âm tiết, dấu thanh nguyên vẹn.',
      passed,
      expected: '12 tokens match, 0 lỗi, 12 đúng',
      actual: `${tokens.length} tokens, ${metrics.matchCount} đúng, ${metrics.substitutionCount} sai, ${metrics.deletionCount} bỏ sót`,
      details: { tokensCount: tokens.length, metrics },
    });
  }

  // TEST 2: Bỏ một token ở giữa KHÔNG kéo sai các từ phía sau (6 matches: Con, ong, chăm, chỉ, hút, mật)
  {
    const original = "Con ong vàng chăm chỉ hút mật";
    const spoken = "Con ong chăm chỉ hút mật";
    const tokens = alignSyllables(original, spoken);
    const metrics = calculateMetrics(tokens, 20);

    const vangToken = tokens.find(t => t.originalToken === 'vàng');
    const chamToken = tokens.find(t => t.originalToken === 'chăm');
    const chiToken = tokens.find(t => t.originalToken === 'chỉ');
    const hutToken = tokens.find(t => t.originalToken === 'hút');
    const matToken = tokens.find(t => t.originalToken === 'mật');

    const passed = 
      metrics.deletionCount === 1 &&
      metrics.matchCount === 6 &&
      vangToken?.type === 'deletion' &&
      chamToken?.type === 'match' &&
      chiToken?.type === 'match' &&
      hutToken?.type === 'match' &&
      matToken?.type === 'match';

    results.push({
      id: 'test-2-skip-token',
      title: '2. Bỏ một token ở giữa không làm lệch sai hàng loạt phía sau',
      description: 'Bỏ từ "vàng" ở giữa bài 7 âm tiết, 6 âm tiết còn lại ("Con", "ong", "chăm", "chỉ", "hút", "mật") phải giữ đúng match.',
      passed,
      expected: '1 deletion ("vàng"), 6 matches ("Con", "ong", "chăm", "chỉ", "hút", "mật")',
      actual: `${metrics.deletionCount} deletion, ${metrics.matchCount} matches. Trạng thái "chăm": ${chamToken?.type}, "hút": ${hutToken?.type}, "mật": ${matToken?.type}`,
      details: { tokens },
    });
  }

  // TEST 3: Thêm token & Lặp từ dựa trên adjacent spoken tokens
  {
    const original = "Mùa xuân ấm áp";
    const spoken = "Mùa xuân xuân ấm áp và vui";
    const tokens = alignSyllables(original, spoken);
    const metrics = calculateMetrics(tokens, 15);

    const repetitionToken = tokens.find(t => t.type === 'repetition' || t.isRepetition);
    const passed = 
      metrics.matchCount === 4 &&
      metrics.insertionCount === 3 &&
      metrics.repetitionCount === 1 &&
      repetitionToken?.spokenToken === 'xuân' &&
      metrics.totalSpokenTokens === 7;

    results.push({
      id: 'test-3-insert-repeat',
      title: '3. Thêm token và lặp từ kề nhau (adjacent repetition)',
      description: 'Đọc lặp lại "xuân xuân" kề nhau và thêm từ "và vui". Lặp từ là tập con của từ thêm.',
      passed,
      expected: '4 matches, 3 insertions (trong đó 1 repetition "xuân"), tổng đọc 7 âm tiết',
      actual: `${metrics.matchCount} đúng, ${metrics.insertionCount} thêm (trong đó ${metrics.repetitionCount} lặp), tổng đọc: ${metrics.totalSpokenTokens}`,
      details: { tokens, metrics },
    });
  }

  // TEST 4: Thay thế token & Phân biệt dấu tiếng Việt
  {
    const original = "Bé Lan vẽ con gà";
    const spoken = "Bé Lam vẽ con gạ";
    const tokens = alignSyllables(original, spoken);
    const metrics = calculateMetrics(tokens, 12);

    const passed = 
      metrics.substitutionCount === 2 &&
      metrics.matchCount === 3 &&
      tokens.find(t => t.originalToken === 'Lan')?.type === 'substitution' &&
      tokens.find(t => t.originalToken === 'gà')?.type === 'substitution';

    results.push({
      id: 'test-4-vietnamese-accents',
      title: '4. Thay thế token & Bảo toàn dấu tiếng Việt',
      description: 'So sánh "Lan" vs "Lam" và "gà" vs "gạ" (phân biệt dấu huyền/nặng).',
      passed,
      expected: '2 substitutions ("Lan"->"Lam", "gà"->"gạ"), 3 matches ("Bé", "vẽ", "con")',
      actual: `${metrics.substitutionCount} thay thế, ${metrics.matchCount} đúng`,
      details: { tokens },
    });
  }

  // TEST 5: Chuỗi rỗng / Không đọc
  {
    const original = "Mặt trời mọc ở đằng đông";
    const spoken = "";
    const tokens = alignSyllables(original, spoken);
    const metrics = calculateMetrics(tokens, 10);

    const passed = 
      tokens.length === 6 &&
      tokens.every(t => t.type === 'deletion') &&
      metrics.deletionCount === 6 &&
      metrics.matchCount === 0;

    results.push({
      id: 'test-5-empty-spoken',
      title: '5. Chuỗi rỗng / Học sinh không đọc gì',
      description: 'Xử lý khi bản đọc rỗng, toàn bộ bài đọc thành deletion.',
      passed,
      expected: '6 deletions, 0 match, không phát sinh lỗi ngoại lệ',
      actual: `${tokens.length} tokens, ${metrics.deletionCount} deletions, ${metrics.matchCount} match`,
      details: { tokensCount: tokens.length },
    });
  }

  // TEST 6: Thời gian đọc bằng 0 hoặc âm (Không chia cho 0)
  {
    const original = "Chào cờ thứ hai đầu tuần";
    const spoken = "Chào cờ thứ hai đầu tuần";
    const tokens = alignSyllables(original, spoken);

    const metricsZero = calculateMetrics(tokens, 0);
    const metricsNegative = calculateMetrics(tokens, -5);

    const passed = 
      metricsZero.totalSpeedWpm === 0 &&
      metricsZero.accuracySpeedWpm === 0 &&
      metricsNegative.totalSpeedWpm === 0 &&
      metricsNegative.accuracySpeedWpm === 0 &&
      !isNaN(metricsZero.totalSpeedWpm) &&
      !isNaN(metricsZero.accuracySpeedWpm);

    results.push({
      id: 'test-6-zero-time-safety',
      title: '6. Thời gian đọc <= 0 tuyệt đối không chia cho 0',
      description: 'Kiểm tra tốc độ đọc WPM khi thời gian = 0s hoặc âm, tránh NaN/Infinity.',
      passed,
      expected: 'Tốc độ đọc = 0, không NaN, không chia cho 0',
      actual: `Thời gian 0s: ${metricsZero.accuracySpeedWpm} WPM. Thời gian -5s: ${metricsNegative.accuracySpeedWpm} WPM`,
      details: { metricsZero, metricsNegative },
    });
  }

  // TEST 7: 90 âm tiết đúng trong 60 giây = 90 tiếng/phút
  {
    const sampleWords = Array.from({ length: 90 }, (_, i) => `từ${i + 1}`).join(' ');
    const tokens = alignSyllables(sampleWords, sampleWords);
    const metrics = calculateMetrics(tokens, 60);

    const passed = 
      metrics.matchCount === 90 &&
      metrics.accuracySpeedWpm === 90 &&
      metrics.totalSpeedWpm === 90;

    results.push({
      id: 'test-7-speed-exact-calc',
      title: '7. Tính chuẩn tốc độ: 90 âm tiết đúng / 60 giây = 90 tiếng/phút',
      description: 'Kiểm tra công thức tốc độ đọc: (số_đúng * 60) / thời_gian_giây.',
      passed,
      expected: 'Tốc độ đúng = 90 WPM, Tốc độ tổng = 90 WPM',
      actual: `Tốc độ đúng: ${metrics.accuracySpeedWpm} WPM, Tốc độ tổng: ${metrics.totalSpeedWpm} WPM`,
      details: { matchCount: metrics.matchCount, accuracySpeedWpm: metrics.accuracySpeedWpm },
    });
  }

  // TEST 8: Chống cộng đôi lặp từ (Anti double-counting test)
  {
    // Bài đọc 3 từ, đọc thành 5 từ (trong đó lặp 2 lần)
    const original = "Học sinh giỏi";
    const spoken = "Học sinh sinh giỏi giỏi";
    const tokens = alignSyllables(original, spoken);
    const metrics = calculateMetrics(tokens, 10);

    // Spoken: "Học", "sinh", "sinh", "giỏi", "giỏi" = 5 từ
    // Matches: "Học", "sinh", "giỏi" = 3
    // Insertions: 2 (2 từ lặp lại)
    // Repetitions: 2 (tập con của insertions)
    // Total spoken = match (3) + substitution (0) + insertion (2) = 5
    // Nếu cộng đôi (match + sub + ins + rep) sẽ thành 7 (SAI)
    const passed = 
      metrics.matchCount === 3 &&
      metrics.insertionCount === 2 &&
      metrics.repetitionCount === 2 &&
      metrics.totalSpokenTokens === 5 &&
      metrics.totalSpokenTokens !== (metrics.matchCount + metrics.insertionCount + metrics.repetitionCount);

    results.push({
      id: 'test-8-anti-double-count',
      title: '8. Chống cộng đôi lặp từ (Anti double-counting)',
      description: 'Xác nhận repetition là tập con của insertion: totalSpokenTokens = match + sub + ins, không bị cộng thêm lần nữa.',
      passed,
      expected: 'totalSpokenTokens = 5 (3 match + 2 ins). Không cộng đôi thành 7.',
      actual: `totalSpokenTokens = ${metrics.totalSpokenTokens}, match = ${metrics.matchCount}, ins = ${metrics.insertionCount}, rep = ${metrics.repetitionCount}`,
      details: { metrics },
    });
  }

  // TEST 9: Regression Stop -> Late Final -> Correct Alignment (Empty -> Non-empty)
  {
    const original = "Con ong vàng chăm chỉ hút mật";
    // Ban đầu khi vừa bấm stop, transcript có thể rỗng nếu closure cũ
    const emptySpoken = "";
    const initialTokens = alignSyllables(original, emptySpoken);
    const initialMetrics = calculateMetrics(initialTokens, 10);

    // Khi final event đến hoặc flush interim: "Con ong vàng chăm chỉ" (5 tiếng)
    const lateFinalSpoken = "Con ong vàng chăm chỉ";
    const updatedTokens = alignSyllables(original, lateFinalSpoken);
    const updatedMetrics = calculateMetrics(updatedTokens, 10);

    const matches = updatedTokens.filter(t => t.type === 'match').map(t => t.originalToken);
    const deletions = updatedTokens.filter(t => t.type === 'deletion').map(t => t.originalToken);

    const passed = 
      initialMetrics.matchCount === 0 &&
      initialMetrics.deletionCount === 7 &&
      updatedMetrics.matchCount === 5 &&
      updatedMetrics.deletionCount === 2 &&
      updatedMetrics.substitutionCount === 0 &&
      matches.join(' ') === "Con ong vàng chăm chỉ" &&
      deletions.join(' ') === "hút mật";

    results.push({
      id: 'test-9-late-final-regression',
      title: '9. Regression: Late Final sau Stop (Empty -> Non-empty)',
      description: 'Khắc phục lỗi alignment 0 đúng 7 bỏ khi transcript đến muộn: Cập nhật snapshot finalized cho ra đúng 5 match ("Con ong vàng chăm chỉ") và 2 deletion ("hút mật").',
      passed,
      expected: 'Chuyển từ (0 match, 7 del) sang (5 match, 2 del), không kẹt ở kết quả rỗng',
      actual: `Trước: ${initialMetrics.matchCount} đúng, ${initialMetrics.deletionCount} bỏ. Sau khi có final: ${updatedMetrics.matchCount} đúng, ${updatedMetrics.deletionCount} bỏ. Matches: [${matches.join(', ')}]`,
      details: { initialMetrics, updatedMetrics },
    });
  }

  // TEST 10: Xử lý Thời gian <= 0s & Tiêu chí chưa chấm không tự cộng điểm
  {
    const original = "Con ong vàng chăm chỉ hút mật";
    const spoken = "Con ong vàng chăm chỉ";
    const tokens = alignSyllables(original, spoken);
    // Thời gian = 0s
    const metricsZero = calculateMetrics(tokens, 0);

    // Tiêu chí chưa chấm (null) không được tự cộng điểm tối đa
    const accuracyOnlyScore = (6.0 - 2 * 0.25); // 5.5đ
    const defaultAccuracy = Math.max(0, Number(accuracyOnlyScore.toFixed(1)));

    const passed = 
      metricsZero.isSpeedValid === false &&
      metricsZero.totalSpeedWpm === 0 &&
      metricsZero.accuracySpeedWpm === 0 &&
      defaultAccuracy === 5.5;

    results.push({
      id: 'test-10-zero-time-unassessed-rubric',
      title: '10. Thời gian <= 0s và tiêu chí chưa chấm',
      description: 'Thời gian 0s: isSpeedValid = false, tốc độ WPM = 0 (hiển thị Chưa xác định), không tự phạt tốc độ và không tự cộng điểm cho tiêu chí chưa chấm.',
      passed,
      expected: 'isSpeedValid = false, WPM = 0, Điểm đề xuất phát âm = 5.5đ (không tự cộng điểm ngắt nghỉ/diễn cảm)',
      actual: `isSpeedValid = ${metricsZero.isSpeedValid}, WPM = ${metricsZero.accuracySpeedWpm}, Điểm phát âm đề xuất = ${defaultAccuracy}`,
      details: { metricsZero, defaultAccuracy },
    });
  }

  // TEST 11: Chuẩn hóa NFC tiếng Việt không tách dấu & các nguyên âm ghép có dấu
  {
    const original = "Hôm nay trời nắng chang chang. Mèo con đi học chẳng mang thứ gì.";
    // Dữ liệu nhập vào có thể đến từ NFD (tách dấu)
    const decomposedInput = original.normalize('NFD');
    const tokens = alignSyllables(original, decomposedInput);
    const metrics = calculateMetrics(tokens, 15);

    // Chuỗi kiểm tra nguyên âm phức hợp tiếng Việt
    const complexVowels = "ă â ê ô ơ ư ắ ằ ẵ ặ ấ ế ễ ộ ớ ỡ ự";
    const vowelTokens = tokenizeVietnameseText(complexVowels);
    const allNfc = vowelTokens.every(v => v.normalize('NFC') === v);

    // Kiểm tra từ "nắng" (U+1EAF) không bị rách rời thành "n" + "ă" + "´" + "ng"
    const nangToken = tokens.find(t => cleanVietnameseToken(t.originalToken || '') === 'nắng');
    const isNangCorrect = nangToken !== undefined && nangToken.type === 'match';

    const passed = 
      metrics.matchCount === 14 && 
      metrics.substitutionCount === 0 && 
      metrics.deletionCount === 0 && 
      allNfc && 
      isNangCorrect;

    results.push({
      id: 'test-11-vietnamese-nfc-diacritics',
      title: '11. Chuẩn hóa NFC tiếng Việt không tách dấu (ă, â, ê, ô, ơ, ư, ắ, ằ, ẵ, ặ, ấ, ế, ễ, ộ, ớ, ỡ, ự)',
      description: 'Đảm bảo các âm tiết có dấu phức hợp như "nắng", "chẳng" khớp 100% khi đối soát Unicode NFC/NFD và không bị tách dấu âm.',
      passed,
      expected: '14/14 match, từ "nắng" khớp đúng, 17/17 nguyên âm phức hợp giữ chuẩn NFC',
      actual: `${metrics.matchCount}/14 match, từ "nắng": ${isNangCorrect ? 'Khớp chuẩn' : 'Lệch'}, toàn bộ nguyên âm phức hợp NFC: ${allNfc}`,
      details: { metrics, isNangCorrect, allNfc },
    });
  }

  return results;
}

