'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Package, 
  History, 
  Bell, 
  User, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Calculator,
  ClipboardList,
  MessageCircle
} from 'lucide-react';
import { useState } from 'react';
import ChatWidget from './ChatWidget';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const navigation = [
    { name: 'แดชบอร์ด', href: '/dashboard', icon: LayoutDashboard, description: 'ภาพรวมระบบ' },
    { name: 'จองคิว', href: '/bookings/new', icon: Calendar, description: 'จองคิวซ่อมใหม่' },
    { name: 'ประเมินราคา', href: '/estimate', icon: Calculator, description: 'เช็คราคาอะไหล่' },
    ...(user?.role === 'admin' ? [{ name: 'จัดการการจอง', href: '/admin/bookings', icon: ClipboardList, description: 'จัดการการจองทั้งหมด' }] : []),
    ...(user?.role !== 'customer' ? [{ name: 'อะไหล่', href: '/parts', icon: Package, description: 'คลังอะไหล่' }] : []),
    { name: 'ประวัติ', href: '/history', icon: History, description: 'ประวัติการซ่อม' },
  ];

  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white shadow-2xl transform transition-all duration-300 ease-out border-r border-gray-100 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
      `}>
        {/* Toggle Button (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden lg:flex absolute -right-3 top-24 z-50 bg-white border border-gray-100 rounded-full p-1.5 shadow-md text-gray-500 hover:text-primary-600 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Logo Header */}
        <div className={`flex items-center h-20 bg-gradient-to-r from-primary-600 to-primary-500 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
          <Link href="/dashboard" className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`} prefetch={false}>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0 overflow-hidden">
              <img src="/images/Gemini_Generated_Image_7ak9wd7ak9wd7ak9.png" alt="MotoService Logo" className="w-full h-full object-cover" />
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <span className="text-xl font-bold text-white whitespace-nowrap">MotoService</span>
              <p className="text-xs text-primary-100 whitespace-nowrap">ระบบจัดการศูนย์ซ่อม</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-white/80 hover:text-white lg:hidden transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                prefetch={false}
                className={`group flex items-center gap-3 py-3.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 text-primary-700 shadow-sm border border-primary-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                } ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
                title={isCollapsed ? item.name : ''}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                  isActive ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-gray-100 text-gray-500 group-hover:bg-primary-100 group-hover:text-primary-600'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`flex-1 transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
                  <span className="font-semibold text-sm whitespace-nowrap">{item.name}</span>
                  <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{item.description}</p>
                </div>
                {isActive && !isCollapsed && <ChevronRight className="w-4 h-4 text-primary-500 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={logout}
            className={`flex items-center w-full gap-3 py-3.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors group ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
            title={isCollapsed ? 'ออกจากระบบ' : ''}
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 group-hover:bg-red-200 transition-colors">
              <LogOut className="w-5 h-5" />
            </div>
            <span className={`font-semibold transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`min-h-screen flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-gray-200/50">
          <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-3 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4 ml-auto">
              {/* AI Chatbot Icon */}
              <button 
                className={`p-3 rounded-xl transition-all relative ${
                  isChatOpen 
                    ? 'bg-primary-100 text-primary-600' 
                    : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                }`}
                title="AI Assistant"
                onClick={() => setIsChatOpen(!isChatOpen)}
              >
                <MessageCircle className="w-5 h-5" />
              </button>

              {/* Notification Bell */}
              <Link href="/notifications" className="p-3 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-white"></span>
              </Link>
              
              {/* User Profile */}
              <Link href="/profile" className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:opacity-80 transition-opacity cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.profile?.firstName || user?.username}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role === 'customer' ? 'ลูกค้า' : user?.role === 'admin' ? 'ผู้ดูแล' : 'ช่างซ่อม'}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/30">
                  {(user?.profile?.firstName?.[0] || user?.username?.[0])?.toUpperCase()}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
