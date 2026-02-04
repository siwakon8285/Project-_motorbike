'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children, allowedRoles = [] }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTimeout(true), 3000); // Show help after 3s
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
        {showTimeout && (
            <div className="flex flex-col items-center gap-2">
                <p className="text-red-500 text-sm">ใช้เวลานานผิดปกติ</p>
                <button 
                    onClick={() => {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                    }}
                    className="px-4 py-2 bg-white border border-red-500 text-red-500 rounded hover:bg-red-50 transition-colors"
                >
                    ยกเลิกและกลับหน้าล็อกอิน
                </button>
            </div>
        )}
      </div>
    );
  }

  if (!user) return null;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
