import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  TrendingUp, Activity, Package, DollarSign, 
  PieChart as PieIcon, BarChart3, Clock, ShoppingCart, LayoutDashboard,
  MapPin, ChevronLeft, Map as MapIcon, BarChart2
} from 'lucide-react';
import { getSalesStats } from '../api';
import ArgentinaMap from './ArgentinaMap';

const StatisticsView = ({ vehicles }) => {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'sales'
  const [salesData, setSalesData] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [salesViewType, setSalesViewType] = useState('chart'); // 'chart' or 'map'

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const { data } = await getSalesStats();
      setSalesData(data);
    } catch (error) {
      console.error('Error fetching sales stats:', error);
    } finally {
      setLoadingSales(false);
    }
  };

  const stats = useMemo(() => {
    if (!vehicles.length) return null;

    // 1. Inventory Stats
    const totalUnits = vehicles.length;
    const inventoryValue = vehicles.reduce((acc, v) => acc + (v.price || 0), 0);
    const available = vehicles.filter(v => v.status === 'Disponible').length;

    const brandMap = {};
    vehicles.forEach(v => {
      brandMap[v.brand] = (brandMap[v.brand] || 0) + 1;
    });
    const brandData = Object.entries(brandMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const yearMap = {};
    vehicles.forEach(v => {
      if (v.year) yearMap[v.year] = (yearMap[v.year] || 0) + 1;
    });
    const yearData = Object.entries(yearMap)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);

    const statusMap = {};
    vehicles.forEach(v => {
      statusMap[v.status] = (statusMap[v.status] || 0) + 1;
    });
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    const priceRanges = [
      { name: '0-5M', min: 0, max: 5000000, count: 0 },
      { name: '5-10M', min: 5000000, max: 10000000, count: 0 },
      { name: '10-20M', min: 10000000, max: 20000000, count: 0 },
      { name: '20-40M', min: 20000000, max: 40000000, count: 0 },
      { name: '40M+', min: 40000000, max: Infinity, count: 0 },
    ];
    vehicles.forEach(v => {
      const range = priceRanges.find(r => v.price >= r.min && v.price < r.max);
      if (range) range.count++;
    });

    // 2. Sales Stats
    const totalSalesUnits = salesData.length;
    const totalRevenue = salesData.reduce((acc, s) => acc + s.final_price, 0);

    const monthlyMap = {};
    salesData.forEach(s => {
      const date = new Date(s.sale_date);
      const monthLabel = date.toLocaleString('es-ES', { month: 'short' });
      monthlyMap[monthLabel] = (monthlyMap[monthLabel] || 0) + s.final_price;
    });
    const revenueTrend = Object.entries(monthlyMap).map(([name, total]) => ({ name, total }));

    const payMap = {};
    salesData.forEach(s => {
      payMap[s.payment_method] = (payMap[s.payment_method] || 0) + 1;
    });
    const paymentData = Object.entries(payMap).map(([name, value]) => ({ name, value }));

    // 3. Geographic Stats
    const provinceMap = {};
    salesData.forEach(s => {
      const prov = s.buyer_province || 'Desconocido';
      provinceMap[prov] = (provinceMap[prov] || 0) + 1;
    });
    const provinceData = Object.entries(provinceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    let localityData = [];
    if (selectedProvince) {
      const locMap = {};
      salesData
        .filter(s => s.buyer_province === selectedProvince)
        .forEach(s => {
          const loc = s.buyer_locality || 'Desconocido';
          locMap[loc] = (locMap[loc] || 0) + 1;
        });
      localityData = Object.entries(locMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    }

    return { 
      totalUnits, inventoryValue, available, brandData, yearData, statusData, priceRanges,
      totalSalesUnits, totalRevenue, revenueTrend, paymentData,
      provinceData, localityData
    };
  }, [vehicles, salesData, selectedProvince]);

  if (!stats) return null;

  const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#2563eb'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-white font-bold mb-1">{label || payload[0].name}</p>
          <p className="text-blue-400 font-black text-lg">
            {typeof payload[0].value === 'number' && payload[0].value > 1000 
              ? `$${(payload[0].value / 1000000).toFixed(1)}M` 
              : payload[0].value}
            <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">
              {(payload[0].dataKey === 'total') ? 'Facturado' : 'Unidades'}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data) => {
    if (!selectedProvince && data && data.activePayload) {
      setSelectedProvince(data.activePayload[0].payload.name);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* Tabs Navigation */}
      <div className="flex items-center justify-center">
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-xl shadow-inner">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all tracking-widest uppercase ${
              activeTab === 'inventory' 
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' 
              : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutDashboard size={14} />
            Inventario
          </button>
          <button 
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all tracking-widest uppercase ${
              activeTab === 'sales' 
              ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40' 
              : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShoppingCart size={14} />
            Ventas
          </button>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <div className="space-y-10 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={<Package className="text-blue-400" />} title="Stock Total" value={stats.totalUnits} subtitle="Unidades registradas" />
            <StatCard icon={<DollarSign className="text-emerald-400" />} title="Valor Cartera" value={`$${(stats.inventoryValue / 1000000).toFixed(1)}M`} subtitle="Valoración estimada" />
            <StatCard icon={<Activity className="text-amber-400" />} title="Disponibles" value={stats.available} subtitle={`${((stats.available / stats.totalUnits) * 100).toFixed(0)}% del stock`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Stock por Marca" icon={<BarChart3 size={20}/>} color="blue">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.brandData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} className="font-bold text-slate-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Estado del Inventario" icon={<PieIcon size={20}/>} color="indigo">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                    {stats.statusData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Modelos por Año" icon={<Clock size={20}/>} color="emerald">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.yearData}>
                  <defs>
                    <linearGradient id="invYear" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-400" />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#invYear)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Segmentos de Precio" icon={<TrendingUp size={20}/>} color="amber">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.priceRanges}>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-400" />
                   <YAxis hide />
                   <Tooltip content={<CustomTooltip />} />
                   <Bar dataKey="count" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard icon={<ShoppingCart className="text-emerald-400" />} title="Unidades Vendidas" value={stats.totalSalesUnits} subtitle="Operaciones cerradas" />
            <StatCard icon={<DollarSign className="text-blue-400" />} title="Facturación Total" value={`$${(stats.totalRevenue / 1000000).toFixed(1)}M`} subtitle="Ingresos brutos generados" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="table-container p-8 bg-white shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedProvince ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                    <MapPin size={20}/>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight">
                      {selectedProvince ? `Ventas en ${selectedProvince}` : (salesViewType === 'map' ? "Mapa de Ventas" : "Ventas por Región")}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {selectedProvince ? "Distribución por Localidad" : (salesViewType === 'map' ? "Visión geográfica nacional" : "Click en una provincia para ver ciudades")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!selectedProvince && (
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                      <button 
                        onClick={() => setSalesViewType('chart')}
                        className={`p-1.5 rounded-md transition-all ${salesViewType === 'chart' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                      >
                        <BarChart2 size={16} />
                      </button>
                      <button 
                        onClick={() => setSalesViewType('map')}
                        className={`p-1.5 rounded-md transition-all ${salesViewType === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                      >
                        <MapIcon size={16} />
                      </button>
                    </div>
                  )}
                  {selectedProvince && (
                    <button 
                      onClick={() => setSelectedProvince(null)}
                      className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-tighter hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                    >
                      <ChevronLeft size={14} /> Volver
                    </button>
                  )}
                </div>
              </div>
              <div className="h-[350px]">
                {selectedProvince ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.localityData}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-400" />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  salesViewType === 'map' ? (
                    <ArgentinaMap 
                      data={stats.provinceData} 
                      onProvinceClick={(name) => {
                        const hasSales = stats.provinceData.some(p => p.name === name);
                        if (hasSales) setSelectedProvince(name);
                      }} 
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={stats.provinceData} 
                        onClick={handleBarClick}
                        className="cursor-pointer"
                      >
                        <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-400" />
                        <YAxis hide />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill="#ef4444" radius={[10, 10, 0, 0]} barSize={40}>
                           {stats.provinceData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                )}
              </div>
            </div>

            <ChartCard title="Métodos de Cierre" icon={<PieIcon size={20}/>} color="indigo">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.paymentData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                    {stats.paymentData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tendencia de Facturación" icon={<TrendingUp size={24}/>} color="emerald" fullWidth>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueTrend}>
                  <defs>
                    <linearGradient id="salesRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs font-bold text-slate-400" />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#10b981" fillOpacity={1} fill="url(#salesRev)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle }) => (
  <div className="table-container p-6 bg-white shadow-xl hover:scale-[1.02] transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className="bg-slate-50 p-3 rounded-2xl">{icon}</div>
      <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">KPI</div>
    </div>
    <div className="space-y-1">
      <h4 className="text-slate-500 text-xs font-bold uppercase tracking-tight">{title}</h4>
      <div className="text-3xl font-black text-slate-900 tracking-tighter">{value}</div>
      <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>
    </div>
  </div>
);

const ChartCard = ({ title, icon, children, color, fullWidth }) => {
  const bgColors = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600'
  };
  return (
    <div className={`table-container p-8 bg-white shadow-xl ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-center gap-3 mb-8">
        <div className={`p-2 rounded-lg ${bgColors[color] || bgColors.blue}`}>{icon}</div>
        <h3 className="font-black text-slate-900 uppercase tracking-tight">{title}</h3>
      </div>
      <div className="h-[350px]">
        {children}
      </div>
    </div>
  );
};

export default StatisticsView;
