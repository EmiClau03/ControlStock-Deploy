import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  TrendingUp, Activity, Package, DollarSign, 
  PieChart as PieIcon, BarChart3, Clock, ShoppingCart, LayoutDashboard,
  MapPin, ChevronLeft, Map as MapIcon, BarChart2, CalendarDays, UserRound,
  FileDown, BriefcaseBusiness, Trophy
} from 'lucide-react';
import { getFinancingPlans, getSalesStats } from '../api';
import ArgentinaMap from './ArgentinaMap';

const parseSaleDate = (value) => {
  if (!value) return null;

  const dateParts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateParts) {
    return new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]));
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getPreviousMonthKey = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return getMonthKey(new Date(year, month - 2, 1));
};

const StatisticsView = ({ vehicles }) => {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'sales'
  const [salesData, setSalesData] = useState([]);
  const [financingPlans, setFinancingPlans] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [salesViewType, setSalesViewType] = useState('chart'); // 'chart' or 'map'
  const [selectedMonth, setSelectedMonth] = useState(null); // null = loading, will be set after fetch
  const [currentMonthKey, setCurrentMonthKey] = useState(() => getMonthKey(new Date()));
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    const checkMonthChange = () => {
      const detectedMonth = getMonthKey(new Date());
      setCurrentMonthKey((previousMonth) => {
        if (previousMonth !== detectedMonth) {
          setSelectedMonth(previousMonth);
          return detectedMonth;
        }
        return previousMonth;
      });
    };

    const interval = setInterval(checkMonthChange, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSales = async () => {
    try {
      const [{ data }, financingResponse] = await Promise.all([
        getSalesStats(),
        getFinancingPlans().catch((error) => {
          console.error('Error fetching financing for report:', error);
          return { data: [] };
        })
      ]);
      setSalesData(data);
      setFinancingPlans(financingResponse.data);
      // Auto-select current month or fallback to most recent month with sales
      const now = new Date();
      const currentKey = getMonthKey(now);
      const monthsWithActivity = new Set();
      data.forEach(s => {
        const d = parseSaleDate(s.sale_date);
        if (d) {
          monthsWithActivity.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      });
      financingResponse.data.forEach((plan) => {
        plan.installments?.forEach((installment) => {
          if (installment.due_date && String(installment.due_date).slice(0, 7) <= currentKey) {
            monthsWithActivity.add(String(installment.due_date).slice(0, 7));
          }
          if (installment.paid_at) monthsWithActivity.add(String(installment.paid_at).slice(0, 7));
        });
      });
      if (monthsWithActivity.has(currentKey)) {
        setSelectedMonth(currentKey);
      } else if (monthsWithActivity.size > 0) {
        // Pick the most recent month with sales or financing activity
        const sorted = [...monthsWithActivity].sort((a, b) => b.localeCompare(a));
        setSelectedMonth(sorted[0]);
      } else {
        setSelectedMonth('All');
      }
    } catch (error) {
      console.error('Error fetching sales stats:', error);
      setSelectedMonth('All');
    } finally {
      setLoadingSales(false);
    }
  };

  const availableMonths = useMemo(() => {
    const map = {};
    salesData.forEach(s => {
      const date = parseSaleDate(s.sale_date);
      if (date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;
        const label = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        map[key] = label.charAt(0).toUpperCase() + label.slice(1);
      }
    });
    financingPlans.forEach((plan) => {
      plan.installments?.forEach((installment) => {
        [installment.due_date, installment.paid_at].filter(Boolean).forEach((value) => {
          const date = parseSaleDate(value);
          if (!date) return;
          const key = getMonthKey(date);
          if (key > currentMonthKey) return;
          const label = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
          map[key] = label.charAt(0).toUpperCase() + label.slice(1);
        });
      });
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [salesData, financingPlans, currentMonthKey]);

  const stats = useMemo(() => {
    if (!vehicles.length && !salesData.length && !financingPlans.length) return null;

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
    let filteredSalesData = salesData;
    if (selectedMonth && selectedMonth !== 'All') {
      filteredSalesData = salesData.filter(s => {
        const date = parseSaleDate(s.sale_date);
        if (!date) return false;
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}` === selectedMonth;
      });
    }

    const totalSalesUnits = filteredSalesData.length;
    const totalRevenue = filteredSalesData.reduce((acc, s) => acc + Number(s.final_price || 0), 0);
    const averageTicket = totalSalesUnits ? totalRevenue / totalSalesUnits : 0;

    const sellerMap = {};
    filteredSalesData.forEach((sale) => {
      const seller = sale.seller_name || 'Sin asignar';
      if (!sellerMap[seller]) sellerMap[seller] = { name: seller, sales: 0, revenue: 0 };
      sellerMap[seller].sales += 1;
      sellerMap[seller].revenue += Number(sale.final_price || 0);
    });
    const sellerPerformance = Object.values(sellerMap)
      .sort((a, b) => b.sales - a.sales || b.revenue - a.revenue);
    const topSeller = sellerPerformance.find((seller) => seller.name !== 'Sin asignar') || sellerPerformance[0] || null;

    const salesHistory = [...filteredSalesData].sort((a, b) => {
      const dateA = parseSaleDate(a.sale_date)?.getTime() || 0;
      const dateB = parseSaleDate(b.sale_date)?.getTime() || 0;
      return dateB - dateA || Number(b.id || 0) - Number(a.id || 0);
    });

    const monthlyMap = {};
    filteredSalesData.forEach(s => {
      const date = parseSaleDate(s.sale_date);
      if (!date) return;
      if (!selectedMonth || selectedMonth === 'All') {
        const monthLabel = date.toLocaleString('es-ES', { month: 'short' });
        monthlyMap[monthLabel] = (monthlyMap[monthLabel] || 0) + Number(s.final_price || 0);
      } else {
        const dayLabel = date.getDate().toString();
        monthlyMap[dayLabel] = (monthlyMap[dayLabel] || 0) + Number(s.final_price || 0);
      }
    });

    // For daily trend, sort the keys. For monthly, we can rely on chronological order of 's' but sorting is safer.
    const revenueTrend = Object.entries(monthlyMap).map(([name, total]) => ({ name, total }));
    if (selectedMonth && selectedMonth !== 'All') {
      revenueTrend.sort((a, b) => parseInt(a.name) - parseInt(b.name));
    }

    const payMap = {};
    filteredSalesData.forEach(s => {
      payMap[s.payment_method] = (payMap[s.payment_method] || 0) + 1;
    });
    const paymentData = Object.entries(payMap).map(([name, value]) => ({ name, value }));

    // 3. Geographic Stats
    const provinceMap = {};
    filteredSalesData.forEach(s => {
      const prov = s.buyer_province || 'Desconocido';
      provinceMap[prov] = (provinceMap[prov] || 0) + 1;
    });
    const provinceData = Object.entries(provinceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    let localityData = [];
    if (selectedProvince) {
      const locMap = {};
      filteredSalesData
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
      totalSalesUnits, totalRevenue, averageTicket, sellerPerformance, topSeller,
      revenueTrend, paymentData, salesHistory,
      provinceData, localityData
    };
  }, [vehicles, salesData, financingPlans, selectedProvince, selectedMonth]);

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

  const selectedMonthLabel = availableMonths.find(([key]) => key === selectedMonth)?.[1] || selectedMonth;
  const isClosedMonth = Boolean(selectedMonth && selectedMonth !== 'All' && selectedMonth < currentMonthKey);
  const hasFinancingActivity = financingPlans.some((plan) => plan.installments?.some((installment) => (
    String(installment.due_date || '').startsWith(selectedMonth)
    || String(installment.paid_at || '').startsWith(selectedMonth)
  )));

  const handleDownloadMonthlyReport = async () => {
    if (!selectedMonth || selectedMonth === 'All' || (!stats.salesHistory.length && !hasFinancingActivity)) return;

    try {
      setGeneratingReport(true);
      const previousMonthKey = getPreviousMonthKey(selectedMonth);
      const previousSales = salesData.filter((sale) => {
        const date = parseSaleDate(sale.sale_date);
        return date && getMonthKey(date) === previousMonthKey;
      });
      const { downloadMonthlySalesReport } = await import('../utils/monthlySalesReport');
      downloadMonthlySalesReport({
        monthKey: selectedMonth,
        monthLabel: selectedMonthLabel,
        sales: stats.salesHistory,
        previousSales,
        financingPlans,
        isClosedMonth,
      });
    } catch (error) {
      console.error('Error generating monthly report:', error);
      alert(error.message || 'No se pudo generar el informe mensual.');
    } finally {
      setGeneratingReport(false);
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
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-md border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                <Clock size={20} />
              </div>
              <div>
                <span className="font-bold text-slate-700 uppercase tracking-tight">Período de Análisis</span>
                {selectedMonth && selectedMonth !== 'All' && (() => {
                  const now = new Date();
                  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  return selectedMonth === currentKey ? (
                    <span className="ml-2 text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Mes actual</span>
                  ) : (
                    <span className="ml-2 text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Mes anterior</span>
                  );
                })()}
                {selectedMonth === 'All' && (
                  <span className="ml-2 text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">Histórico</span>
                )}
              </div>
            </div>
            <select
              className="input-field w-auto min-w-[220px] shadow-sm cursor-pointer border-slate-200 focus:border-emerald-500 rounded-xl"
              value={selectedMonth || 'All'}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
              <option value="All">── Todos los meses (Histórico)</option>
            </select>
          </div>

          <div className="table-container bg-gradient-to-br from-slate-900 to-blue-950 p-6 md:p-8 shadow-2xl border border-blue-500/20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/20">
                  <BriefcaseBusiness size={26} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Informe mensual ejecutivo</h3>
                    {selectedMonth && selectedMonth !== 'All' && (
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${isClosedMonth ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
                        {isClosedMonth ? 'Mes cerrado' : 'Mes en curso'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 max-w-2xl">
                    Resumen empresarial simple con ventas, facturación, vendedores, financiaciones, cuotas cobradas, deuda pendiente y detalle de cada operación.
                  </p>
                  <p className="text-[10px] text-blue-300/70 font-bold uppercase tracking-widest mt-3">
                    Al cambiar de mes, el período anterior queda cerrado automáticamente y listo para descargar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadMonthlyReport}
                disabled={generatingReport || loadingSales || selectedMonth === 'All' || (!stats.salesHistory.length && !hasFinancingActivity)}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white text-blue-950 font-black text-xs uppercase tracking-widest hover:bg-blue-50 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <FileDown size={18} />
                {generatingReport ? 'Generando PDF...' : 'Descargar informe PDF'}
              </button>
            </div>
            {selectedMonth === 'All' && (
              <p className="mt-4 text-xs font-bold text-amber-300">Elegí un mes específico para generar su informe.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard icon={<ShoppingCart className="text-emerald-400" />} title="Unidades Vendidas" value={stats.totalSalesUnits} subtitle="Operaciones cerradas" />
            <StatCard icon={<DollarSign className="text-blue-400" />} title="Facturación Total" value={`$${(stats.totalRevenue / 1000000).toFixed(1)}M`} subtitle="Ingresos brutos generados" />
            <StatCard icon={<TrendingUp className="text-violet-400" />} title="Ticket Promedio" value={`$${(stats.averageTicket / 1000000).toFixed(1)}M`} subtitle="Valor promedio por venta" />
            <StatCard
              icon={<Trophy className="text-amber-400" />}
              title="Vendedor Destacado"
              value={stats.topSeller?.name || 'Sin datos'}
              subtitle={stats.topSeller ? `${stats.topSeller.sales} ventas cerradas` : 'Sin ventas asignadas'}
            />
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

          <SalesHistory sales={stats.salesHistory} loading={loadingSales} />
        </div>
      )}
    </div>
  );
};

const SalesHistory = ({ sales, loading }) => (
  <div className="table-container bg-white shadow-xl overflow-hidden">
    <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
          <CalendarDays size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 uppercase tracking-tight">Historial de ventas</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Operaciones ordenadas de la más reciente a la más antigua
          </p>
        </div>
      </div>
      <span className="self-start sm:self-auto text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full uppercase tracking-widest">
        {sales.length} {sales.length === 1 ? 'venta' : 'ventas'}
      </span>
    </div>

    {loading ? (
      <div className="p-10 text-center text-sm font-bold text-slate-400">Cargando ventas...</div>
    ) : sales.length === 0 ? (
      <div className="p-10 text-center">
        <ShoppingCart size={32} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-500">No hay ventas registradas en este período.</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Vehículo</th>
              <th className="px-6 py-4">Vendedor</th>
              <th className="px-6 py-4">Comprador</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4">Pago</th>
              <th className="px-6 py-4 text-right">Precio final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => {
              const saleDate = parseSaleDate(sale.sale_date);
              const location = [sale.buyer_locality, sale.buyer_province].filter(Boolean).join(', ');

              return (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-700">
                    {saleDate ? saleDate.toLocaleDateString('es-AR') : 'Sin fecha'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-900">{sale.brand} {sale.model}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{sale.year || 'Año no informado'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${sale.seller_name ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                      <UserRound size={12} /> {sale.seller_name || 'Sin asignar'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{sale.buyer_name || 'Sin informar'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">{location || 'Sin informar'}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{sale.payment_method || 'Sin informar'}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-black text-emerald-600">
                    ${Number(sale.final_price || 0).toLocaleString('es-AR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

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
