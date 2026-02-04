'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Package, Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: 'engine',
    supplier: '',
    sellingPrice: '',
    quantity: '',
    minStock: '5'
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
      toast.error('Failed to fetch parts');
    } finally {
      setLoading(false);
    }
  }, [showLowStock]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchParts();
    }
  }, [authLoading, user, fetchParts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPart) {
        await axios.put(`/api/parts/${editingPart.id}`, formData);
        toast.success('Part updated successfully');
      } else {
        await axios.post('/api/parts', formData);
        toast.success('Part created successfully');
      }
      setShowModal(false);
      setEditingPart(null);
      resetForm();
      fetchParts();
    } catch (err) {
      toast.error('Failed to save part');
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
      sellingPrice: part.selling_price.toString(),
      quantity: part.quantity.toString(),
      minStock: part.min_stock.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (partId: number) => {
    if (!confirm('Are you sure you want to delete this part?')) return;
    try {
      await axios.delete(`/api/parts/${partId}`);
      toast.success('Part deleted successfully');
      fetchParts();
    } catch (err) {
      toast.error('Failed to delete part');
    }
  };

  const updateStock = async (partId: number, newStock: number) => {
    try {
      await axios.put(`/api/parts/${partId}/stock`, { quantity: newStock });
      toast.success('Stock updated');
      fetchParts();
    } catch (err) {
      toast.error('Failed to update stock');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      category: 'engine',
      supplier: '',
      sellingPrice: '',
      quantity: '',
      minStock: '5'
    });
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
              <h1 className="text-2xl font-bold text-gray-900">Parts Inventory</h1>
              <p className="text-sm text-gray-500 mt-1">Manage spare parts and inventory</p>
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
                {showLowStock ? 'Show All' : 'Low Stock'}
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
                  Add Part
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
                placeholder="Search parts by name, SKU, or supplier..."
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
              <option value="">All Categories</option>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParts.map((part) => (
                  <tr key={part.id} className={isLowStock(part) ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{part.name}</div>
                          <div className="text-sm text-gray-500">{part.sku} • {part.supplier}</div>
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
                <p className="mt-4 text-gray-500">No parts found</p>
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
                  {editingPart ? 'Edit Part' : 'Add New Part'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Part SKU</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Supplier</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
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
                      <label className="block text-sm font-medium text-gray-700">Price (฿)</label>
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
                      <label className="block text-sm font-medium text-gray-700">Stock</label>
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
                      <label className="block text-sm font-medium text-gray-700">Min Stock</label>
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
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      {editingPart ? 'Update' : 'Create'}
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
