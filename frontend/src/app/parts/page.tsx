'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, Image as ImageIcon, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

interface Part {
  id: number;
  name: string;
  sku: string;
  description: string;
  category: string;
  supplier: string;
  selling_price: number;
  quantity: number;
  min_stock: number;
  image_url?: string;
  compatible_models?: string;
}

export default function Parts() {
  const { user, loading: authLoading } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [showLowStock, setShowLowStock] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: 'engine',
    supplier: '',
    compatibleModels: '',
    sellingPrice: '',
    quantity: '',
    minStock: '5',
    image: null as File | null
  });

  const categories = ['engine', 'brake', 'tire', 'electrical', 'body', 'accessories', 'oil', 'filter'];

  const fetchParts = useCallback(async () => {
    try {
      let url = '/api/parts';
      if (showLowStock) {
        url = '/api/parts/low-stock/alert';
      }
      const res = await axios.get(url);
      setParts(res.data);
    } catch (err) {
      toast.error('ไม่สามารถดึงข้อมูลอะไหล่ได้');
    } finally {
      setLoading(false);
    }
  }, [showLowStock]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchParts();
    }
  }, [authLoading, user, fetchParts]);

  // Real-time updates with Socket.IO
  useEffect(() => {
    const socket = io(API_URL);

    socket.on('parts_update', (event: any) => {
      // If no event data or type is 'refresh', fetch all parts
      if (!event || event.type === 'refresh') {
        fetchParts();
        return;
      }

      if (event.type === 'create') {
        setParts(prev => [...prev, event.data]);
        toast.success(`เพิ่มอะไหล่ใหม่แล้ว: ${event.data.name}`);
      } else if (event.type === 'update') {
        setParts(prev => prev.map(p => p.id === event.data.id ? event.data : p));
      } else if (event.type === 'delete') {
        setParts(prev => prev.filter(p => p.id !== event.id));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchParts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('sku', formData.sku);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('supplier', formData.supplier);
      data.append('compatibleModels', formData.compatibleModels);
      data.append('sellingPrice', formData.sellingPrice);
      data.append('quantity', formData.quantity);
      data.append('minStock', formData.minStock);
      if (formData.image) {
        data.append('image', formData.image);
      }

      if (editingPart) {
        await axios.put(`/api/parts/${editingPart.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('อัปเดตข้อมูลอะไหล่เรียบร้อยแล้ว');
      } else {
        await axios.post('/api/parts', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('สร้างรายการอะไหล่เรียบร้อยแล้ว');
      }
      setShowModal(false);
      setEditingPart(null);
      resetForm();
      fetchParts();
    } catch (err) {
      console.error(err);
      toast.error('บันทึกข้อมูลไม่สำเร็จ');
    }
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      sku: part.sku,
      description: part.description,
      category: part.category,
      supplier: part.supplier,
      compatibleModels: part.compatible_models || '',
      sellingPrice: part.selling_price.toString(),
      quantity: part.quantity.toString(),
      minStock: part.min_stock.toString(),
      image: null
    });
    if (part.image_url) {
      setImagePreview(`${API_URL}${part.image_url}`);
    } else {
      setImagePreview(null);
    }
    setShowModal(true);
  };

  const handleDelete = async (partId: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบอะไหล่นี้?')) return;
    try {
      await axios.delete(`/api/parts/${partId}`);
      toast.success('ลบรายการอะไหล่เรียบร้อยแล้ว');
      fetchParts();
    } catch (err) {
      toast.error('ลบรายการไม่สำเร็จ');
    }
  };

  const updateStock = async (partId: number, newStock: number) => {
    try {
      await axios.put(`/api/parts/${partId}/stock`, { quantity: newStock });
      toast.success('อัปเดตสต็อกเรียบร้อยแล้ว');
      fetchParts();
    } catch (err) {
      toast.error('อัปเดตสต็อกไม่สำเร็จ');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      category: 'engine',
      supplier: '',
      compatibleModels: '',
      sellingPrice: '',
      quantity: '',
      minStock: '5',
      image: null
    });
    setImagePreview(null);
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      engine: 'bg-red-100 text-red-800',
      brake: 'bg-blue-100 text-blue-800',
      tire: 'bg-orange-100 text-orange-800',
      electrical: 'bg-yellow-100 text-yellow-800',
      body: 'bg-gray-100 text-gray-800',
      accessories: 'bg-purple-100 text-purple-800',
      oil: 'bg-green-100 text-green-800',
      filter: 'bg-cyan-100 text-cyan-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const isLowStock = (part: Part) => part.quantity <= part.min_stock;

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">คลังอะไหล่</h1>
              <p className="text-sm text-gray-500 mt-1">จัดการอะไหล่และคลังสินค้า</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLowStock(!showLowStock)}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                  showLowStock 
                    ? 'border-red-300 text-red-700 bg-red-50' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {showLowStock ? 'แสดงทั้งหมด' : 'สินค้าใกล้หมด'}
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setEditingPart(null);
                    resetForm();
                    setShowModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มอะไหล่
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ค้นหาอะไหล่ด้วยชื่อ, รหัสสินค้า, หรือผู้ผลิต..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">หมวดหมู่ทั้งหมด</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Parts Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อะไหล่</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สต็อก</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ราคา</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParts.map((part) => (
                  <tr key={part.id} className={isLowStock(part) ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                          {part.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={`${API_URL}${part.image_url}`} 
                              alt={part.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{part.name}</div>
                          <div className="text-sm text-gray-500">{part.sku} • {part.supplier}</div>
                          {part.compatible_models && (
                            <div className="text-xs text-primary-600 mt-1">รุ่นที่รองรับ: {part.compatible_models}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(part.category)}`}>
                        {part.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {user?.role === 'admin' ? (
                          <input
                            type="number"
                            min="0"
                            value={part.quantity}
                            onChange={(e) => updateStock(part.id, parseInt(e.target.value))}
                            className={`w-20 px-2 py-1 text-sm border rounded ${isLowStock(part) ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                          />
                        ) : (
                          <span className={`text-sm font-medium ${isLowStock(part) ? 'text-red-600' : 'text-gray-900'}`}>
                            {part.quantity}
                          </span>
                        )}
                        {isLowStock(part) && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">Min: {part.min_stock}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ฿{part.selling_price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user?.role === 'admin' && (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(part)}
                            className="p-2 text-gray-400 hover:text-primary-600"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(part.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredParts.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-gray-300" />
                <p className="mt-4 text-gray-500">ไม่พบข้อมูลอะไหล่</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>
              <div className="relative bg-white rounded-lg max-w-lg w-full p-6 max-h-screen overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editingPart ? 'แก้ไขข้อมูลอะไหล่' : 'เพิ่มอะไหล่ใหม่'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Image Upload */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="h-32 w-32 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary-500 transition-colors">
                        {imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-2">
                            <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                            <span className="text-xs text-gray-500 block mt-1">อัปโหลดรูปภาพ</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleFileChange}
                        />
                      </div>
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 shadow-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">รหัสสินค้า (SKU)</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ผู้จัดจำหน่าย</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ชื่ออะไหล่</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">รายละเอียด</label>
                    <textarea
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">รุ่นที่รองรับ (ระบุหลายรุ่นได้โดยใช้เครื่องหมายจุลภาค ,)</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="เช่น Wave 110i, Click 125i, PCX 160"
                      value={formData.compatibleModels}
                      onChange={(e) => setFormData({ ...formData, compatibleModels: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">หมวดหมู่</label>
                      <select
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ราคาขาย (฿)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">จำนวนสต็อก</label>
                      <input
                        type="number"
                        required
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">แจ้งเตือนเมื่อต่ำกว่า</label>
                      <input
                        type="number"
                        required
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.minStock}
                        onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      {editingPart ? 'บันทึกแก้ไข' : 'ยืนยันการสร้าง'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
    </ProtectedRoute>
  );
}
