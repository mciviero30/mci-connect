import React, { useState, useMemo } from 'react';
import { format, parseISO, isToday, isYesterday, subDays } from 'date-fns';
import { MapPin, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function formatHM(hours) {
  if (!hours) return '--';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function ShiftsMap({ entries, onClose }) {
  // Build Google Maps Static map URL with markers for each entry
  const markers = entries
    .filter(e => e.check_in_latitude && e.check_in_longitude)
    .map((e, i) => `markers=color:blue%7Clabel:${i + 1}%7C${e.check_in_latitude},${e.check_in_longitude}`)
    .join('&');

  if (!markers) {
    return (
      <div className="fixed inset-0 z-[10001] bg-white flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-slate-900">Today's Map</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          No GPS coordinates available for today's shifts
        </div>
      </div>
    );
  }

  const center = entries.find(e => e.check_in_latitude)
    ? `${entries.find(e => e.check_in_latitude).check_in_latitude},${entries.find(e => e.check_in_latitude).check_in_longitude}`
    : '0,0';

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=14&size=800x600&${markers}&key=${GOOGLE_MAPS_API_KEY}`;

  const googleMapsLink = entries
    .filter(e => e.check_in_latitude)
    .map(e => `${e.check_in_latitude},${e.check_in_longitude}`)
    .slice(0, 1)
    .map(coords => `https://maps.google.com/?q=${coords}`)
    [0];

  return (
    <div className="fixed inset-0 z-[10001] bg-white flex flex-col">
      <div className="p-4 flex items-center gap-3 border-b bg-white">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
          <X className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="font-bold text-slate-900 flex-1">
          {format(new Date(), 'EEE, MMM do')} · {entries.length} shift{entries.length !== 1 ? 's' : ''}
        </h2>
        {googleMapsLink && (
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 font-semibold px-3 py-1 rounded-full bg-blue-50"
          >
            Open Maps
          </a>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        {GOOGLE_MAPS_API_KEY ? (
          <img
            src={mapUrl}
            alt="Shift locations map"
            className="w-full h-full object-cover"
          />
        ) : (
          <iframe
            title="Shifts Map"
            className="w-full h-full border-0"
            src={`https://maps.google.com/maps?q=${center}&output=embed&z=14`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-white">
        <div className="space-y-2">
          {entries.filter(e => e.check_in_latitude).map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <span className="font-semibold text-slate-800 truncate">{e.job_name}</span>
              <span className="text-slate-500 ml-auto">{e.check_in} – {e.check_out || 'Active'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DailyShiftLog({ timeEntries = [], language = 'en' }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMap, setShowMap] = useState(false);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  const dayEntries = useMemo(() => {
    return timeEntries.filter(e => e.date === dateKey);
  }, [timeEntries, dateKey]);

  const totals = useMemo(() => {
    const regular = dayEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    return { regular };
  }, [dayEntries]);

  const dateLabel = isToday(selectedDate)
    ? (language === 'es' ? 'Hoy' : 'Today')
    : isYesterday(selectedDate)
    ? (language === 'es' ? 'Ayer' : 'Yesterday')
    : format(selectedDate, 'EEE, MMM do');

  const hasGPS = dayEntries.some(e => e.check_in_latitude);

  return (
    <>
      {showMap && (
        <ShiftsMap entries={dayEntries} onClose={() => setShowMap(false)} />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Date Navigator */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button
            onClick={() => setSelectedDate(d => subDays(d, 1))}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h3 className="font-bold text-slate-900 text-sm">{dateLabel}</h3>
          <button
            onClick={() => setSelectedDate(d => {
              const next = new Date(d);
              next.setDate(next.getDate() + 1);
              return next > new Date() ? d : next;
            })}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            {language === 'es' ? 'Turnos del día' : "Today's shifts"}
          </p>
          {hasGPS && (
            <button
              onClick={() => setShowMap(true)}
              className="flex items-center gap-1.5 text-blue-600 text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <MapPin className="w-3 h-3" />
              Map
            </button>
          )}
        </div>

        {/* Shifts List */}
        {dayEntries.length === 0 ? (
          <div className="px-4 pb-4 text-center py-8">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">
              {language === 'es' ? 'Sin registros para este día' : 'No shifts for this day'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-4 px-4 py-1 text-xs text-slate-400 font-semibold border-b border-slate-50">
              <span>Type</span>
              <span>Clock In</span>
              <span>Clock Out</span>
              <span>Total</span>
            </div>

            <div className="divide-y divide-slate-50">
              {dayEntries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-4 items-center px-4 py-3">
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white ${
                      entry.work_type === 'driving' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}>
                      {entry.job_name?.substring(0, 8) || 'Work'}
                    </span>
                  </div>
                  <span className="text-sm text-slate-700">{entry.check_in || '--'}</span>
                  <span className="text-sm text-slate-700">{entry.check_out || (
                    <span className="text-green-600 font-semibold text-xs">Active</span>
                  )}</span>
                  <div>
                    {entry.hours_worked ? (
                      <span className="font-bold text-slate-900">{formatHM(entry.hours_worked)}</span>
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                    {entry.total_break_minutes > 0 && (
                      <div className="text-xs text-amber-500">
                        {entry.total_break_minutes}m break
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mx-4 mb-4 mt-2 rounded-2xl bg-blue-600 p-4 text-white">
              <div className="grid grid-cols-3 mb-3">
                <div className="text-center">
                  <p className="text-blue-200 text-xs font-semibold">Breaks</p>
                  <p className="font-bold text-sm">
                    {dayEntries.reduce((s, e) => s + (e.total_break_minutes || 0), 0) > 0
                      ? `${dayEntries.reduce((s, e) => s + (e.total_break_minutes || 0), 0)}m`
                      : '--'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-blue-200 text-xs font-semibold">Regular</p>
                  <p className="font-bold text-sm">{formatHM(totals.regular)}</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-200 text-xs font-semibold">OT</p>
                  <p className="font-bold text-sm">--</p>
                </div>
              </div>
              <div className="text-center border-t border-blue-500 pt-3">
                <p className="text-blue-200 text-xs font-semibold mb-1">Total hours</p>
                <p className="text-3xl font-black">{formatHM(totals.regular)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}