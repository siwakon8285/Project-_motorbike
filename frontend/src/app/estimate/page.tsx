'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ShoppingCart, Wrench, Info, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

interface Part {
  id: number;
  name: string;
  category: string;
  description: string;
  selling_price: number;
  image_url: string;
  compatible_models: string;
  quantity: number;
}

export default function EstimatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [searchModel, setSearchModel] = useState('');
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedModel, setDebouncedModel] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Real-time updates
  useEffect(() => {
    const socket = io(API_URL);

    socket.on('parts_update', () => {
      setRefreshTrigger(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [API_URL]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedModel(searchModel);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchModel]);

  // Fetch parts
  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { 'x-auth-token': token } : {};
        
        const res = await axios.get(`/api/parts?model=${debouncedModel}`, { headers });
        setParts(res.data);
      } catch (err) {
        console.error(err);
        // Don't show error on empty search or initial load if specific behavior needed
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, [debouncedModel, refreshTrigger]);

  const togglePart = (part: Part) => {
    setSelectedParts(prev => {
      const exists = prev.find(p => p.id === part.id);
      if (exists) {
        return prev.filter(p => p.id !== part.id);
      } else {
        return [...prev, part];
      }
    });
  };

  const totalEstimate = selectedParts.reduce((sum, part) => sum + Number(part.selling_price), 0);

  const handleBooking = () => {
    if (selectedParts.length === 0) {
      toast.error('กรุณาเลือกอะไหล่อย่างน้อย 1 ชิ้น');
      return;
    }
    
    // Create a summary string for the notes
    const partsSummary = selectedParts.map(p => `${p.name} (${p.selling_price} บาท)`).join(', ');
    const note = `รายการอะไหล่ที่เลือกประเมินราคา: ${partsSummary} | รวมประมาณ: ${totalEstimate} บาท`;
    
    // Navigate to booking page with pre-filled notes
    const params = new URLSearchParams();
    params.set('notes', note);
    params.set('model', searchModel);
    params.set('fromEstimate', 'true');
    params.set('estimatedPrice', totalEstimate.toString());
    
    // Pass selected part IDs
    const partIds = selectedParts.map(p => p.id).join(',');
    params.set('partIds', partIds);
    
    // Preserve date and time if passed from booking page
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time');
    if (dateParam) params.set('date', dateParam);
    if (timeParam) params.set('time', timeParam);
    
    router.push(`/bookings/new?${params.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const handleImageError = (id: number) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="container mx-auto px-4 py-8 mb-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ประเมินราคาซ่อมด้วยตนเอง</h1>
          <p className="text-gray-500">
            ค้นหาอะไหล่ตามรุ่นรถของคุณ เลือกรายการที่ต้องการซ่อม และดูราคาประเมินเบื้องต้น
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 sticky top-4 z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ระบุยี่ห้อหรือรุ่นรถของคุณ (เช่น Honda Wave, PCX, Yamaha)..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              value={searchModel}
              onChange={(e) => setSearchModel(e.target.value)}
            />
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-80">
                <div className="w-full h-40 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : parts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parts.map((part) => {
              const isSelected = selectedParts.some(p => p.id === part.id);
              const isOutOfStock = part.quantity <= 0;

              return (
                <div 
                  key={part.id} 
                  className={`group bg-white rounded-2xl p-4 shadow-sm border-2 transition-all duration-200 
                    ${isOutOfStock ? 'opacity-60 cursor-not-allowed grayscale' : 'cursor-pointer hover:shadow-md'}
                    ${isSelected ? 'border-primary-500 ring-2 ring-primary-100' : 'border-transparent hover:border-primary-200'}`}
                  onClick={() => !isOutOfStock && togglePart(part)}
                >
                  <div className="relative w-full h-44 mb-4 bg-white rounded-xl overflow-hidden flex items-center justify-center">
                    {!imageErrors[part.id] && part.image_url ? (
                      <img 
                        src={`${API_URL}${part.image_url}`} 
                        alt={part.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={() => handleImageError(part.id)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <Wrench className="w-12 h-12 mb-2" />
                        <span className="text-xs text-gray-400">ไม่มีรูปภาพ</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                    {isOutOfStock && (
                       <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px]">
                         <span className="text-white font-bold px-4 py-2 bg-red-500/90 rounded-full text-sm shadow-lg">สินค้าหมด</span>
                       </div>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{part.name}</h3>
                  {part.compatible_models && (
                    <p className="text-xs text-blue-600 mb-2 line-clamp-1">
                      รุ่นที่รองรับ: {part.compatible_models}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-primary-600 font-bold text-lg">
                      {formatCurrency(Number(part.selling_price))}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {isOutOfStock ? 'หมด' : `เหลือ ${part.quantity} ชิ้น`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">ไม่พบรายการอะไหล่สำหรับรุ่นรถที่คุณระบุ</p>
            <p className="text-sm text-gray-400 mt-2">ลองค้นหาด้วยคำกว้างๆ เช่น &quot;Wave&quot; หรือ &quot;Honda&quot;</p>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar */}
      {selectedParts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50 animate-slide-up">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 relative">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {selectedParts.length}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">ราคาประเมินรวม</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEstimate)}</p>
              </div>
            </div>
            
            <button
              onClick={handleBooking}
              className="btn btn-primary px-8 py-3 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all"
            >
              จองคิวซ่อมรายการนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
