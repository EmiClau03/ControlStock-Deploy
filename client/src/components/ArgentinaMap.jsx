import React, { useState } from 'react';

const ArgentinaMap = ({ data, onProvinceClick }) => {
  const [hoveredProvince, setHoveredProvince] = useState(null);

  // Simplified paths for Argentina Provinces
  // Note: These are representative paths for a clean visualization
  const provincePaths = [
    { id: "Jujuy", name: "Jujuy", d: "M76,14 L85,14 L86,28 L74,31 L71,21 Z" },
    { id: "Salta", name: "Salta", d: "M51,19 L71,21 L74,31 L86,28 L94,54 L88,57 L85,45 L70,47 L65,40 L65,31 L54,32 Z M86,14 L95,14 L98,25 L86,28 Z" },
    { id: "Formosa", name: "Formosa", d: "M98,25 L135,39 L129,54 L94,54 Z" },
    { id: "Chaco", name: "Chaco", d: "M94,54 L129,54 L120,85 L91,91 Z" },
    { id: "Misiones", name: "Misiones", d: "M148,51 L162,68 L154,82 L143,73 Z" },
    { id: "Corrientes", name: "Corrientes", d: "M120,85 L143,73 L154,82 L143,115 L116,105 Z" },
    { id: "Santa Fe", name: "Santa Fe", d: "M91,91 L116,105 L106,166 L86,160 L89,122 Z" },
    { id: "Santiago del Estero", name: "Santiago del Estero", d: "M66,73 L94,54 L91,91 L89,122 L66,118 Z" },
    { id: "Tucumán", name: "Tucumán", d: "M65,40 L70,47 L85,45 L88,57 L66,73 L65,58 Z" },
    { id: "Catamarca", name: "Catamarca", d: "M43,45 L65,31 L65,58 L66,73 L55,87 L40,84 L41,61 Z" },
    { id: "La Rioja", name: "La Rioja", d: "M40,84 L55,87 L50,119 L28,114 L24,100 Z" },
    { id: "San Juan", name: "San Juan", d: "M28,114 L50,119 L46,155 L21,152 L17,143 Z" },
    { id: "Mendoza", name: "Mendoza", d: "M21,152 L46,155 L40,205 L11,198 L8,185 Z" },
    { id: "San Luis", name: "San Luis", d: "M46,155 L65,159 L60,200 L40,205 Z" },
    { id: "Córdoba", name: "Córdoba", d: "M66,118 L89,122 L86,160 L80,195 L65,190 L65,159 Z" },
    { id: "Entre Ríos", name: "Entre Ríos", d: "M116,105 L132,130 L123,165 L106,166 Z" },
    { id: "Buenos Aires", name: "Buenos Aires", d: "M86,160 L106,166 L123,165 L120,200 L110,234 L56,238 L60,200 L80,195 Z" },
    { id: "La Pampa", name: "La Pampa", d: "M40,205 L60,200 L56,238 L28,245 L25,234 Z" },
    { id: "Neuquén", name: "Neuquén", d: "M11,198 L24,204 L25,234 L28,245 L11,260 L2,242 Z" },
    { id: "Río Negro", name: "Río Negro", d: "M28,245 L56,238 L110,234 L102,285 L44,300 L32,284 L11,260 Z" },
    { id: "Chubut", name: "Chubut", d: "M11,260 L32,284 L44,300 L102,285 L92,345 L15,345 Z" },
    { id: "Santa Cruz", name: "Santa Cruz", d: "M15,345 L92,345 L85,410 L15,410 Z" },
    { id: "Tierra del Fuego", name: "Tierra del Fuego", d: "M30,425 L50,425 L55,445 L25,445 Z" },
    { id: "CABA", name: "CABA", d: "M103,172 L110,172 L110,178 L103,178 Z" }
  ];

  // Map data to colors
  const maxSales = Math.max(...data.map(d => d.count), 1);
  const getColor = (count) => {
    if (count === 0) return "#f1f5f9"; // Slate 100
    const intensity = Math.min(count / (maxSales * 0.8), 1);
    // Gradient from sky-200 to blue-700
    return `rgba(37, 99, 235, ${0.1 + intensity * 0.9})`; // Higher alpha for more sales
  };

  const findProvinceData = (name) => data.find(p => p.name === name) || { count: 0 };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <svg 
        viewBox="0 0 180 460" 
        className="w-full h-full drop-shadow-2xl"
        preserveAspectRatio="xMidYMid meet"
      >
        {provincePaths.map((p) => {
          const provData = findProvinceData(p.name);
          const isHovered = hoveredProvince === p.id;
          
          return (
            <path
              key={p.id}
              d={p.d}
              fill={getColor(provData.count)}
              stroke={isHovered ? "#3b82f6" : "#cbd5e1"}
              strokeWidth={isHovered ? 1.5 : 0.5}
              className="transition-all duration-300 cursor-pointer hover:brightness-110"
              onMouseEnter={() => setHoveredProvince(p.id)}
              onMouseLeave={() => setHoveredProvince(null)}
              onClick={() => onProvinceClick(p.name)}
            />
          );
        })}
      </svg>

      {/* Modern Tooltip */}
      {hoveredProvince && (
        <div 
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-2xl animate-fade-in pointer-events-none z-20"
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Provincia</p>
          <p className="text-slate-900 font-black text-lg leading-none mb-2">{hoveredProvince}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-blue-600">
              {findProvinceData(hoveredProvince).count}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Ventas</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-0 left-0 flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600 opacity-20"></div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">+ Ventas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200"></div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sin Ventas</span>
        </div>
      </div>
    </div>
  );
};

export default ArgentinaMap;
