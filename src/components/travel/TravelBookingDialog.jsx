import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Save, Trash2, Hotel, Plane, Car, Users, Calendar } from 'lucide-react';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';

export default function TravelBookingDialog({ open, onOpenChange, booking, onSubmit, onDelete, isProcessing }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    job_id: '',
    job_name: '',
    assigned_employees: [],
    assigned_employee_names: [],
    travel_start_date: '',
    travel_end_date: '',
    transportation_type: 'car',
    status: 'pending',
    hotel_name: '',
    hotel_address: '',
    hotel_reservation_name: '',
    hotel_confirmation_number: '',
    hotel_check_in: '',
    hotel_check_out: '',
    hotel_cost: 0,
    flight_airline: '',
    flight_confirmation_number: '',
    flight_outbound_number: '',
    flight_outbound_departure: '',
    flight_outbound_arrival: '',
    flight_return_number: '',
    flight_return_departure: '',
    flight_return_arrival: '',
    flight_cost: 0,
    rental_car_company: '',
    rental_car_confirmation: '',
    rental_car_pickup_location: '',
    rental_car_return_location: '',
    rental_car_cost: 0,
    special_notes: '',
    internal_notes: ''
  });

  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      return userData;
    }
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list()
  });

  useEffect(() => {
    if (booking) {
      setFormData(booking);
    } else {
      setFormData({
        job_id: '',
        job_name: '',
        assigned_employees: [],
        assigned_employee_names: [],
        travel_start_date: '',
        travel_end_date: '',
        transportation_type: 'car',
        status: 'pending',
        hotel_name: '',
        hotel_address: '',
        hotel_reservation_name: '',
        hotel_confirmation_number: '',
        hotel_check_in: '',
        hotel_check_out: '',
        hotel_cost: 0,
        flight_airline: '',
        flight_confirmation_number: '',
        flight_outbound_number: '',
        flight_outbound_departure: '',
        flight_outbound_arrival: '',
        flight_return_number: '',
        flight_return_departure: '',
        flight_return_arrival: '',
        flight_cost: 0,
        rental_car_company: '',
        rental_car_confirmation: '',
        rental_car_pickup_location: '',
        rental_car_return_location: '',
        rental_car_cost: 0,
        special_notes: '',
        internal_notes: ''
      });
    }
  }, [booking]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      requested_by: booking?.requested_by || user?.email,
      booked_by: user?.email
    };
    onSubmit(dataToSubmit);
  };

  const handleJobChange = (jobId) => {
    const selectedJob = jobs.find(j => j.id === jobId);
    setFormData(prev => ({
      ...prev,
      job_id: jobId,
      job_name: selectedJob?.name || ''
    }));
  };

  const handleEmployeeToggle = (employeeEmail) => {
    const employee = employees.find(e => e.email === employeeEmail);
    setFormData(prev => {
      const isSelected = prev.assigned_employees.includes(employeeEmail);
      if (isSelected) {
        return {
          ...prev,
          assigned_employees: prev.assigned_employees.filter(e => e !== employeeEmail),
          assigned_employee_names: prev.assigned_employee_names.filter((_, i) => 
            prev.assigned_employees[i] !== employeeEmail
          )
        };
      } else {
        return {
          ...prev,
          assigned_employees: [...prev.assigned_employees, employeeEmail],
          assigned_employee_names: [...prev.assigned_employee_names, employee?.full_name || employeeEmail]
        };
      }
    });
  };

  const activeEmployees = employees.filter(e => e.employment_status === 'active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#1E3A8A]">
            {booking ? 'Edit Travel Booking' : 'New Travel Booking'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Job / Project *</Label>
              <Select value={formData.job_id} onValueChange={handleJobChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Assigned Employees *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {formData.assigned_employees.length === 0 ? (
                    "Select employees..."
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {formData.assigned_employees.map((email, i) => (
                        <Badge key={email} variant="secondary">
                          {formData.assigned_employee_names[i] || email}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search employee..." />
                  <CommandEmpty>Not found.</CommandEmpty>
                  <CommandGroup>
                    {activeEmployees.map(emp => (
                      <CommandItem
                        key={emp.email}
                        onSelect={() => handleEmployeeToggle(emp.email)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 ${formData.assigned_employees.includes(emp.email) ? 'bg-blue-600' : 'border-gray-400'}`} />
                          {emp.full_name || emp.email}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Travel Start Date *</Label>
              <Input 
                type="date" 
                value={formData.travel_start_date} 
                onChange={(e) => setFormData(prev => ({ ...prev, travel_start_date: e.target.value }))}
                required 
              />
            </div>
            <div>
              <Label>Travel End Date *</Label>
              <Input 
                type="date" 
                value={formData.travel_end_date} 
                onChange={(e) => setFormData(prev => ({ ...prev, travel_end_date: e.target.value }))}
                required 
              />
            </div>
            <div>
              <Label>Transportation *</Label>
              <Select value={formData.transportation_type} onValueChange={(val) => setFormData(prev => ({ ...prev, transportation_type: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flight">Flight</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="hotel" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="hotel"><Hotel className="w-4 h-4 mr-2" />Hotel</TabsTrigger>
              <TabsTrigger value="flight"><Plane className="w-4 h-4 mr-2" />Flight</TabsTrigger>
              <TabsTrigger value="rental"><Car className="w-4 h-4 mr-2" />Rental Car</TabsTrigger>
            </TabsList>

            <TabsContent value="hotel" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hotel Name</Label>
                  <Input value={formData.hotel_name} onChange={(e) => setFormData(prev => ({ ...prev, hotel_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Reservation Name</Label>
                  <Input value={formData.hotel_reservation_name} onChange={(e) => setFormData(prev => ({ ...prev, hotel_reservation_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={formData.hotel_address} onChange={(e) => setFormData(prev => ({ ...prev, hotel_address: e.target.value }))} />
                </div>
                <div>
                  <Label>Confirmation Number</Label>
                  <Input value={formData.hotel_confirmation_number} onChange={(e) => setFormData(prev => ({ ...prev, hotel_confirmation_number: e.target.value }))} />
                </div>
                <div>
                  <Label>Check-in Date</Label>
                  <Input type="date" value={formData.hotel_check_in} onChange={(e) => setFormData(prev => ({ ...prev, hotel_check_in: e.target.value }))} />
                </div>
                <div>
                  <Label>Check-out Date</Label>
                  <Input type="date" value={formData.hotel_check_out} onChange={(e) => setFormData(prev => ({ ...prev, hotel_check_out: e.target.value }))} />
                </div>
                <div>
                  <Label>Cost (Hidden from employees)</Label>
                  <Input type="number" step="0.01" value={formData.hotel_cost} onChange={(e) => setFormData(prev => ({ ...prev, hotel_cost: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="flight" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Airline</Label>
                  <Input value={formData.flight_airline} onChange={(e) => setFormData(prev => ({ ...prev, flight_airline: e.target.value }))} />
                </div>
                <div>
                  <Label>Confirmation Number</Label>
                  <Input value={formData.flight_confirmation_number} onChange={(e) => setFormData(prev => ({ ...prev, flight_confirmation_number: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900">Outbound Flight</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Flight Number</Label>
                    <Input value={formData.flight_outbound_number} onChange={(e) => setFormData(prev => ({ ...prev, flight_outbound_number: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Departure (e.g. ATL 8:00 AM)</Label>
                    <Input value={formData.flight_outbound_departure} onChange={(e) => setFormData(prev => ({ ...prev, flight_outbound_departure: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Arrival (e.g. LAX 11:00 AM)</Label>
                    <Input value={formData.flight_outbound_arrival} onChange={(e) => setFormData(prev => ({ ...prev, flight_outbound_arrival: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900">Return Flight</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Flight Number</Label>
                    <Input value={formData.flight_return_number} onChange={(e) => setFormData(prev => ({ ...prev, flight_return_number: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Departure</Label>
                    <Input value={formData.flight_return_departure} onChange={(e) => setFormData(prev => ({ ...prev, flight_return_departure: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Arrival</Label>
                    <Input value={formData.flight_return_arrival} onChange={(e) => setFormData(prev => ({ ...prev, flight_return_arrival: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <Label>Total Flight Cost (Hidden from employees)</Label>
                <Input type="number" step="0.01" value={formData.flight_cost} onChange={(e) => setFormData(prev => ({ ...prev, flight_cost: parseFloat(e.target.value) || 0 }))} />
              </div>
            </TabsContent>

            <TabsContent value="rental" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rental Company</Label>
                  <Input value={formData.rental_car_company} onChange={(e) => setFormData(prev => ({ ...prev, rental_car_company: e.target.value }))} />
                </div>
                <div>
                  <Label>Confirmation Number</Label>
                  <Input value={formData.rental_car_confirmation} onChange={(e) => setFormData(prev => ({ ...prev, rental_car_confirmation: e.target.value }))} />
                </div>
                <div>
                  <Label>Pickup Location</Label>
                  <Input value={formData.rental_car_pickup_location} onChange={(e) => setFormData(prev => ({ ...prev, rental_car_pickup_location: e.target.value }))} />
                </div>
                <div>
                  <Label>Return Location</Label>
                  <Input value={formData.rental_car_return_location} onChange={(e) => setFormData(prev => ({ ...prev, rental_car_return_location: e.target.value }))} />
                </div>
                <div>
                  <Label>Cost (Hidden from employees)</Label>
                  <Input type="number" step="0.01" value={formData.rental_car_cost} onChange={(e) => setFormData(prev => ({ ...prev, rental_car_cost: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Special Notes (Visible to employees)</Label>
              <Textarea value={formData.special_notes} onChange={(e) => setFormData(prev => ({ ...prev, special_notes: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Internal Notes (HR/Admin only)</Label>
              <Textarea value={formData.internal_notes} onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))} rows={3} />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            {booking && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => onDelete(booking.id)}
                disabled={isProcessing}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing} className="bg-[#1E3A8A]">
                <Save className="w-4 h-4 mr-2" />
                {isProcessing ? 'Saving...' : 'Save Booking'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}