'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { format, addDays, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { Check, Calendar, Clock, Car, FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export default function NewBooking() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    color: ''
  });
  const [notes, setNotes] = useState('');
  const [estimateDetails, setEstimateDetails] = useState<string>('');
  const [estimatedPrice, setEstimatedPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const noteParam = searchParams.get('notes');
    const modelParam = searchParams.get('model');
    const priceParam = searchParams.get('estimatedPrice');
    
    if (noteParam) {
      if (noteParam.includes('รายการอะไหล่ที่เลือกประเมินราคา')) {
        setEstimateDetails(noteParam);
      } else {
        setNotes(noteParam);
      }
    }
    
    if (modelParam) {
      setVehicle(prev => ({ ...prev, model: modelParam }));
    }

    if (priceParam) {
      setEstimatedPrice(priceParam);
    }

    // Restore date and time if passed back from estimate
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time');
    
    if (dateParam) {
      setSelectedDate(new Date(dateParam));
    }
    if (timeParam) {
      setSelectedTime(timeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      try {
        const res = await axios.get(`/api/bookings/slots/available?date=${format(selectedDate, 'yyyy-MM-dd')}`);
        setAvailableSlots(res.data.availableSlots);
        setSelectedTime('');
      } catch (err) {
        toast.error('Failed to fetch available slots');
      }
    };

    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const handleSubmit = async () => {
    if (!selectedTime) {
      toast.error('กรุณาเลือกเวลา');
      return;
    }
    if (!vehicle.brand || !vehicle.model || !vehicle.licensePlate) {
      toast.error('กรุณากรอกข้อมูลรถให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/bookings', {
        vehicle,
        serviceIds: selectedServices,
        bookingDate: format(selectedDate, 'yyyy-MM-dd'),
        bookingTime: selectedTime,
        notes: estimateDetails ? `${estimateDetails}\n\nหมายเหตุเพิ่มเติม:\n${notes}` : notes
      });
      toast.success(`จองคิวสำเร็จ! วันที่ ${format(selectedDate, 'd MMM yyyy', { locale: th })}`);
      router.push('/history');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถสร้างการจองได้');
    } finally {
      setLoading(false);
    }
  };

  const weekDays = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i));
  
  const handleNextStep = () => {
    if (step === 1) {
      const fromEstimate = searchParams.get('fromEstimate');
      // If NOT from estimate (and has no notes which implies estimate details), redirect to estimate
      if (!fromEstimate && !searchParams.get('notes')) {
        const params = new URLSearchParams();
        params.set('date', format(selectedDate, 'yyyy-MM-dd'));
        params.set('time', selectedTime);
        router.push(`/estimate?${params.toString()}`);
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">จองคิวใหม่</h1>

          {/* Progress */}
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between relative">
                {/* Background Line */}
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 -z-10 mx-8" />
                
                {/* Steps */}
                {[1, 2].map((s) => (
                  <div key={s} className="flex flex-col items-center bg-gray-50 px-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium mb-2 transition-colors ${
                      step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step > s ? <Check className="w-5 h-5" /> : s}
                    </div>
                    <span className={`text-sm font-medium ${
                      step >= s ? 'text-primary-900' : 'text-gray-500'
                    }`}>
                      {s === 1 ? 'เลือกวันที่' : 'ข้อมูลรถ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 1: Date & Time */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">เลือกวันที่</h2>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((date) => (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        isSameDay(date, selectedDate)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <p className="text-xs uppercase">{format(date, 'EEE', { locale: th })}</p>
                      <p className="text-lg font-bold">{format(date, 'd')}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">เลือกเวลา</h2>
                {availableSlots.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">ไม่มีเวลาว่างสำหรับวันนี้</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                          selectedTime === slot
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNextStep}
                  disabled={!selectedTime}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Vehicle Info */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Car className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-medium text-gray-900">ข้อมูลยานพาหนะ</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ยี่ห้อ</label>
                    <input
                      type="text"
                      value={vehicle.brand}
                      onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="เช่น Honda"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รุ่น</label>
                    <input
                      type="text"
                      value={vehicle.model}
                      onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="เช่น Click 125i"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ปี</label>
                    <input
                      type="number"
                      value={vehicle.year}
                      onChange={(e) => setVehicle({ ...vehicle, year: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">สีรถ</label>
                    <input
                      type="text"
                      value={vehicle.color}
                      onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="เช่น ดำ, แดง"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ทะเบียนรถ</label>
                    <input
                      type="text"
                      value={vehicle.licensePlate}
                      onChange={(e) => setVehicle({ ...vehicle, licensePlate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="เช่น กก1234"
                    />
                  </div>
                </div>
              </div>

              {estimateDetails && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                    <h3 className="text-blue-900 font-medium flex items-center gap-2">
                      <FileText className="w-5 h-5" /> รายการอะไหล่ที่ประเมินไว้
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {estimateDetails.split('|').map((part, index) => {
                        const trimmed = part.trim();
                        if (!trimmed) return null;
                        if (trimmed.startsWith('รายการอะไหล่')) {
                           const content = trimmed.replace('รายการอะไหล่ที่เลือกประเมินราคา:', '').trim();
                           return (
                             <div key={index}>
                               <p className="text-sm text-gray-500 mb-1">รายการอะไหล่</p>
                               <p className="text-gray-900 font-medium">{content}</p>
                             </div>
                           );
                        }
                        if (trimmed.startsWith('รวมประมาณ')) {
                           return null;
                        }
                        return <p key={index} className="text-gray-700">{trimmed}</p>;
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">หมายเหตุเพิ่มเติม</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="คำขอพิเศษอื่นๆ หรืออาการเพิ่มเติม..."
                />
              </div>

              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
                <div className="bg-primary-600 px-6 py-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> สรุปข้อมูลการจอง
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> วันและเวลา
                    </p>
                    <p className="font-medium text-gray-900">{format(selectedDate, 'd MMMM yyyy', { locale: th })}</p>
                    <p className="text-primary-600 font-bold text-lg">{selectedTime} น.</p>
                  </div>
                  
                  {estimatedPrice && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ราคาประเมินเบื้องต้น</p>
                      <p className="font-medium text-gray-900 text-xl text-green-600">
                        {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(Number(estimatedPrice))}
                      </p>
                    </div>
                  )}

                  {(vehicle.brand || vehicle.model) && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                        <Car className="w-4 h-4" /> รถของคุณ
                      </p>
                      <p className="font-medium text-gray-900">{vehicle.brand} {vehicle.model}</p>
                      <div className="flex gap-2 text-sm text-gray-500">
                         {vehicle.color && <span>สี{vehicle.color}</span>}
                         {vehicle.licensePlate && <span>{vehicle.licensePlate}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'กำลังสร้าง...' : 'ยืนยันการจอง'}
                </button>
              </div>
            </div>
          )}
        </div>
    </ProtectedRoute>
  );
}
