'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowLeft, Calendar, User, Wrench, Clock, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface Booking {
  id: number;
  status: string;
  booking_date: string;
  created_at: string;
  mechanic_id: number | null;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  services: Service[];
  notes?: string;
}

export default function BookingDetailsPage({ params }: { params: { id: string } }) {
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await axios.get(`/api/bookings/${params.id}`);
        setBooking(response.data);
      } catch (error) {
        console.error('Error fetching booking:', error);
        toast.error('Failed to load booking details');
        // Optional: redirect or just show error
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchBooking();
    }
  }, [authLoading, params.id]);

  if (authLoading || loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'user', 'mechanic']}>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!booking) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'user', 'mechanic']}>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <p className="text-gray-500 mb-4">Booking not found</p>
            <button
              onClick={() => router.back()}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Go Back
            </button>
        </div>
      </ProtectedRoute>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'user', 'mechanic']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Bookings
        </button>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h1 className="text-2xl font-bold text-gray-900">
              Booking #{booking.id}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(booking.status)}`}>
              {booking.status}
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Customer Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-primary-600" />
                Customer Details
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="text-sm"><span className="font-medium text-gray-700">Name:</span> {booking.first_name} {booking.last_name}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Email:</span> {booking.email}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Phone:</span> {booking.phone}</p>
              </div>
            </div>

            {/* Booking Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary-600" />
                Booking Information
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="text-sm flex items-center">
                  <span className="font-medium text-gray-700 w-24">Date:</span>
                  {format(new Date(booking.booking_date), 'dd MMM yyyy HH:mm', { locale: th })}
                </p>
                <p className="text-sm flex items-center">
                  <span className="font-medium text-gray-700 w-24">Created:</span>
                  {format(new Date(booking.created_at), 'dd MMM yyyy HH:mm', { locale: th })}
                </p>
                {booking.mechanic_id && (
                  <p className="text-sm flex items-center">
                    <span className="font-medium text-gray-700 w-24">Mechanic:</span>
                    ID #{booking.mechanic_id}
                  </p>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-primary-600" />
                Services Requested
              </h2>
              {booking.services && booking.services.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {booking.services.map((service, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {service.duration} mins
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ฿{Number(service.price).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-medium">
                        <td className="px-6 py-4 text-sm text-gray-900 text-right" colSpan={2}>Total</td>
                        <td className="px-6 py-4 text-sm text-primary-600">
                          ฿{booking.services.reduce((sum, s) => sum + Number(s.price), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic">No services selected.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
