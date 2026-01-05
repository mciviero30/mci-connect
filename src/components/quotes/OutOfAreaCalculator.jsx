import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, Clock, Car, Calculator, Plus, Minus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function OutOfAreaCalculator({ 
  jobAddress, 
  selectedTeamIds,
  onAddTravelItems,
  isCalculating,
  setIsCalculating
}) {
  const { language } = useLanguage();
  const [travelMetrics, setTravelMetrics] = useState([]);
  const [error, setError] = useState(null);
  const [vehicleCounts, setVehicleCounts] = useState({});

  const calculateMetrics = async () => {
    if (!jobAddress || selectedTeamIds.length === 0) {
      setError(language === 'es' 
        ? 'Ingresa dirección del trabajo y selecciona al menos un equipo'
        : 'Enter job address and select at least one team');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('calculateTravelMetrics', {
        jobAddress,
        teamIds: selectedTeamIds
      });

      if (response.data.error) {
        setError(response.data.error);
        setIsCalculating(false);
        return;
      }

      if (response.data.results) {
        setTravelMetrics(response.data.results);
        
        // Initialize vehicle counts (default 1 per team)
        const counts = {};
        response.data.results.forEach(result => {
          if (result.success) {
            counts[result.teamId] = 1;
          }
        });
        setVehicleCounts(counts);
        
        // Show error if all calculations failed
        const allFailed = response.data.results.every(r => !r.success);
        if (allFailed) {
          const errorMessages = response.data.results.map(r => r.error).filter(Boolean).join(', ');
          setError(errorMessages || (language === 'es' 
            ? 'Error al calcular distancias para todos los equipos.'
            : 'Failed to calculate distances for all teams.'));
        }
      }
      
      setIsCalculating(false);
    } catch (err) {
      console.error('Error calculating travel metrics:', err);
      const errorMessage = err.data?.error || err.message;
      setError(errorMessage || (language === 'es' 
        ? 'Error al calcular distancias. Verifica que GOOGLE_MAPS_API_KEY esté configurado.'
        : 'Failed to calculate distances. Check that GOOGLE_MAPS_API_KEY is configured.'));
      setIsCalculating(false);
    }
  };

  const updateVehicleCount = (teamId, delta) => {
    setVehicleCounts(prev => ({
      ...prev,
      [teamId]: Math.max(1, (prev[teamId] || 1) + delta)
    }));
  };

  const addItemsToQuote = () => {
    const items = [];

    travelMetrics.forEach(metric => {
      if (!metric.success) return;

      const vehicleCount = vehicleCounts[metric.teamId] || 1;
      const milesPerVehicle = parseFloat(metric.totalMiles);
      const drivingHours = parseFloat(metric.drivingHours);

      // Driving Time item
      items.push({
        item_name: `Driving Time - ${metric.teamName}`,
        description: `Round trip driving from ${metric.teamLocation} to job site (${metric.roundTripMiles} mi + 10% buffer)`,
        quantity: drivingHours,
        unit: 'hours',
        unit_price: 25, // Default hourly rate for driving
        total: drivingHours * 25,
        is_travel_item: true,
        travel_item_type: 'driving_time',
        team_id: metric.teamId,
        account_category: 'expense_travel_per_diem'
      });

      // Miles per Vehicle item
      items.push({
        item_name: `Miles per Vehicle - ${metric.teamName}`,
        description: `${vehicleCount} vehicle${vehicleCount > 1 ? 's' : ''} × ${milesPerVehicle} miles round trip`,
        quantity: milesPerVehicle * vehicleCount,
        unit: 'miles',
        unit_price: 0.70,
        total: milesPerVehicle * vehicleCount * 0.70,
        is_travel_item: true,
        travel_item_type: 'miles_per_vehicle',
        team_id: metric.teamId,
        vehicle_count: vehicleCount,
        account_category: 'expense_travel_per_diem'
      });
    });

    onAddTravelItems(items);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border-2 border-blue-200/40 dark:border-blue-700/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base">
          <Calculator className="w-5 h-5 text-blue-600" />
          {language === 'es' ? 'Calcular Viaje Fuera de Área' : 'Calculate Out of Area Travel'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!travelMetrics.length && (
          <Button 
            onClick={calculateMetrics}
            disabled={isCalculating || !jobAddress || selectedTeamIds.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {isCalculating 
              ? (language === 'es' ? 'Calculando...' : 'Calculating...') 
              : (language === 'es' ? 'Calcular Distancias' : 'Calculate Distances')}
          </Button>
        )}

        {travelMetrics.length > 0 && (
          <div className="space-y-4">
            {travelMetrics.map(metric => (
              <Card key={metric.teamId} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{metric.teamName}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{metric.teamLocation}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {metric.success ? '✓' : '✗'}
                    </Badge>
                  </div>

                  {metric.success ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {language === 'es' ? 'Tiempo' : 'Driving Time'}
                            </p>
                            <p className="font-bold text-slate-900 dark:text-white">{metric.drivingHours}h</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                          <Car className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {language === 'es' ? 'Millas' : 'Miles'}
                            </p>
                            <p className="font-bold text-slate-900 dark:text-white">{metric.totalMiles} mi</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2 block">
                          {language === 'es' ? 'Número de Vehículos' : 'Number of Vehicles'}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateVehicleCount(metric.teamId, -1)}
                            disabled={(vehicleCounts[metric.teamId] || 1) <= 1}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={vehicleCounts[metric.teamId] || 1}
                            onChange={(e) => setVehicleCounts(prev => ({
                              ...prev,
                              [metric.teamId]: parseInt(e.target.value) || 1
                            }))}
                            className="w-16 text-center h-8"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateVehicleCount(metric.teamId, 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                            = {(parseFloat(metric.totalMiles) * (vehicleCounts[metric.teamId] || 1)).toFixed(1)} {language === 'es' ? 'millas totales' : 'total miles'}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400">{metric.error}</p>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setTravelMetrics([]);
                  setVehicleCounts({});
                }}
                className="flex-1"
              >
                {language === 'es' ? 'Recalcular' : 'Recalculate'}
              </Button>
              <Button
                onClick={addItemsToQuote}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
              >
                {language === 'es' ? 'Agregar Items' : 'Add Items to Quote'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}