import React from 'react';
import { BookOpen, Users, ClipboardCheck, History, Sliders, Database, Beaker, HelpCircle } from 'lucide-react';

export type ActiveTab = 
  | 'test' 
  | 'students' 
  | 'passages' 
  | 'history' 
  | 'rubrics' 
  | 'backup' 
  | 'sandbox' 
  | 'guide';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingReviewCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingReviewCount = 0,
}) => {
  interface NavItem {
    id: ActiveTab;
    label: string;
    icon: any;
    badge?: number;
  }

  const navItems: NavItem[] = [
    { id: 'test', label: 'Kiểm tra đọc', icon: ClipboardCheck },
    { id: 'students', label: 'Học sinh', icon: Users },
    { id: 'passages', label: 'Thư viện bài đọc', icon: BookOpen },
    { id: 'history', label: 'Lịch sử & Kết quả', icon: History, badge: pendingReviewCount },
    { id: 'rubrics', label: 'Tiêu chí theo khối', icon: Sliders },
    { id: 'backup', label: 'Sao lưu & Dữ liệu', icon: Database },
    { id: 'sandbox', label: 'Kiểm thử thuật toán & Mic', icon: Beaker },
    { id: 'guide', label: 'Hướng dẫn & Bảo mật', icon: HelpCircle },
  ];

  return (
    <header className="no-print app-header bg-white border-b border-blue-100 shadow-sm">
      {/* Top Pedagogical Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white px-4 py-1.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-1 text-sm">
          <div className="flex items-center space-x-2">
            <span className="font-semibold tracking-wide uppercase text-blue-100 text-xs md:text-sm">
              Trường Tiểu học Đinh Bộ Lĩnh
            </span>
            <span className="text-blue-300">·</span>
            <span className="text-blue-200 text-xs md:text-sm">
              Phường Rạch Giá, tỉnh An Giang
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs md:text-sm text-blue-100">
            <span>Tác giả: <strong className="text-white font-medium">Cô Trương Kim Thoại</strong></span>
            <span className="text-blue-400">|</span>
            <span className="bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded text-xs border border-blue-400/30">
              Lưu trữ cục bộ an toàn
            </span>
          </div>
        </div>
      </div>

      {/* Main Title and Navigation */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2 gap-2 border-b border-slate-100">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-blue-950 tracking-tight flex items-center gap-2">
              <span className="bg-blue-600 text-white p-1.5 rounded-lg inline-flex">
                <BookOpen className="w-5 h-5" />
              </span>
              ỨNG DỤNG KIỂM TRA ĐỌC TO LỚP 3
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống hỗ trợ giáo viên đánh giá tốc độ đọc, phát hiện lỗi phát âm & in phiếu A4 chuẩn sư phạm
            </p>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <nav className="app-nav flex items-center gap-1 overflow-x-auto py-1.5" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-800 shadow-sm border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="ml-1 bg-amber-500 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

// Cập nhật theo phiếu giáo viên ngày 13/10/2026.
