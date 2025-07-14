'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Vehicle {
  make: string;
  model: string;
  year: number;
  price: number;
  image?: string;
  mileage?: number;
  condition?: string;
  color?: string;
  vin?: string;
  details?: string;
}

interface VehicleCardsSliderProps {
  vehicles: Vehicle[];
  title?: string;
  themeColor?: string;
}

export function VehicleCardsSlider({
  vehicles,
  title = 'Vehicle Results',
  themeColor = '#fe3500',
}: VehicleCardsSliderProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320; // Width of one card + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!vehicles || vehicles.length === 0) {
    return null;
  }

  return (
    <div className="vehicle-cards-slider">
      <h3 className="text-lg font-semibold mb-4" style={{ color: themeColor }}>
        {title}
      </h3>
      
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-2 hover:shadow-lg"
          style={{ color: themeColor }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {vehicles.map((vehicle, index) => (
            <div
              key={`${vehicle.vin || index}`}
              className="flex-none w-80 bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {vehicle.image && (
                <img
                  src={vehicle.image}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  className="w-full h-48 object-cover"
                />
              )}
              
              <div className="p-4">
                <h4 className="text-lg font-semibold">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h4>
                
                <p className="text-2xl font-bold mt-2" style={{ color: themeColor }}>
                  ${vehicle.price.toLocaleString()}
                </p>
                
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  {vehicle.mileage && (
                    <p>Mileage: {vehicle.mileage.toLocaleString()} miles</p>
                  )}
                  {vehicle.condition && <p>Condition: {vehicle.condition}</p>}
                  {vehicle.color && <p>Color: {vehicle.color}</p>}
                  {vehicle.vin && <p>VIN: {vehicle.vin}</p>}
                </div>
                
                {vehicle.details && (
                  <p className="mt-3 text-sm text-gray-700">{vehicle.details}</p>
                )}
                
                <button
                  className="mt-4 w-full py-2 rounded-md text-white font-medium hover:opacity-90"
                  style={{ backgroundColor: themeColor }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-2 hover:shadow-lg"
          style={{ color: themeColor }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}