'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Bell, Check, Trash2, Calendar, Wrench, DollarSign, Info, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_booking_id?: number;
}

interface BookingDetails {
  id: number;
  status: string;
  booking_date: string;
  booking_time: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_license_plate?: string;
  services: { id: number; name: string; price: number }[];
  total_price: number;
  notes?: string;
  payment_status?: string;
}

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [authLoading, user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดการแจ้งเตือนได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('/api/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (err) {
      // Silently fail for unread count
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      fetchUnreadCount();
    } catch (err) {
      toast.error('ไม่สามารถระบุว่าอ่านแล้วได้');
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read/all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('อ่านทั้งหมดแล้ว');
    } catch (err) {
      toast.error('ไม่สามารถระบุว่าอ่านทั้งหมดแล้วได้');
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      fetchUnreadCount();
      toast.success('ลบการแจ้งเตือนแล้ว');
    } catch (err) {
      toast.error('ไม่สามารถลบการแจ้งเตือนได้');
    }
  };

  const getIcon = (type: string) => {
    const icons: { [key: string]: any } = {
      booking: Calendar,
      service: Wrench,
      payment: DollarSign,
      reminder: Bell,
      system: Info
    };
    const Icon = icons[type] || Bell;
    return <Icon className="w-5 h-5" />;
  };

  const getIconColor = (type: string) => {
    const colors: { [key: string]: string } = {
      booking: 'bg-blue-100 text-blue-600',
      service: 'bg-green-100 text-green-600',
      payment: 'bg-yellow-100 text-yellow-600',
      reminder: 'bg-purple-100 text-purple-600',
      system: 'bg-gray-100 text-gray-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const handleViewBooking = async (bookingId: number) => {
    setLoadingBooking(true);
    try {
      const res = await axios.get(`/api/bookings/${bookingId}`);
      setSelectedBooking(res.data);
      setIsModalOpen(true);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลการจองได้');
    } finally {
      setLoadingBooking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    
    const labels: { [key: string]: string } = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {labels[status] || status}
      </span>
    );
  };

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
              <h1 className="text-2xl font-bold text-gray-900">การแจ้งเตือน</h1>
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount > 0 ? `${unreadCount} รายการที่ยังไม่อ่าน` : 'ไม่มีการแจ้งเตือนใหม่'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <Check className="w-4 h-4 mr-2" />
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-lg shadow">
            <div className="divide-y divide-gray-200">
              {notifications.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">ยังไม่มีการแจ้งเตือน</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-6 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-lg ${getIconColor(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {format(new Date(notification.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-2 text-gray-400 hover:text-primary-600"
                                title="ทำเครื่องหมายว่าอ่านแล้ว"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {notification.related_booking_id && (
                          <button
                            onClick={() => handleViewBooking(notification.related_booking_id!)}
                            disabled={loadingBooking}
                            className="inline-flex items-center mt-3 text-sm text-primary-600 hover:text-primary-500 disabled:opacity-50"
                          >
                            {loadingBooking ? 'กำลังโหลด...' : 'ดูรายละเอียดการจอง'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Booking Details Modal */}
          {isModalOpen && selectedBooking && (
            <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        รายละเอียดการจอง
                      </h3>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        <span className="sr-only">Close</span>
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b">
                        <span className="text-gray-500">สถานะปัจจุบัน</span>
                        {getStatusBadge(selectedBooking.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">วันที่</p>
                          <p className="font-medium">
                            {format(new Date(selectedBooking.booking_date), 'd MMM yyyy', { locale: th })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">เวลา</p>
                          <p className="font-medium">{selectedBooking.booking_time}</p>
                        </div>
                      </div>

                      {(selectedBooking.vehicle_brand || selectedBooking.vehicle_license_plate) && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700 mb-1">ข้อมูลยานพาหนะ</p>
                          <p className="text-sm text-gray-600">
                            {selectedBooking.vehicle_brand} {selectedBooking.vehicle_model}
                            {selectedBooking.vehicle_license_plate && ` (${selectedBooking.vehicle_license_plate})`}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">รายการบริการ/อะไหล่</p>
                        <div className="space-y-2">
                          {selectedBooking.services.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.name}</span>
                              <span className="font-medium">฿{Number(item.price).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                            <span>รวมทั้งหมด</span>
                            <span className="text-primary-600">฿{Number(selectedBooking.total_price).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {selectedBooking.notes && (
                         <div className="text-sm text-gray-500 italic mt-2">
                           หมายเหตุ: {selectedBooking.notes}
                         </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setIsModalOpen(false)}
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </ProtectedRoute>
  );
}
