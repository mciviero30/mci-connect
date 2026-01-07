import React, { useState, useRef, useEffect } from 'react';
import { HORIZONTAL_TYPES, VERTICAL_TYPES, formatMeasurement } from '@/components/field/utils/dimensionLogic';

/**
 * Interactive Measurement Overlay Component
 * Renders horizontal and vertical measurements as SVG overlays
 */
export default function MeasurementOverlay({ 
  measurements = [],
  verticalMeasurements = [],
  benchmarks = [],
  imageSize,
  zoom,
  visible = true,
  onMeasurementTap,
  onMeasurementLongPress,
  onMeasurementDrag
}) {
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [draggingItem, setDraggingItem] = useState(null);

  if (!visible || imageSize.width === 0 || imageSize.height === 0) return null;

  const handleTouchStart = (item, type, e) => {
    e.stopPropagation();
    
    // Long press detection (500ms)
    const timer = setTimeout(() => {
      if (onMeasurementLongPress) {
        onMeasurementLongPress(item, type);
      }
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleTouchEnd = (item, type, e) => {
    e.stopPropagation();
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // If timer was active, it's a tap
      if (onMeasurementTap) {
        onMeasurementTap(item, type);
      }
    }
  };

  const handleClick = (item, type, e) => {
    e.stopPropagation();
    if (onMeasurementTap) {
      onMeasurementTap(item, type);
    }
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
      viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
      preserveAspectRatio="xMinYMin meet"
    >
      {/* Render Benchmarks - Horizontal reference lines */}
      {benchmarks.map((benchmark) => (
        <g key={benchmark.id} className="pointer-events-auto cursor-pointer">
          <line
            x1="0"
            y1={imageSize.height * 0.5}
            x2={imageSize.width}
            y2={imageSize.height * 0.5}
            stroke={benchmark.color}
            strokeWidth={4 / zoom}
            strokeDasharray="10,5"
            style={{ 
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
            onClick={(e) => handleClick(benchmark, 'benchmark', e)}
            onTouchStart={(e) => handleTouchStart(benchmark, 'benchmark', e)}
            onTouchEnd={(e) => handleTouchEnd(benchmark, 'benchmark', e)}
          />
          <text
            x={imageSize.width * 0.02}
            y={imageSize.height * 0.5 - 10 / zoom}
            fill={benchmark.color}
            fontSize={16 / zoom}
            fontWeight="bold"
            style={{
              textShadow: '0 0 8px white, 0 0 8px white, 0 0 8px white',
              userSelect: 'none'
            }}
          >
            BM: {benchmark.label}
          </text>
        </g>
      ))}

      {/* Render Horizontal Measurements */}
      {measurements.map((measurement) => {
        const config = HORIZONTAL_TYPES[measurement.measurement_type];
        if (!config) return null;

        // Calculate position (stored as percentages)
        const x = (measurement.visual_x || 50) / 100 * imageSize.width;
        const y = (measurement.visual_y || 50) / 100 * imageSize.height;
        const length = 100 / zoom; // Visual length of measurement line

        return (
          <g 
            key={measurement.id} 
            className="pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => handleClick(measurement, 'horizontal', e)}
            onTouchStart={(e) => handleTouchStart(measurement, 'horizontal', e)}
            onTouchEnd={(e) => handleTouchEnd(measurement, 'horizontal', e)}
          >
            {/* Measurement line */}
            <line
              x1={x - length / 2}
              y1={y}
              x2={x + length / 2}
              y2={y}
              stroke={measurement.color}
              strokeWidth={3 / zoom}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            />
            
            {/* End caps */}
            <line
              x1={x - length / 2}
              y1={y - 8 / zoom}
              x2={x - length / 2}
              y2={y + 8 / zoom}
              stroke={measurement.color}
              strokeWidth={2 / zoom}
            />
            <line
              x1={x + length / 2}
              y1={y - 8 / zoom}
              x2={x + length / 2}
              y2={y + 8 / zoom}
              stroke={measurement.color}
              strokeWidth={2 / zoom}
            />
            
            {/* Label with type and value */}
            <rect
              x={x - 50 / zoom}
              y={y - 30 / zoom}
              width={100 / zoom}
              height={20 / zoom}
              rx={4 / zoom}
              fill="white"
              stroke={measurement.color}
              strokeWidth={2 / zoom}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' }}
            />
            <text
              x={x}
              y={y - 15 / zoom}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={measurement.color}
              fontSize={12 / zoom}
              fontWeight="bold"
              style={{ userSelect: 'none' }}
            >
              {config.label} {formatMeasurement(measurement.value, measurement.unit)}
            </text>
          </g>
        );
      })}

      {/* Render Vertical Measurements */}
      {verticalMeasurements.map((measurement) => {
        const config = VERTICAL_TYPES[measurement.type];
        if (!config) return null;

        const x = (measurement.visual_x || 50) / 100 * imageSize.width;
        const y = (measurement.visual_y || 50) / 100 * imageSize.height;
        const length = 80 / zoom;

        return (
          <g 
            key={measurement.id}
            className="pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => handleClick(measurement, 'vertical', e)}
            onTouchStart={(e) => handleTouchStart(measurement, 'vertical', e)}
            onTouchEnd={(e) => handleTouchEnd(measurement, 'vertical', e)}
          >
            {/* Vertical measurement line */}
            <line
              x1={x}
              y1={y - length / 2}
              x2={x}
              y2={y + length / 2}
              stroke={measurement.color}
              strokeWidth={3 / zoom}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            />
            
            {/* End caps */}
            <line
              x1={x - 8 / zoom}
              y1={y - length / 2}
              x2={x + 8 / zoom}
              y2={y - length / 2}
              stroke={measurement.color}
              strokeWidth={2 / zoom}
            />
            <line
              x1={x - 8 / zoom}
              y1={y + length / 2}
              x2={x + 8 / zoom}
              y2={y + length / 2}
              stroke={measurement.color}
              strokeWidth={2 / zoom}
            />
            
            {/* Label */}
            <rect
              x={x + 12 / zoom}
              y={y - 10 / zoom}
              width={90 / zoom}
              height={20 / zoom}
              rx={4 / zoom}
              fill="white"
              stroke={measurement.color}
              strokeWidth={2 / zoom}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' }}
            />
            <text
              x={x + 57 / zoom}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={measurement.color}
              fontSize={11 / zoom}
              fontWeight="bold"
              style={{ userSelect: 'none' }}
            >
              {config.label} {formatMeasurement(measurement.value, measurement.unit)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}