'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  User, 
  Phone, 
  Mail, 
  Bike, 
  Calendar, 
  Clock, 
  Loader2,
  Wrench,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Booking {
  id: number;
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_license_plate: string;
  vehicle_color?: string;
  vehicle_year?: number;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  notes?: string;
  services: {
    id: number;
    name: string;
    price: number;
  }[];
}

export default function AdminBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/bookings');
      setBookings(res.data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลการจองได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      if (['admin', 'mechanic'].includes(user.role)) {
        fetchBookings();
      }
    }
  }, [authLoading, user, fetchBookings]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      setUpdatingId(id);
      await axios.put(`/api/bookings/${id}/status`, { status: newStatus });
      
      // Update local state
      setBookings(prev => prev.map(b => 
        b.id === id ? { ...b, status: newStatus } : b
      ));
      
      toast.success('อัปเดตสถานะเรียบร้อยแล้ว');
    } catch (err) {
      toast.error('ไม่สามารถอัปเดตสถานะได้');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    const matchesSearch = 
      booking.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.vehicle_license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toString().includes(searchTerm);
      
    return matchesStatus && matchesSearch;
  });

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          strip: 'bg-yellow-400',
          select: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:border-yellow-300',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'confirmed':
        return {
          strip: 'bg-blue-500',
          select: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300',
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'in_progress':
        return {
          strip: 'bg-purple-500',
          select: 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-300',
          badge: 'bg-purple-100 text-purple-800'
        };
      case 'completed':
        return {
          strip: 'bg-green-500',
          select: 'bg-green-50 text-green-700 border-green-200 hover:border-green-300',
          badge: 'bg-green-100 text-green-800'
        };
      case 'cancelled':
        return {
          strip: 'bg-red-500',
          select: 'bg-red-50 text-red-700 border-red-200 hover:border-red-300',
          badge: 'bg-red-100 text-red-800'
        };
      default:
        return {
          strip: 'bg-gray-400',
          select: 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300',
          badge: 'bg-gray-100 text-gray-800'
        };
    }
  };

  // Helper to extract parts from notes
  const getDisplayServices = (booking: Booking) => {
    // If we have actual services, return them
    if (booking.services?.length > 0) return booking.services;

    // If no services but we have notes with "Price Estimate" format
    if (booking.notes && booking.notes.includes('รายการอะไหล่ที่เลือกประเมินราคา:')) {
      const match = booking.notes.match(/รายการอะไหล่ที่เลือกประเมินราคา:\s*(.*?)\s*\|/);
      if (match && match[1]) {
        // Create a fake service object for display
        return [{ id: -1, name: match[1], price: 0 }];
      }
    }

    return [];
  };

  if (loading && !bookings.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-7 h-7 text-primary-600" />
                จัดการการจอง
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                รายการจองทั้งหมด {bookings.length} รายการ | แสดงผล {filteredBookings.length} รายการ
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  placeholder="ค้นหา (ชื่อ, ทะเบียน, ID)"
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-64 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  className="pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-48 appearance-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">สถานะทั้งหมด</option>
                  <option value="pending">⏳ รอดำเนินการ</option>
                  <option value="confirmed">✅ ยืนยันแล้ว</option>
                  <option value="in_progress">🔧 กำลังซ่อม</option>
                  <option value="completed">🏁 เสร็จสิ้น</option>
                  <option value="cancelled">❌ ยกเลิก</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">ไม่พบรายการจอง</h3>
              <p className="text-gray-500 mt-1">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหาใหม่</p>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const styles = getStatusStyles(booking.status);
              return (
                <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row overflow-hidden hover:shadow-md transition-shadow group">
                  {/* Status Strip */}
                  <div className={`w-full md:w-2 h-2 md:h-auto ${styles.strip}`}></div>

                  <div className="p-5 flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* 1. Date & Time (MD: Col 2) */}
                    <div className="md:col-span-2 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4">
                      <div className="flex items-center gap-3 md:block">
                        <div className="text-3xl font-bold text-gray-800">
                          {format(new Date(booking.booking_date), 'd')}
                        </div>
                        <div className="text-sm font-medium text-gray-500 uppercase md:mt-1">
                          {format(new Date(booking.booking_date), 'MMM yyyy', { locale: th })}
                        </div>
                      </div>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 md:mt-3">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        {booking.booking_time.substring(0, 5)} น.
                      </div>
                    </div>

                    {/* 2. Main Info (MD: Col 7) */}
                    <div className="md:col-span-7 space-y-4">
                      {/* Customer & Bike Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {booking.first_name} {booking.last_name}
                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">#{booking.id}</span>
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span className="flex items-center hover:text-primary-600 transition-colors">
                              <Phone className="w-3.5 h-3.5 mr-1.5" />
                              {booking.phone || '-'}
                            </span>
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <span className="flex items-center hover:text-primary-600 transition-colors">
                              <Mail className="w-3.5 h-3.5 mr-1.5" />
                              {booking.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Badge */}
                      <div className="flex items-start">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-gray-50 border border-gray-100 text-gray-700">
                          <Bike className="w-4 h-4 mr-2 text-primary-500" />
                          <span className="font-medium mr-1">{booking.vehicle_brand} {booking.vehicle_model}</span>
                          <span className="text-gray-400 mx-1">|</span>
                          <span>{booking.vehicle_license_plate}</span>
                        </div>
                      </div>

                      {/* Services */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">รายการซ่อม</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {getDisplayServices(booking).length > 0 ? getDisplayServices(booking).map((s, idx) => (
                            <span key={s.id === -1 ? `fake-${idx}` : s.id} className="text-sm bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100">
                              {s.name}
                            </span>
                          )) : <span className="text-sm text-gray-400 italic">- ไม่ได้ระบุรายการ -</span>}
                        </div>
                      </div>

                      {/* Notes */}
                      {booking.notes && (
                        <div className="mt-3 text-sm bg-yellow-50 text-yellow-800 p-3 rounded-lg border border-yellow-100 flex items-start gap-2.5">
                          <ClipboardList className="w-4 h-4 mt-0.5 shrink-0 opacity-70" />
                          <span className="leading-relaxed">{booking.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* 3. Action / Status (MD: Col 3) */}
                    <div className="md:col-span-3 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะการจอง</label>
                        <div className="relative">
                          <select
                            value={booking.status}
                            onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                            disabled={updatingId === booking.id}
                            className={`w-full appearance-none pl-3 pr-10 py-2.5 rounded-lg text-sm font-semibold border-2 focus:ring-2 focus:ring-offset-1 focus:outline-none transition-all cursor-pointer ${styles.select} ${
                              updatingId === booking.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <option value="pending">⏳ รอดำเนินการ</option>
                            <option value="confirmed">✅ ยืนยันแล้ว</option>
                            <option value="in_progress">🔧 กำลังซ่อม</option>
                            <option value="completed">🏁 เสร็จสิ้น</option>
                            <option value="cancelled">❌ ยกเลิก</option>
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            {updatingId === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-current opacity-70" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-current opacity-50" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price Estimate */}
                      {booking.total_price > 0 && (
                        <div className="mt-4 md:mt-0 md:text-right bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-lg">
                          <p className="text-xs text-gray-500 mb-0.5">ประเมินราคาเบื้องต้น</p>
                          <p className="text-xl font-bold text-primary-600">฿{booking.total_price.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
