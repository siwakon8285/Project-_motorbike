'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Suspense, useEffect, useState } from 'react';
import axios from 'axios';
import { format, addDays, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { Check, Calendar, Clock, Car, FileText, Wrench, Trash2, Upload, CreditCard, Banknote, Download, X, Maximize2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Part {
  id: number;
  name: string;
  selling_price: number;
}

function NewBooking() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [customService, setCustomService] = useState('');
  const [partIds, setPartIds] = useState<number[]>([]);
  const [selectedPartsData, setSelectedPartsData] = useState<Part[]>([]);
  
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

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'shop' | 'promptpay'>('shop');
  const [slipImage, setSlipImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isQrExpanded, setIsQrExpanded] = useState(false);

  useEffect(() => {
    const noteParam = searchParams.get('notes');
    const modelParam = searchParams.get('model');
    const priceParam = searchParams.get('estimatedPrice');
    const partIdsParam = searchParams.get('partIds');
    
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

    if (partIdsParam) {
      const ids = partIdsParam.split(',').map(Number);
      setPartIds(ids);
      // Fetch parts details
      axios.get(`/api/parts?ids=${partIdsParam}`)
        .then(res => setSelectedPartsData(res.data))
        .catch(err => console.error('Failed to fetch selected parts', err));
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

  // Auto-fill custom service text when parts are loaded from estimate
  useEffect(() => {
    if (selectedPartsData.length > 0 && !customService) {
      const partsList = selectedPartsData.map(p => p.name).join(', ');
      setCustomService(`เปลี่ยนอะไหล่: ${partsList}`);
    }
  }, [selectedPartsData, customService]);

  const removePart = (id: number) => {
    setPartIds(prev => prev.filter(pId => pId !== id));
    setSelectedPartsData(prev => prev.filter(p => p.id !== id));
  };

  const partsTotal = selectedPartsData.reduce((sum, p) => sum + Number(p.selling_price), 0);
  const totalEstimate = partsTotal;

  // Use calculated total if we have parts, otherwise fallback to URL param
  const displayPrice = selectedPartsData.length > 0
    ? totalEstimate 
    : (estimatedPrice ? Number(estimatedPrice) : 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
        return;
      }
      setSlipImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTime) {
      toast.error('กรุณาเลือกเวลา');
      return;
    }
    if (!vehicle.brand || !vehicle.model || !vehicle.licensePlate) {
      toast.error('กรุณากรอกข้อมูลรถให้ครบถ้วน');
      return;
    }
    if (!customService && selectedPartsData.length === 0) {
      toast.error('กรุณาระบุบริการที่ต้องการ หรือเลือกอะไหล่');
      return;
    }

    if (paymentMethod === 'promptpay' && !slipImage) {
      toast.error('กรุณาอัปโหลดหลักฐานการโอนเงิน');
      return;
    }

    setLoading(true);
    try {
      // Combine custom service and estimate details into notes
      let finalNotes = '';
      if (customService) finalNotes += `บริการที่ต้องการ: ${customService}\n`;
      if (estimateDetails) finalNotes += `\n${estimateDetails}`;
      if (notes) finalNotes += `\n\nหมายเหตุเพิ่มเติม: ${notes}`;

      const formData = new FormData();
      formData.append('vehicle', JSON.stringify(vehicle));
      formData.append('serviceIds', JSON.stringify([]));
      formData.append('partIds', JSON.stringify(partIds));
      formData.append('bookingDate', format(selectedDate, 'yyyy-MM-dd'));
      formData.append('bookingTime', selectedTime);
      formData.append('notes', finalNotes.trim());
      formData.append('paymentMethod', paymentMethod);
      
      if (slipImage) {
        formData.append('slipImage', slipImage);
      }

      await axios.post('/api/bookings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(`จองคิวสำเร็จ! วันที่ ${format(selectedDate, 'd MMM yyyy', { locale: th })}`);
      router.push('/history');
    } catch (err: any) {
      const message = err.response?.data?.message || 'ไม่สามารถสร้างการจองได้';
      toast.error(message);
      
      if (message.includes('booked') || message.includes('time slot')) {
        // If slot is taken, go back to step 1 and remove the taken slot from UI
        setStep(1);
        setAvailableSlots(prev => prev.filter(time => time !== selectedTime));
        setSelectedTime('');
      }
    } finally {
      setLoading(false);
    }
  };

  const weekDays = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i));
  
  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto mb-20">
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
                      {s === 1 ? 'เลือกวันที่' : 'ข้อมูลรถและบริการ'}
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

          {/* Step 2: Vehicle Info & Services */}
          {step === 2 && (
            <div className="space-y-6">
              {/* QR Modal */}
              {isQrExpanded && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
                  onClick={() => setIsQrExpanded(false)}
                >
                  <div 
                    className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={() => setIsQrExpanded(false)}
                      className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors z-10"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="p-8 flex flex-col items-center">
                      <img 
                        src="/images/promptpay-qr.png" 
                        alt="PromptPay QR Code Expanded" 
                        className="w-full h-auto max-h-[70vh] object-contain mb-4"
                      />
                      <h3 className="text-xl font-bold text-gray-900">PromptPay</h3>
                      <p className="text-lg text-gray-600 mb-4">นายศิวกร บุญดี</p>
                      <a 
                        href="/images/promptpay-qr.png" 
                        download="promptpay-qr.png"
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 font-medium"
                      >
                        <Download className="w-4 h-4" /> บันทึกรูปภาพ
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Parts Section */}
              {selectedPartsData.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                    <h3 className="text-blue-900 font-medium flex items-center gap-2">
                      <Wrench className="w-5 h-5" /> อะไหล่ที่เลือกไว้
                    </h3>
                    <span className="text-blue-900 font-bold">{formatCurrency(partsTotal)}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {selectedPartsData.map((part) => (
                      <div key={part.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">{part.name}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(Number(part.selling_price))}</p>
                        </div>
                        <button 
                          onClick={() => removePart(part.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Request Section */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-gray-900 font-medium flex items-center gap-2">
                    <Wrench className="w-5 h-5" /> รายละเอียดบริการที่ต้องการ
                  </h3>
                </div>
                <div className="p-6">
                  <textarea
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    placeholder="ระบุอาการรถ หรือบริการที่ต้องการ (เช่น เปลี่ยนถ่ายน้ำมันเครื่อง, เช็คเสียงดังห้องเครื่อง, ฯลฯ)"
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    * กรุณาระบุรายละเอียดให้ชัดเจนเพื่อให้ช่างประเมินราคาได้ถูกต้อง
                  </p>
                </div>
              </div>

              {/* Vehicle Info */}
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

              {/* Notes */}
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

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">วิธีการชำระเงิน</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div 
                    onClick={() => setPaymentMethod('shop')}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 transition-all ${
                      paymentMethod === 'shop' 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'shop' ? 'border-primary-500' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'shop' && <div className="w-3 h-3 rounded-full bg-primary-500" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Banknote className="w-5 h-5" /> ชำระที่หน้าร้าน
                      </h3>
                      <p className="text-sm text-gray-500">ชำระเงินสดหรือโอนเมื่อซ่อมเสร็จ</p>
                    </div>
                  </div>

                  {displayPrice > 0 && (
                    <div 
                      onClick={() => setPaymentMethod('promptpay')}
                      className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 transition-all ${
                        paymentMethod === 'promptpay' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === 'promptpay' ? 'border-primary-500' : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'promptpay' && <div className="w-3 h-3 rounded-full bg-primary-500" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <CreditCard className="w-5 h-5" /> โอนจ่ายทันที (PromptPay)
                        </h3>
                        <p className="text-sm text-gray-500">เพื่อยืนยันคิวทันที</p>
                      </div>
                    </div>
                  )}
                </div>

                {paymentMethod === 'promptpay' && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 animate-fade-in">
                    <div className="text-center mb-6">
                      <p className="text-gray-600 mb-2">ยอดชำระเงิน</p>
                      <p className="text-3xl font-bold text-primary-600">{formatCurrency(displayPrice)}</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center relative group">
                        {/* QR Code */}
                        <div 
                          className="w-48 h-auto bg-white rounded-lg flex items-center justify-center mb-2 mx-auto overflow-hidden border border-gray-100 cursor-pointer relative"
                          onClick={() => setIsQrExpanded(true)}
                        >
                           <img 
                             src="/images/promptpay-qr.png" 
                             alt="PromptPay QR Code" 
                             className="w-full h-full object-contain"
                           />
                           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                             <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" />
                           </div>
                        </div>
                        <p className="font-bold text-gray-900 text-lg">PromptPay</p>
                        <p className="text-gray-600 font-medium">นายศิวกร บุญดี</p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <p className="text-gray-400 text-xs">สแกนเพื่อจ่ายเงิน</p>
                          <span className="text-gray-300">|</span>
                          <a 
                            href="/images/promptpay-qr.png" 
                            download="promptpay-qr.png"
                            className="text-primary-600 text-xs font-medium hover:underline flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> ดาวน์โหลด QR
                          </a>
                        </div>
                      </div>

                      <div className="w-full max-w-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          อัปโหลดสลิปการโอนเงิน
                        </label>
                        {previewUrl ? (
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-white">
                            <div className="space-y-1 text-center">
                              <div className="relative">
                                <img src={previewUrl} alt="Slip preview" className="mx-auto h-48 object-contain" />
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSlipImage(null);
                                    setPreviewUrl(null);
                                  }}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-500 transition-colors bg-white cursor-pointer block">
                            <div className="space-y-1 text-center">
                              <Upload className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex text-sm text-gray-600 justify-center">
                                <span className="relative rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                                  อัปโหลดรูปภาพ
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                              <input type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
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
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">ราคาประเมินเบื้องต้น</p>
                    <div className="flex flex-col">
                      <p className="font-medium text-gray-900 text-xl text-green-600">
                        {formatCurrency(displayPrice)}
                      </p>
                      {selectedPartsData.length > 0 && (
                         <span className="text-xs text-gray-400">
                           (ค่าอะไหล่ {formatCurrency(partsTotal)})
                         </span>
                      )}
                    </div>
                  </div>

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

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </ProtectedRoute>
    }>
      <NewBooking />
    </Suspense>
  );
}
