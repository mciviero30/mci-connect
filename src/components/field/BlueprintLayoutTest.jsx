import React from 'react';
import DrawingView from './DrawingView';

export default function BlueprintLayoutTest() {
  // URL de blueprint de prueba - usa una imagen real o placeholder
  const testBlueprintUrl = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&h=800&fit=crop';

  return (
    <div className="w-screen h-screen bg-gray-100 p-4">
      <div className="w-full h-full bg-white shadow-lg overflow-hidden">
        <DrawingView 
          jobId="TEST-123"
          blueprintUrl={testBlueprintUrl}
        />
      </div>
    </div>
  );
}