import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Hotel, Car, Plus, Calendar, DollarSign, Users, MapPin, FileText } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { format } from 'date-fns';
import TravelBookingDialog from '@/components/travel/TravelBookingDialog';
import EmployeeTravelView from '@/components/travel/EmployeeTravelView';

export default function TravelBookingsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  // Fetch current user
  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      return userData;
    }
  });

  const isAdmin = user?.role === 'admin';
  const userEmail = user?.email;

  // Fetch all travel bookings (admin) or only user's bookings (employee)
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['travelBookings', userEmail],
    queryFn: async () => {
      if (isAdmin) {
        return await base44.entities.TravelBooking.list('-created_date');
      } else {
        // Employee: only their bookings
        return await base44.entities.TravelBooking.filter({
          assigned_employees: { $contains: userEmail }
        }, '-created_date');
      }
    },
    enabled: !!userEmail
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (bookingData) => {
      // Calculate total cost
      const totalCost = 
        (bookingData.hotel_cost || 0) + 
        (bookingData.flight_cost || 0) + 
        (bookingData.rental_car_cost || 0);
      
      const dataToSave = {
        ...bookingData,
        total_cost: totalCost
      };

      if (selectedBooking) {
        return await base44.entities.TravelBooking.update(selectedBooking.id, dataToSave);
      } else {
        return await base44.entities.TravelBooking.create(dataToSave);
      }
    },
    onSuccess: async (savedBooking) => {
      queryClient.invalidateQueries({ queryKey: ['travelBookings'] });
      setShowDialog(false);
      setSelectedBooking(null);

      // Auto-create expense if booking is completed and has costs
      if (savedBooking.status === 'booked' && savedBooking.total_cost > 0 && !savedBooking.expense_created) {
        try {
          const expense = await base44.entities.Expense.create({
            employee_email: savedBooking.booked_by || user?.email,
            employee_name: 'Travel Booking',
            job_id: savedBooking.job_id,
            job_name: savedBooking.job_name,
            amount: savedBooking.total_cost,
            category: 'travel',
            description: `Travel expenses for ${savedBooking.job_name} (${format(new Date(savedBooking.travel_start_date), 'MMM d')} - ${format(new Date(savedBooking.travel_end_date), 'MMM d')})`,
            date: savedBooking.travel_start_date,
            status: 'approved',
            payment_method: 'company_card'
          });

          // Update booking with expense ID
          await base44.entities.TravelBooking.update(savedBooking.id, {
            expense_created: true,
            expense_id: expense.id
          });

          queryClient.invalidateQueries({ queryKey: ['travelBookings'] });
        } catch (error) {
          console.error('Failed to create expense:', error);
        }
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.TravelBooking.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelBookings'] });
      setShowDialog(false);
      setSelectedBooking(null);
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'booked': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransportIcon = (type) => {
    if (type === 'flight') return <Plane className="w-4 h-4" />;
    if (type === 'car') return <Car className="w-4 h-4" />;
    return <><Plane className="w-4 h-4" /><Car className="w-4 h-4" /></>;
  };

  if (!isAdmin) {
    return <EmployeeTravelView bookings={bookings} user={user} />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <PageHeader
        title="Travel Bookings"
        description="Manage travel arrangements for employees"
        icon={Plane}
        badge={`${bookings.length} Bookings`}
        actions={
          <Button onClick={() => {
            setSelectedBooking(null);
            setShowDialog(true);
          }} className="bg-[#1E3A8A]">
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Plane className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No travel bookings yet</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4 bg-[#1E3A8A]">
              <Plus className="w-4 h-4 mr-2" />
              Create First Booking
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card 
              key={booking.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedBooking(booking);
                setShowDialog(true);
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getTransportIcon(booking.transportation_type)}
                      {booking.job_name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(booking.travel_start_date), 'MMM d, yyyy')} - {format(new Date(booking.travel_end_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{booking.assigned_employees?.length || 0} employees</span>
                  </div>
                  
                  {booking.hotel_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hotel className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">{booking.hotel_name}</span>
                    </div>
                  )}
                  
                  {booking.flight_airline && (
                    <div className="flex items-center gap-2 text-sm">
                      <Plane className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">{booking.flight_airline}</span>
                    </div>
                  )}
                  
                  {booking.rental_car_company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="w-4 h-4 text-purple-600" />
                      <span className="text-gray-700">{booking.rental_car_company}</span>
                    </div>
                  )}
                </div>

                {booking.total_cost > 0 && (
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <DollarSign className="w-4 h-4" />
                      Total Cost: ${booking.total_cost.toFixed(2)}
                    </div>
                    {booking.expense_created && (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Expense Created
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showDialog && (
        <TravelBookingDialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) setSelectedBooking(null);
          }}
          booking={selectedBooking}
          onSubmit={(data) => saveMutation.mutate(data)}
          onDelete={(id) => deleteMutation.mutate(id)}
          isProcessing={saveMutation.isPending || deleteMutation.isPending}
        />
      )}
    </div>
  );
}