'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Bell, Check, Trash2, Calendar, Wrench, DollarSign, Info } from 'lucide-react';
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

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

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
                          <Link
                            href="/history"
                            prefetch={false}
                            className="inline-flex items-center mt-3 text-sm text-primary-600 hover:text-primary-500"
                          >
                            ดูรายละเอียดการจอง
                          </Link>
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
