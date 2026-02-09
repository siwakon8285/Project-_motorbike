'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { History, Wrench, FileText, Download, Car, Calendar, Clock, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  payment_status?: string;
  payment_method?: string;
  notes: string;
  updated_at?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
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

  const handleDownloadPdf = async (record: ServiceHistory) => {
    const loadingToast = toast.loading('กำลังสร้างไฟล์ PDF...');
    
    try {
      // Create a temporary container for the PDF content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '210mm'; // A4 width
      container.style.minHeight = '297mm'; // A4 height
      container.style.backgroundColor = 'white';
      container.style.padding = '20mm';
      container.style.fontFamily = "'Sarabun', 'Noto Sans Thai', sans-serif"; // Ensure Thai font support if available
      document.body.appendChild(container);

      // Helper to format date
      const formatDate = (dateStr: string) => format(new Date(dateStr), 'dd MMMM yyyy', { locale: th });

      // Generate HTML content
      container.innerHTML = `
        <div class="pdf-content text-gray-900">
          <!-- Header -->
          <div class="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
            <div>
              <h1 class="text-2xl font-bold mb-1">ใบสั่งจอง / ใบแจ้งหนี้</h1>
              <p class="text-sm text-gray-600">Motorbike Service Shop</p>
              <p class="text-sm text-gray-600">โทร: 02-xxx-xxxx</p>
            </div>
            <div class="text-right">
              <p class="font-bold">เลขที่จอง: #${record.id}</p>
              <p class="text-sm">วันที่: ${formatDate(record.booking_date)}</p>
              <p class="text-sm">เวลา: ${record.booking_time}</p>
              <div class="mt-2 px-3 py-1 bg-gray-100 rounded inline-block text-sm font-bold">
                ${getStatusText(record.status)}
              </div>
              <p class="text-sm mt-2 text-gray-600">
                การชำระเงิน: ${record.payment_method === 'promptpay' ? 'โอนจ่าย (PromptPay)' : 'ชำระหน้าร้าน (Shop)'}
              </p>
              <p class="text-sm ${record.payment_status === 'paid' ? 'text-green-600 font-bold' : 'text-red-600'}">
                สถานะ: ${record.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระเงิน'}
              </p>
            </div>
          </div>

          <!-- Customer & Vehicle Info -->
          <div class="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 class="font-bold border-b border-gray-300 mb-2 pb-1">ข้อมูลลูกค้า</h3>
              <p>คุณ ${record.first_name || user?.profile?.firstName || ''} ${record.last_name || user?.profile?.lastName || ''}</p>
              <p class="text-sm text-gray-600">เบอร์โทร: ${record.phone || user?.profile?.phone || '-'}</p>
              <p class="text-sm text-gray-600">อีเมล: ${record.email || user?.email || '-'}</p>
            </div>
            <div>
              <h3 class="font-bold border-b border-gray-300 mb-2 pb-1">ข้อมูลยานพาหนะ</h3>
              <p>${record.vehicle_brand} ${record.vehicle_model}</p>
              <p class="text-sm text-gray-600">ทะเบียน: ${record.vehicle_license_plate}</p>
              <p class="text-sm text-gray-600">สี: ${record.vehicle_color || '-'}</p>
              <p class="text-sm text-gray-600">ปี: ${record.vehicle_year || '-'}</p>
            </div>
          </div>

          <!-- Services Table -->
          <div class="mb-8">
            <h3 class="font-bold mb-3">รายละเอียดบริการ</h3>
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-100 border-b border-gray-300">
                  <th class="py-2 px-3 font-semibold text-sm">ลำดับ</th>
                  <th class="py-2 px-3 font-semibold text-sm">รายการ</th>
                  <th class="py-2 px-3 font-semibold text-sm text-right">ราคา</th>
                </tr>
              </thead>
              <tbody>
                ${record.services && record.services.length > 0 
                  ? record.services.map((s, idx) => `
                    <tr class="border-b border-gray-200">
                      <td class="py-2 px-3 text-sm">${idx + 1}</td>
                      <td class="py-2 px-3 text-sm">${s.name}</td>
                      <td class="py-2 px-3 text-sm text-right">${formatCurrency(s.price)}</td>
                    </tr>
                  `).join('')
                  : `<tr><td colspan="3" class="py-4 text-center text-gray-500">ไม่มีรายการบริการ</td></tr>`
                }
              </tbody>
              <tfoot>
                <tr class="font-bold">
                  <td colspan="2" class="py-3 px-3 text-right">รวมเป็นเงินทั้งสิ้น</td>
                  <td class="py-3 px-3 text-right text-lg">${formatCurrency(record.total_price)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Notes -->
          ${record.notes ? `
            <div class="mb-8 p-4 bg-gray-50 rounded border border-gray-200">
              <h3 class="font-bold text-sm mb-2">หมายเหตุ / รายละเอียดเพิ่มเติม</h3>
              <div class="text-sm whitespace-pre-line text-gray-700">
                ${record.notes.split('\n').filter(l => !l.trim().startsWith('บริการที่ต้องการ:')).join('<br/>')}
              </div>
            </div>
          ` : ''}

          <!-- Footer -->
          <div class="mt-12 pt-8 border-t border-gray-300 flex justify-between items-end text-sm text-gray-500">
            <div>
              <p>ขอบคุณที่ใช้บริการ</p>
              <p>Motorbike Service Shop</p>
            </div>
            <div class="text-right">
              <p class="mb-8">____________________________</p>
              <p>ลายเซ็นผู้รับเงิน / เจ้าหน้าที่</p>
            </div>
          </div>
        </div>
      `;

      // Render to canvas
      const canvas = await html2canvas(container, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`booking-receipt-${record.id}.pdf`);

      toast.dismiss(loadingToast);
      toast.success('ดาวน์โหลดไฟล์สำเร็จ');
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    } finally {
      // Cleanup
      const container = document.querySelector('body > div[style*="-9999px"]');
      if (container) document.body.removeChild(container);
    }
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

                        {(() => {
                          if (!record.notes) return null;
                          
                          const lines = record.notes.split('\n').filter(l => l.trim());
                          const displayElements: React.ReactNode[] = [];
                          
                          lines.forEach((line, i) => {
                            const trimmed = line.trim();
                            
                            // Skip redundant service request (already shown in Selected Services)
                            if (trimmed.startsWith('บริการที่ต้องการ:')) return;

                            // Handle Estimate details
                            if (trimmed.includes('รายการอะไหล่ที่เลือกประเมินราคา')) {
                               const parts = trimmed.split('|');
                               parts.forEach((part, j) => {
                                 const pTrimmed = part.trim();
                                 // Skip the list of parts (redundant)
                                 if (pTrimmed.startsWith('รายการอะไหล่ที่เลือกประเมินราคา')) return;
                                 
                                 // Keep Total Estimate
                                 if (pTrimmed.startsWith('รวมประมาณ')) {
                                    displayElements.push(
                                      <p key={`est-${i}-${j}`} className="font-bold text-gray-900 mt-1">{pTrimmed}</p>
                                    );
                                 } else {
                                    displayElements.push(<p key={`est-${i}-${j}`}>{pTrimmed}</p>);
                                 }
                               });
                               return;
                            }

                            // Normal notes
                            if (trimmed.startsWith('หมายเหตุเพิ่มเติม:')) {
                               const content = trimmed.replace('หมายเหตุเพิ่มเติม:', '').trim();
                               if (content) {
                                 displayElements.push(
                                   <div key={i} className="mt-2 pt-2 border-t border-yellow-200">
                                      <span className="font-medium">หมายเหตุเพิ่มเติม:</span> {content}
                                   </div>
                                 );
                               }
                               return;
                            }

                            displayElements.push(<p key={i}>{trimmed}</p>);
                          });

                          if (displayElements.length === 0) return null;

                          return (
                            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                              <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                                <FileText className="w-4 h-4 mr-2" /> รายละเอียดเพิ่มเติม
                              </h4>
                              <div className="space-y-2 text-sm text-gray-700">
                                {displayElements}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="ml-6">
                        {record.status === 'confirmed' ? (
                          <button
                            className="p-2 text-primary-600 hover:text-primary-800"
                            title="Download Receipt"
                            onClick={() => handleDownloadPdf(record)}
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            className="p-2 text-gray-300 cursor-not-allowed"
                            title="Download only available for confirmed bookings"
                            disabled
                          >
                            <Download className="w-5 h-5" />
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
