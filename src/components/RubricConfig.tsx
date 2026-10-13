import React from 'react';
import { GradeRubric } from '../types';
import { GRADE3_RUBRIC, GRADE3_CRITERIA } from '../utils/db';
export const RubricConfig: React.FC<{ rubrics: GradeRubric[]; onSaveRubric: (rubric: GradeRubric) => Promise<void> }> = ({ onSaveRubric }) => (
  <section className="bg-white p-6 rounded-xl border space-y-4">
    <h2 className="text-xl font-bold text-blue-900">Phiếu quan sát đọc to – LỚP 3 – Tổng 4 điểm</h2>
    <p>Theo phiếu do giáo viên cung cấp: đọc thành tiếng 3 điểm, trả lời câu hỏi 1 điểm.</p>
    <div className="overflow-x-auto"><table className="w-full border-collapse text-left"><thead><tr><th className="border p-3">Phần</th><th className="border p-3">Tiêu chí</th><th className="border p-3">Tối đa</th></tr></thead><tbody>{GRADE3_CRITERIA.map(c=><tr key={c.key}><td className="border p-3">{c.section==='reading'?'Đọc thành tiếng':'Trả lời câu hỏi'}</td><td className="border p-3">{c.label}</td><td className="border p-3">{c.max.toLocaleString('vi-VN')} điểm</td></tr>)}</tbody></table></div>
    <p className="p-3 bg-blue-50 rounded">Đọc đúng và đủ nội dung: 0 lỗi = 1,5; 1–2 lỗi = 1,25; 3–4 lỗi = 1; 5–6 lỗi = 0,75; 7–8 lỗi = 0,5; 9–10 lỗi = 0,25; từ 11 lỗi = 0 điểm. Chỉ tính lỗi giáo viên đã xác nhận.</p>
    <p>70–80 tiếng/phút là mốc trên phiếu. Giáo viên chấm mục tốc độ sau khi quan sát; ứng dụng không tự cho 0 điểm khi đọc trên 80 tiếng/phút. Các mục quan sát và trả lời câu hỏi không tự chấm bằng bản nhận dạng.</p>
    <button className="px-4 py-2 rounded bg-blue-700 text-white" onClick={()=>onSaveRubric({...GRADE3_RUBRIC})}>Lưu bộ tiêu chí lớp 3 này</button>
  </section>
);

// Cập nhật theo phiếu giáo viên ngày 13/10/2026.
