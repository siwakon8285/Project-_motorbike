'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
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

const REQUEST_TIMEOUT = process.env.NODE_ENV === 'production' ? 60000 : 5000;

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

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const res = await axios.get('/api/dashboard', {
        headers: {
          'x-auth-token': token
        },
        timeout: REQUEST_TIMEOUT
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
  }, [user?.role]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStats();
    }
  }, [authLoading, user, fetchStats]);

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
      <div className="space-y-6 animate-fade-in relative min-h-screen">
        {/* Background Image */}
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: 'url("/images/Gemini_Generated_Image_7ak9wd7ak9wd7ak9.png")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: 'contain' 
          }}
        />
        
        <div className="relative z-10 space-y-6">
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

          {['admin', 'mechanic'].includes(user?.role || '') ? (
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

                <div className="card p-5 border-l-4 border-purple-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                   <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">สินค้าใกล้หมด</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.stats?.lowStockItems || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shadow-sm">
                      <Package className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-5 border-l-4 border-teal-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">เติบโต</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">+12%</p>
                    </div>
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Bookings Table */}
              <div className="card overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary-500" />
                    การจองล่าสุด
                  </h3>
                  <Link href="/admin/bookings" className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline">
                    ดูทั้งหมด
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ลูกค้า</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">รถ</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">วันที่</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ราคา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats?.recentBookings?.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <Users className="w-4 h-4 text-gray-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{booking.first_name} {booking.last_name}</p>
                                <p className="text-xs text-gray-500">{booking.phone || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Bike className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{booking.vehicle_license_plate}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {format(new Date(booking.booking_date), 'd MMM yyyy', { locale: th })}
                            </div>
                            <div className="text-xs text-gray-500">{booking.booking_time.slice(0, 5)} น.</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                              {getStatusText(booking.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(booking.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
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

              {/* Recent Bookings Table (Customer) */}
              <div className="card overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary-500" />
                    การจองล่าสุด
                  </h3>
                  <Link href="/my-bookings" className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline">
                    ดูทั้งหมด
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ลูกค้า</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">รถ</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">วันที่</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ราคา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customerStats?.recentHistory?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            ไม่มีประวัติการจอง
                          </td>
                        </tr>
                      ) : (
                        customerStats?.recentHistory?.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-gray-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{user?.profile?.firstName || user?.username}</p>
                                  <p className="text-xs text-gray-500">{user?.profile?.phone || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Bike className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{booking.vehicle_license_plate || booking.vehicle_model || '-'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {format(new Date(booking.booking_date), 'd MMM yyyy', { locale: th })}
                              </div>
                              <div className="text-xs text-gray-500">{booking.booking_time.slice(0, 5)} น.</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                                {getStatusText(booking.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(booking.total_price)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
