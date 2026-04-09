import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Image as ImageIcon, 
  FileUp, 
  Filter,
  Car,
  CheckCircle,
  Clock,
  Ban,
  AlertCircle
} from 'lucide-react';
import { getVehicles, deleteVehicle, API_BASE_URL } from './api';
import VehicleForm from './components/VehicleForm';
import PhotoManager from './components/PhotoManager';
import ExcelImport from './components/ExcelImport';
import StatisticsView from './components/StatisticsView';
import SaleForm from './components/SaleForm';
import LeadsView from './components/LeadsView';
import api from './api';

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showNoPhotosOnly, setShowNoPhotosOnly] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSaleFormOpen, setIsSaleFormOpen] = useState(false);
  const [activeView, setActiveView] = useState('table'); // 'table', 'statistics', or 'leads'
  const [newLeadsCount, setNewLeadsCount] = useState(0);

  useEffect(() => {
    fetchVehicles();
    fetchLeadsCount();
    document.title = "Automotores Marcos | Stock";

    // Refresh leads count every minute
    const interval = setInterval(fetchLeadsCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data } = await getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsCount = async () => {
    try {
      const { data } = await api.get('/leads');
      const count = data.filter(l => l.estado === 'Nuevo').length;
      setNewLeadsCount(count);
    } catch (error) {
      console.error('Error fetching leads count:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que quieres eliminar este vehículo?')) {
      try {
        await deleteVehicle(id);
        fetchVehicles();
      } catch (error) {
        alert('Error al eliminar el vehículo');
      }
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.license_plate?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesPhotoFilter = !showNoPhotosOnly || v.photoCount === 0;

    return matchesSearch && matchesStatus && matchesPhotoFilter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      'Disponible': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Muy Visto': 'bg-orange-100 text-orange-700 border-orange-200 font-bold animate-pulse-slow',
      'Reservado': 'bg-amber-100 text-amber-700 border-amber-200',
      'Vendido': 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles['Disponible']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen pb-12 font-sans">
      {/* Header */}
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer animate-fade-in">
            <div className="bg-white p-1.5 rounded-2xl shadow-xl shadow-blue-500/20 group-hover:scale-105 transition-all duration-300 animate-float">
              <img 
                src="/logo_original.png" 
                alt="Automotores Marcos" 
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tighter text-white uppercase leading-none">Automotores Marcos</h1>
              <p className="text-[10px] font-bold text-blue-400/80 tracking-[0.2em] uppercase mt-1">Gestión Profesional</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsImportOpen(true)}
                className="btn-secondary group"
              >
                <FileUp size={18} className="group-hover:-translate-y-0.5 transition-transform text-white/60" />
                <span className="hidden sm:inline text-white/80">Importar Stock</span>
              </button>
              <button 
                onClick={() => { setEditingVehicle(null); setIsFormOpen(true); }}
                className="btn-primary shadow-lg shadow-blue-500/20"
              >
                <Plus size={20} />
                <span>Nuevo Vehículo</span>
              </button>
            </div>
            
            {/* Stats Toggle */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner">
              <button 
                onClick={() => setActiveView('table')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all tracking-widest uppercase ${activeView === 'table' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Stock
              </button>
              <button 
                onClick={() => {
                  setActiveView('leads');
                  setNewLeadsCount(0); // Reset count when viewing
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all tracking-widest uppercase relative ${activeView === 'leads' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Consultas
                {newLeadsCount > 0 && activeView !== 'leads' && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-bounce-slow shadow-lg">
                    {newLeadsCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveView('statistics')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all tracking-widest uppercase ${activeView === 'statistics' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Estadísticas
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 mt-10">
        {activeView === 'table' ? (
          <>
        {/* Filters & Stats */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8 items-center justify-between animate-fade-in">
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por marca, modelo o patente..." 
                className="input-field pl-12 w-full sm:w-80 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="input-field w-auto min-w-[180px] shadow-sm cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">Todos los estados</option>
              <option value="Disponible">🟢 Disponible</option>
              <option value="Muy Visto">🔥 Muy Visto</option>
              <option value="Reservado">🟡 Reservado</option>
              <option value="Vendido">🔴 Vendido</option>
            </select>
            <button 
              onClick={() => setShowNoPhotosOnly(!showNoPhotosOnly)}
              className={`px-4 py-2.5 rounded-xl border font-semibold transition-all flex items-center gap-2.5 shadow-sm sm:w-auto w-full justify-center ${
                showNoPhotosOnly 
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' 
                : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
              }`}
            >
              <AlertCircle size={18} className={showNoPhotosOnly ? 'animate-pulse' : ''} />
              <span>Sin fotos <span className="opacity-60 font-medium ml-1">({vehicles.filter(v => v.photoCount === 0).length})</span></span>
            </button>
          </div>
          
          <div className="bg-white/5 px-4 py-2 rounded-full border border-white/5 text-[13px] text-slate-400 font-bold tracking-tight shadow-sm">
            <span className="text-blue-400">{filteredVehicles.length}</span> VEHÍCULOS EN STOCK
          </div>
        </div>

        {/* Dashboard Table */}
        <div className="table-container animate-fade-in mb-20 overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[11px] uppercase tracking-[0.15em]">
                <th className="px-6 py-5">ID</th>
                <th className="px-6 py-5">Marca</th>
                <th className="px-6 py-5">Modelo</th>
                <th className="px-6 py-5">Patente</th>
                <th className="px-6 py-5">Año</th>
                <th className="px-6 py-5">Color</th>
                <th className="px-6 py-5">KM</th>
                <th className="px-6 py-5 text-right">Precio (ARS)</th>
                <th className="px-6 py-5 text-center">Combustible</th>
                <th className="px-6 py-5">Estado</th>
                <th className="px-6 py-5">Fotos</th>
                <th className="px-6 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center text-slate-400">Cargando vehículos...</td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center text-slate-400">No se encontraron vehículos</td>
                </tr>
              ) : filteredVehicles.map((v, idx) => (
                <tr 
                  key={v.id} 
                  className="hover:bg-slate-50/80 transition-all duration-200 group animate-fade-in"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <td className="px-6 py-5 font-mono text-[10px] text-slate-300">#{v.id}</td>
                  <td className="px-6 py-5">
                    <span className="font-extrabold text-slate-900 text-sm">{v.brand}</span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-600 font-bold">{v.model}</td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-mono font-bold text-slate-500 tracking-wider">
                      {v.license_plate || '---'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-500">{v.year}</td>
                  <td className="px-6 py-5 text-sm text-slate-500 font-medium">{v.color || '-'}</td>
                  <td className="px-6 py-5 text-sm text-slate-500 tabular-nums font-medium">
                    {v.mileage?.toLocaleString() || 0} <span className="text-[10px] font-bold opacity-40 italic">KM</span>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-blue-600 text-base tabular-nums">
                    ${v.price?.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-tighter">
                      {v.fuel}
                    </span>
                  </td>
                  <td className="px-6 py-5">{getStatusBadge(v.status)}</td>
                  <td className="px-6 py-5">
                    <button 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                        v.photoCount === 0 
                        ? 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 shadow-sm' 
                        : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                      }`}
                      onClick={() => { setSelectedVehicle(v); setIsPhotoManagerOpen(true); }}
                    >
                      <ImageIcon size={14} className={v.photoCount === 0 ? 'animate-pulse' : ''} />
                      <span className="font-bold text-xs">{v.photoCount}</span>
                    </button>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                      {v.status !== 'Vendido' && (
                        <button 
                          onClick={() => { setSelectedVehicle(v); setIsSaleFormOpen(true); }}
                          className="btn-action !text-emerald-500 hover:!bg-emerald-50"
                          title="Marcar como Vendido"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => { setEditingVehicle(v); setIsFormOpen(true); }}
                        className="btn-action !text-slate-400 hover:!text-slate-900 hover:!bg-slate-100"
                        title="Editar Registro"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(v.id)}
                        className="btn-action !text-slate-400 hover:!text-red-600 hover:!bg-red-50"
                        title="Eliminar Registro"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </>
        ) : activeView === 'leads' ? (
          <LeadsView />
        ) : (
          <StatisticsView vehicles={vehicles} />
        )}
      </main>

      {/* Modals */}
      {isFormOpen && (
        <VehicleForm 
          vehicle={editingVehicle} 
          onClose={() => setIsFormOpen(false)} 
          onSave={() => { setIsFormOpen(false); fetchVehicles(); }}
        />
      )}

      {isPhotoManagerOpen && (
        <PhotoManager 
          vehicle={selectedVehicle} 
          onClose={() => setIsPhotoManagerOpen(false)} 
          onChange={() => fetchVehicles()}
        />
      )}

      {isImportOpen && (
        <ExcelImport 
          onClose={() => setIsImportOpen(false)} 
          onImported={() => { setIsImportOpen(false); fetchVehicles(); }}
        />
      )}

      {isSaleFormOpen && (
        <SaleForm 
          vehicle={selectedVehicle}
          onClose={() => setIsSaleFormOpen(false)}
          onSave={() => { setIsSaleFormOpen(false); fetchVehicles(); }}
        />
      )}
    </div>
  );
}

export default App;
