import React from 'react';
import { 
  HelpCircle, ShieldCheck, Heart, AlertTriangle, BookOpen, Mic, 
  CheckCircle2, Users, FileText, Check 
} from 'lucide-react';

export const PedagogicalGuide: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner giới thiệu */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 rounded-2xl shadow-sm space-y-2">
        <span className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
          Sáng kiến kinh nghiệm dạy học Tiểu học
        </span>
        <h2 className="text-xl md:text-2xl font-bold">
          ỨNG DỤNG KIỂM TRA ĐỌC TO LỚP 3
        </h2>
        <p className="text-sm text-blue-100 leading-relaxed">
          Tác giả: <strong>Cô Trương Kim Thoại</strong> · Trường Tiểu học Đinh Bộ Lĩnh, phường Rạch Giá, tỉnh An Giang.
        </p>
      </div>

      {/* 1. Hướng dẫn quy trình 4 bước kiểm tra */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Quy trình 4 Bước Đánh giá Đọc Chuẩn mực Sư phạm
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-xs">
              1
            </span>
            <h4 className="font-bold text-slate-900">Chuẩn bị Học sinh & Bài đọc</h4>
            <p className="text-slate-600 leading-relaxed">
              Chọn đúng học sinh trong danh sách và chọn bài đọc phù hợp với khối lớp (Khối 1 đến 5). Tạo tâm lý thoải mái, tự tin cho học sinh trước khi đọc bài.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-xs">
              2
            </span>
            <h4 className="font-bold text-slate-900">Thu âm & Đo Tốc độ Thực tế</h4>
            <p className="text-slate-600 leading-relaxed">
              Bấm "Bắt đầu đọc". Hệ thống tự động kích hoạt đồng hồ chuẩn xác <code className="text-blue-700 font-mono">performance.now</code> và công nghệ thu âm. Nếu học sinh bị gián đoạn, giáo viên có thể bấm "Tạm dừng" (thời gian tạm dừng sẽ được tự động loại trừ khỏi kết quả).
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-xs">
              3
            </span>
            <h4 className="font-bold text-slate-900">Đối soát Căn chỉnh Sư phạm</h4>
            <p className="text-slate-600 leading-relaxed">
              Thuật toán Needleman-Wunsch sẽ so sánh từng âm tiết. Giáo viên bấm vào các từ để xem lại hoặc điều chỉnh (Đúng, Sai, Bỏ sót, Thêm) theo thực tế âm thanh phát ra từ học sinh.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-xs">
              4
            </span>
            <h4 className="font-bold text-slate-900">Chấm điểm, Nhận xét & In Phiếu A4</h4>
            <p className="text-slate-600 leading-relaxed">
              Chấm thêm các điểm ngắt nghỉ dấu câu, diễn cảm, tư thế. Ghi nhận xét tích cực, xây dựng. Phê duyệt điểm cuối cùng và in phiếu kết quả A4 lưu vào học bạ hoặc gửi phụ huynh.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Giới hạn của công nghệ Speech Recognition đối với trẻ em tiểu học */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Hiểu rõ Giới hạn Công nghệ Nhận dạng Giọng nói (STT) đối với Học sinh Tiểu học
        </h3>

        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs md:text-sm text-slate-700 space-y-3 leading-relaxed">
          <p>
            Các mô hình nhận dạng giọng nói tự động hiện nay được huấn luyện chủ yếu trên giọng nói của người trưởng thành. Đối với học sinh tiểu học (đặc biệt là học sinh lớp 1, lớp 2), công nghệ STT thường gặp các giới hạn khách quan:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-800">
            <li>
              <strong>Đặc điểm âm học lứa tuổi:</strong> Dây thanh quản của trẻ nhỏ còn ngắn, tần số cơ bản (F0) cao, âm lượng thường dao động lớn hoặc các em phát âm nhỏ/ngập ngừng.
            </li>
            <li>
              <strong>Phương ngữ địa phương:</strong> Học sinh vùng Tây Nam Bộ (An Giang, Rạch Giá...) có các đặc trưng ngữ âm phương ngữ Nam Bộ rất tự nhiên (như phân biệt hỏi/ngã, âm cuối -n/-ng, -t/-c, r/g...). Máy móc có thể chưa nhận dạng đúng ngữ âm này.
            </li>
            <li>
              <strong>Nguyên tắc vàng:</strong> <em>"Máy móc chỉ là trợ lý gợi ý ban đầu – Giáo viên mới là người quyết định cuối cùng."</em> Không bao giờ khẳng định kết quả máy nhận diện sai là lỗi của học sinh khi giáo viên chưa trực tiếp kiểm chứng lại.
            </li>
          </ul>
        </div>
      </div>

      {/* 3. Cam kết Bảo mật & Quyền riêng tư Học sinh */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          Bảo vệ Quyền riêng tư & An toàn Dữ liệu Trẻ em
        </h3>

        <div className="space-y-3 text-xs md:text-sm text-slate-600 leading-relaxed">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Lưu trữ Dữ liệu Cục bộ trên máy tính (Local-First):</strong>
              <p>Mọi thông tin học sinh, bài đọc, kết quả điểm số và nhật ký kiểm toán đều được lưu trực tiếp trong cơ sở dữ liệu IndexedDB của trình duyệt máy tính thầy cô.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Minh bạch về Nhận dạng giọng nói (Web Speech API):</strong>
              <p>Trình duyệt Chrome khi dùng Web Speech API có thể gửi dữ liệu âm thanh đến máy chủ của Google để xử lý nhận diện tiếng Việt. Vì vậy, ứng dụng <strong>mặc định TẮT tính năng này</strong> và yêu cầu giáo viên chủ động tích chọn đồng ý trước khi bật. Khi không bật, tính năng ghi âm cục bộ (MediaRecorder) và nhập bản chép tay vẫn hoạt động trọn vẹn 100% hoàn toàn nội bộ trên máy tính của thầy cô.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Độc lập, không chi phí:</strong>
              <p>Toàn bộ chức năng cốt lõi hoạt động không yêu cầu tài khoản trả phí, không chi phí duy trì, hoạt động mượt mà và an toàn cho học sinh.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
