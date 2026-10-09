import React from 'react';

export function ActiveOrdersModule() {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all cursor-pointer max-w-[340px]">
      {/* Decorative background element for the top right corner */}
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-blue-50/50 blur-3xl pointer-events-none"></div>

      <div className="relative flex items-start gap-5">
        {/* Icon Container */}
        <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[20px] bg-[#007AFF]">
          {/* Using emoji for simplicity, though an SVG matching the image would be more precise */}
          <span className="text-[32px] select-none" role="img" aria-label="car">🚗</span>
        </div>

        {/* Text Content */}
        <div className="flex flex-col pt-1">
          <h3 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none mb-3">
            Órdenes Activas
          </h3>
          <p className="text-[15px] leading-relaxed text-slate-500">
            Gestión de vehículos en taller y estado de reparación.
          </p>
        </div>
      </div>
    </div>
  );
}
