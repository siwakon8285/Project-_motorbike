'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { History, Wrench, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface ServiceHistory {
  id: number;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_license_plate: string;
  services: {
    id: number;
    name: string;
    price: number;
  }[];
  booking_date: string;
  booking_time: string;
  total_price: number;
  status: string;
  notes: string;
  updated_at?: string;
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const url = '/api/bookings'; // Fetch all bookings to show full history
      const res = await axios.get(url);
      setHistory(res.data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลประวัติได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchHistory();
    }
  }, [authLoading, user, fetchHistory]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ประวัติการใช้บริการ</h1>
            <p className="text-sm text-gray-500 mt-1">
              {user?.role === 'customer' 
                ? 'ดูรายการซ่อมและสถานะการจองทั้งหมดของคุณ' 
                : 'ดูบันทึกการซ่อมทั้งหมด'}
            </p>
          </div>

          {/* History List */}
          <div className="bg-white rounded-lg shadow">
            <div className="divide-y divide-gray-200">
              {history.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <History className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">ไม่พบประวัติการใช้บริการ</p>
                </div>
              ) : (
                history.map((record) => (
                  <div key={record.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`p-2 rounded-lg ${
                            record.status === 'completed' ? 'bg-green-100' : 
                            record.status === 'cancelled' ? 'bg-red-100' : 'bg-primary-100'
                          }`}>
                            <Wrench className={`w-5 h-5 ${
                              record.status === 'completed' ? 'text-green-600' : 
                              record.status === 'cancelled' ? 'text-red-600' : 'text-primary-600'
                            }`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {record.vehicle_brand} {record.vehicle_model}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {record.vehicle_license_plate}
                            </p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                            {getStatusText(record.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">วันที่รับบริการ</p>
                            <p className="text-sm font-medium text-gray-900">
                              {format(new Date(record.updated_at || record.booking_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">ค่าบริการรวม</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(record.total_price)}
                            </p>
                          </div>
                        </div>

                        {/* Repair details removed */}

                        {record.notes && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">หมายเหตุ:</span> {record.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="ml-6">
                        <button
                          className="p-2 text-gray-400 hover:text-primary-600"
                          title="Download Receipt"
                        >
                          <Download className="w-5 h-5" />
                        </button>
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
