'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { History, Wrench, FileText, Download, Car, Calendar, Clock, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface ServiceHistory {
  id: number;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_license_plate: string;
  vehicle_color?: string;
  vehicle_year?: number;
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
                              {format(new Date(record.booking_date), 'dd MMM yyyy', { locale: th })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">ค่าบริการรวม</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(record.total_price)}
                            </p>
                          </div>
                        </div>

                        {/* Detailed Information */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                             <Car className="w-4 h-4 mr-2" /> ข้อมูลยานพาหนะและรายละเอียด
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                             <div>
                               <span className="text-gray-500">สีรถ:</span> 
                               <span className="ml-2 font-medium text-gray-900">{record.vehicle_color || '-'}</span>
                             </div>
                             <div>
                               <span className="text-gray-500">ปี:</span> 
                               <span className="ml-2 font-medium text-gray-900">{record.vehicle_year || '-'}</span>
                             </div>
                             <div>
                               <span className="text-gray-500">เวลาจอง:</span> 
                               <span className="ml-2 font-medium text-gray-900">{record.booking_time}</span>
                             </div>
                             <div>
                               <span className="text-gray-500">บริการที่เลือก:</span>
                               <div className="mt-1">
                                 {record.services && record.services.length > 0 ? (
                                   <ul className="list-disc list-inside text-gray-700">
                                     {record.services.map(s => (
                                       <li key={s.id}>{s.name} ({formatCurrency(s.price)})</li>
                                     ))}
                                   </ul>
                                 ) : (
                                   <span className="ml-2 font-medium text-gray-900">-</span>
                                 )}
                               </div>
                             </div>
                          </div>
                        </div>

                        {record.notes && (
                          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                             {record.notes.includes('รายการอะไหล่ที่เลือกประเมินราคา') ? (
                               <div>
                                 <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                                   <FileText className="w-4 h-4 mr-2" /> รายละเอียดการประเมินราคาและหมายเหตุ
                                 </h4>
                                 <div className="space-y-2 text-sm text-gray-700">
                                   {record.notes.split('|').map((part, index) => {
                                      const trimmed = part.trim();
                                      if (!trimmed) return null;
                                      if (trimmed.startsWith('รายการอะไหล่')) {
                                         const content = trimmed.replace('รายการอะไหล่ที่เลือกประเมินราคา:', '').trim();
                                         return (
                                           <div key={index} className="mb-2">
                                             <p className="font-medium text-gray-900 mb-1">รายการอะไหล่:</p>
                                             <p>{content}</p>
                                           </div>
                                         );
                                      }
                                      if (trimmed.startsWith('รวมประมาณ')) {
                                         return <p key={index} className="font-bold text-gray-900 mt-2">{trimmed}</p>;
                                      }
                                      if (trimmed.includes('หมายเหตุเพิ่มเติม:')) {
                                          const [label, content] = trimmed.split('หมายเหตุเพิ่มเติม:');
                                          return (
                                            <div key={index} className="mt-2 pt-2 border-t border-yellow-200">
                                              <p className="font-medium text-gray-900">หมายเหตุเพิ่มเติม:</p>
                                              <p>{content.trim()}</p>
                                            </div>
                                          );
                                      }
                                      return <p key={index}>{trimmed}</p>;
                                   })}
                                 </div>
                               </div>
                             ) : (
                               <p className="text-sm text-gray-700">
                                 <span className="font-medium">หมายเหตุ:</span> {record.notes}
                               </p>
                             )}
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
