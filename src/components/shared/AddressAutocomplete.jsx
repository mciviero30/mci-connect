import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, X } from 'lucide-react';

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onPlaceSelected, 
  placeholder = "Enter address",
  className = "" 
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const debounceTimer = useRef(null);

  // Initialize Google Places Autocomplete (frontend only)
  useEffect(() => {
    const initializeGooglePlaces = () => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        const div = document.createElement('div');
        placesService.current = new window.google.maps.places.PlacesService(div);
      }
    };

    if (window.google?.maps?.places) {
      initializeGooglePlaces();
    } else {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Wait for existing script to load
        existingScript.addEventListener('load', initializeGooglePlaces);
      } else {
        // Load Google Maps Places API dynamically
        const script = document.createElement('script');
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        if (!apiKey) return;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initializeGooglePlaces;
        script.onerror = () => {
          console.error('Failed to load Google Maps API');
        };
        document.head.appendChild(script);
      }
    }
  }, []);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);

    // Debounce predictions
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (newValue.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 150);
  };

  const fetchPredictions = async (input) => {
    if (!autocompleteService.current || input.length < 2) return;

    setLoading(true);
    try {
      autocompleteService.current.getPlacePredictions(
        {
          input,
          types: ['address'],
          componentRestrictions: { country: 'us' }
        },
        (results, status) => {
          setLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results.slice(0, 5));
            setShowDropdown(true);
          } else {
            setPredictions([]);
            setShowDropdown(false);
          }
        }
      );
    } catch (error) {
      console.error('Places API error:', error);
      setLoading(false);
    }
  };

  const handleSelectPrediction = (prediction) => {
    setInputValue(prediction.description);
    onChange?.(prediction.description);
    setShowDropdown(false);

    // Get place details for full address breakdown
    if (placesService.current && prediction.place_id) {
      placesService.current.getDetails(
        { placeId: prediction.place_id },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const addressComponents = place.address_components || [];
            
            const getComponent = (type) => {
              const component = addressComponents.find(c => c.types.includes(type));
              return component?.long_name || '';
            };

            const placeData = {
              address: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
              city: getComponent('locality') || getComponent('sublocality'),
              state: getComponent('administrative_area_level_1'),
              zip: getComponent('postal_code'),
              full_address: prediction.description,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng()
            };

            onPlaceSelected?.(placeData);
          }
        }
      );
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange?.('');
    setPredictions([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pl-9 pr-8 ${className}`}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
        {inputValue && !loading && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Predictions Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {prediction.structured_formatting?.secondary_text || ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}