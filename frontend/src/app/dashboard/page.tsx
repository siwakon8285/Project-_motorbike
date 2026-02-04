'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'react-hot-toast'; 
import {
  DollarSign, 
  Wrench, 
  Package, 
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Bike,
  RefreshCcw,
  AlertCircle,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  stats: {
    totalBookings: number;
    todayBookings: number;
    pendingBookings: number;
    totalCustomers: number;
    monthlyRevenue: number;
    lowStockItems: number;
  };
  recentBookings: any[];
}

interface CustomerStats {
  stats: {
    totalBookings: number;
    upcomingServices: number;
    completedServices: number;
    totalSpent: number;
  };
  recentHistory: any[];
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const res = await axios.get('/api/dashboard', {
        headers: {
          'x-auth-token': token
        },
        timeout: 5000
      });
      
      if (user?.role === 'customer') {
        setCustomerStats(res.data);
      } else {
        setStats(res.data);
      }
    } catch (err: any) {
      // console.error('Dashboard fetch error:', err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchStats();
    }
  }, [authLoading, user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      in_progress: 'กำลังซ่อม',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
    <ProtectedRoute>
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-48 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>

        <div className="h-64 bg-gray-200 rounded-2xl"></div>
      </div>
    </ProtectedRoute>
  );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">เกิดข้อผิดพลาด</h3>
          <p className="text-gray-500 max-w-md">{error}</p>
          <button
            onClick={fetchStats}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6 animate-fade-in">
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                สวัสดี, {user?.profile?.firstName || user?.username}!
              </h1>
              <p className="text-gray-500 mt-1">
                {user?.role === 'customer' 
                  ? 'นี่คือภาพรวมการใช้บริการของคุณ' 
                  : 'นี่คือภาพรวมของระบบวันนี้'}
              </p>
            </div>
            <Link
              href="/estimate"
              prefetch={false}
              className="btn btn-primary inline-flex items-center gap-2 self-start"
            >
              <Plus className="w-4 h-4" />
              จองคิวใหม่
            </Link>
          </div>

          {user?.role === 'customer' ? (
            // Customer Dashboard
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-6 border-l-4 border-primary-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">การจองทั้งหมด</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {customerStats?.stats?.totalBookings || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center shadow-sm">
                      <Calendar className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-6 border-l-4 border-accent-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">นัดหมายเร็วๆ นี้</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {customerStats?.stats?.upcomingServices || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-accent-50 rounded-2xl flex items-center justify-center shadow-sm">
                      <Clock className="w-6 h-6 text-accent-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-6 border-l-4 border-green-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">บริการที่เสร็จสิ้น</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {customerStats?.stats?.completedServices || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center shadow-sm">
                      <Wrench className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-6 border-l-4 border-blue-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">ยอดใช้จ่ายรวม</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {formatCurrency(customerStats?.stats?.totalSpent || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Admin/Mechanic Dashboard
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="card p-5 border-l-4 border-primary-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">จองวันนี้</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.stats?.todayBookings || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shadow-sm">
                      <Calendar className="w-5 h-5 text-primary-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-5 border-l-4 border-yellow-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">รอดำเนินการ</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.stats?.pendingBookings || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center shadow-sm">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-5 border-l-4 border-green-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">รายได้เดือนนี้</p>
                      <p className="text-lg font-bold text-gray-900 mt-2">{formatCurrency(stats?.stats?.monthlyRevenue || 0)}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shadow-sm">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-5 border-l-4 border-blue-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">ลูกค้าทั้งหมด</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.stats?.totalCustomers || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shadow-sm">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-5 border-l-4 border-red-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">อะไหล่ใกล้หมด</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.stats?.lowStockItems || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shadow-sm">
                      <Package className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-5 border-l-4 border-purple-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">จองทั้งหมด</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.stats?.totalBookings || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="card hover:shadow-lg transition-all duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">การจองล่าสุด</h3>
                  <Link href="/bookings" prefetch={false} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                    ดูทั้งหมด <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="p-6">
                  {stats?.recentBookings?.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      ยังไม่มีการจอง
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stats?.recentBookings?.slice(0, 5).map((booking: any) => (
                        <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{booking.username}</p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(booking.booking_date), 'dd MMM yyyy', { locale: th })} · {booking.booking_time.substring(0, 5)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(booking.total_price)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                              {getStatusText(booking.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </ProtectedRoute>
    );
  }

