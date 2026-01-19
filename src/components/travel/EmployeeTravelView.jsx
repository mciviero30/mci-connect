import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Hotel, Car, Calendar, MapPin, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';

export default function EmployeeTravelView({ bookings, user }) {
  const upcomingTrips = bookings.filter(b => 
    new Date(b.travel_start_date) >= new Date() && b.status === 'booked'
  );
  
  const pastTrips = bookings.filter(b => 
    new Date(b.travel_end_date) < new Date() || b.status === 'completed'
  );

  const TravelCard = ({ booking }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{booking.job_name}</CardTitle>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              {format(new Date(booking.travel_start_date), 'MMM d, yyyy')} - {format(new Date(booking.travel_end_date), 'MMM d, yyyy')}
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800">
            {booking.transportation_type === 'flight' ? 'Flight' : 
             booking.transportation_type === 'car' ? 'Car' : 'Flight + Car'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hotel Info */}
        {booking.hotel_name && (
          <div className="p-4 bg-blue-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold text-blue-900">
              <Hotel className="w-5 h-5" />
              Hotel Information
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {booking.hotel_name}</p>
              {booking.hotel_address && <p><span className="font-medium">Address:</span> {booking.hotel_address}</p>}
              {booking.hotel_reservation_name && <p><span className="font-medium">Reservation Name:</span> {booking.hotel_reservation_name}</p>}
              {booking.hotel_confirmation_number && <p><span className="font-medium">Confirmation #:</span> {booking.hotel_confirmation_number}</p>}
              {booking.hotel_check_in && (
                <p><span className="font-medium">Check-in:</span> {format(new Date(booking.hotel_check_in), 'MMM d, yyyy')}</p>
              )}
              {booking.hotel_check_out && (
                <p><span className="font-medium">Check-out:</span> {format(new Date(booking.hotel_check_out), 'MMM d, yyyy')}</p>
              )}
            </div>
          </div>
        )}

        {/* Flight Info */}
        {booking.flight_airline && (
          <div className="p-4 bg-green-50 rounded-lg space-y-3">
            <div className="flex items-center gap-2 font-semibold text-green-900">
              <Plane className="w-5 h-5" />
              Flight Information
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Airline:</span> {booking.flight_airline}</p>
              {booking.flight_confirmation_number && <p><span className="font-medium">Confirmation #:</span> {booking.flight_confirmation_number}</p>}
            </div>
            
            {booking.flight_outbound_number && (
              <div className="pl-4 border-l-2 border-green-300 space-y-1 text-sm">
                <p className="font-medium text-green-800">Outbound Flight</p>
                <p>Flight: {booking.flight_outbound_number}</p>
                {booking.flight_outbound_departure && <p>Departure: {booking.flight_outbound_departure}</p>}
                {booking.flight_outbound_arrival && <p>Arrival: {booking.flight_outbound_arrival}</p>}
              </div>
            )}
            
            {booking.flight_return_number && (
              <div className="pl-4 border-l-2 border-green-300 space-y-1 text-sm">
                <p className="font-medium text-green-800">Return Flight</p>
                <p>Flight: {booking.flight_return_number}</p>
                {booking.flight_return_departure && <p>Departure: {booking.flight_return_departure}</p>}
                {booking.flight_return_arrival && <p>Arrival: {booking.flight_return_arrival}</p>}
              </div>
            )}
          </div>
        )}

        {/* Rental Car Info */}
        {booking.rental_car_company && (
          <div className="p-4 bg-purple-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold text-purple-900">
              <Car className="w-5 h-5" />
              Rental Car
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Company:</span> {booking.rental_car_company}</p>
              {booking.rental_car_confirmation && <p><span className="font-medium">Confirmation #:</span> {booking.rental_car_confirmation}</p>}
              {booking.rental_car_pickup_location && <p><span className="font-medium">Pickup:</span> {booking.rental_car_pickup_location}</p>}
              {booking.rental_car_return_location && <p><span className="font-medium">Return:</span> {booking.rental_car_return_location}</p>}
            </div>
          </div>
        )}

        {/* Special Notes */}
        {booking.special_notes && (
          <div className="p-4 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2 font-semibold text-amber-900 mb-2">
              <FileText className="w-4 h-4" />
              Important Notes
            </div>
            <p className="text-sm text-amber-900">{booking.special_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <PageHeader
        title="My Travel Information"
        description="View your upcoming and past travel arrangements"
        icon={Plane}
        badge={`${upcomingTrips.length} Upcoming`}
      />

      {upcomingTrips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Upcoming Trips</h2>
          <div className="grid gap-4">
            {upcomingTrips.map(booking => (
              <TravelCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      )}

      {pastTrips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Past Trips</h2>
          <div className="grid gap-4">
            {pastTrips.map(booking => (
              <TravelCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Plane className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No travel bookings yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}