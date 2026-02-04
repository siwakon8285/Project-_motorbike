'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { format, addDays, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { Calendar, Clock, Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function Bookings() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      params.append('date', format(selectedDate, 'yyyy-MM-dd'));
      
      const url = user?.role === 'customer' 
        ? '/api/bookings/my-bookings' 
        : `/api/bookings?${params.toString()}`;
      
      const res = await axios.get(url);
      setBookings(res.data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลการจองได้');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, selectedDate, user?.role]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchBookings();
    }
  }, [authLoading, user, fetchBookings]);

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await axios.put(`/api/bookings/${bookingId}/status`, { status });
      toast.success('อัปเดตสถานะการจองเรียบร้อยแล้ว');
      fetchBookings();
    } catch (err) {
      toast.error('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    };
    return texts[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      booking.vehicle_brand?.toLowerCase().includes(search) ||
      booking.vehicle_model?.toLowerCase().includes(search) ||
      booking.username?.toLowerCase().includes(search)
    );
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 3));

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">การจองคิว</h1>
              <p className="text-sm text-gray-500 mt-1">จัดการการจองคิวรับบริการ</p>
            </div>
            <Link
              href="/estimate"
              prefetch={false}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              จองคิวใหม่
            </Link>
          </div>

          {/* Calendar Navigation */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-medium">
                {format(selectedDate, 'MMMM yyyy', { locale: th })}
              </span>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    isSameDay(date, selectedDate)
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <p className="text-xs uppercase">{format(date, 'EEE', { locale: th })}</p>
                  <p className="text-lg font-bold">{format(date, 'd')}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ค้นหาการจอง..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">สถานะทั้งหมด</option>
                <option value="pending">รอดำเนินการ</option>
                <option value="confirmed">ยืนยันแล้ว</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>
          </div>

          {/* Bookings List */}
          <div className="bg-white rounded-lg shadow">
            <div className="divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>ไม่พบการจองสำหรับวันนี้</p>
                </div>
              ) : (
                filteredBookings.map((booking) => (
                  <div key={booking.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-6 h-6 text-primary-600" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {booking.vehicle_brand} {booking.vehicle_model}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                              {getStatusText(booking.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {booking.customer?.username || 'คุณ'} • {format(new Date(booking.booking_date || booking.bookingDate), 'd MMM yyyy', { locale: th })} เวลา {booking.timeSlot || booking.booking_time}
                          </p>
                          {/* Services list removed */}
                          <p className="text-sm text-gray-900 mt-2 font-medium">
                            รวม: ฿{(booking.total_price || booking.totalPrice)?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user?.role !== 'customer' && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                          <>
                            {booking.status === 'pending' && (
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                              >
                                ยืนยัน
                              </button>
                            )}
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                                className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200"
                              >
                                เริ่มงาน
                              </button>
                            )}
                            {booking.status === 'in_progress' && (
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'completed')}
                                className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                              >
                                เสร็จสิ้น
                              </button>
                            )}
                          </>
                        )}
                        {user?.role === 'customer' && booking.status === 'pending' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
      </div>
    </ProtectedRoute>
  );
}
