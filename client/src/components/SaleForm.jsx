import React, { useState } from 'react';
import { X, DollarSign, User, Calendar, CreditCard, FileText, CheckCircle2 } from 'lucide-react';
import { recordSale } from '../api';

const SaleForm = ({ vehicle, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    vehicle_id: vehicle.id,
    final_price: vehicle.price || '',
    buyer_name: '',
    buyer_province: 'Córdoba',
    buyer_locality: '',
    sale_date: new Date().toISOString().split('T')[0],
    payment_method: 'Efectivo',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  
  const provincias = [
    "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", 
    "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", 
    "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", 
    "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán", "CABA"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await recordSale(formData);
      onSave();
    } catch (error) {
      alert('Error al registrar la venta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content !max-w-xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Registrar Venta</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{vehicle.brand} {vehicle.model}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-action">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Final Price */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={12} className="text-blue-400" /> Precio Final de Venta
              </label>
              <input
                required
                type="number"
                className="input-field !bg-slate-950/50 !border-white/10 focus:!border-blue-500 font-black text-lg text-blue-400"
                value={formData.final_price}
                onChange={(e) => setFormData({ ...formData, final_price: e.target.value })}
              />
            </div>

            {/* Sale Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-blue-400" /> Fecha de Venta
              </label>
              <input
                required
                type="date"
                className="input-field !bg-slate-950/50 !border-white/10"
                value={formData.sale_date}
                onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              />
            </div>

            {/* Buyer Name */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User size={12} className="text-blue-400" /> Nombre del Comprador
              </label>
              <input
                type="text"
                placeholder="Ej: Juan Pérez"
                className="input-field !bg-slate-950/50 !border-white/10"
                value={formData.buyer_name}
                onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              />
            </div>

            {/* Province */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Provincia
              </label>
              <select
                className="input-field !bg-slate-950/50 !border-white/10"
                value={formData.buyer_province}
                onChange={(e) => setFormData({ ...formData, buyer_province: e.target.value })}
              >
                {provincias.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Locality */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Localidad
              </label>
              <input
                type="text"
                placeholder="Ej: Villa María"
                className="input-field !bg-slate-950/50 !border-white/10"
                value={formData.buyer_locality}
                onChange={(e) => setFormData({ ...formData, buyer_locality: e.target.value })}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={12} className="text-blue-400" /> Método de Pago
              </label>
              <select
                className="input-field !bg-slate-950/50 !border-white/10 cursor-pointer"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Financiado">Financiación / Crédito</option>
                <option value="Permuta">Permuta (Toma de auto)</option>
                <option value="Mixto">Pago Mixto</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={12} className="text-blue-400" /> Notas / Observaciones
              </label>
              <textarea
                rows="3"
                className="input-field !bg-slate-950/50 !border-white/10 resize-none"
                placeholder="Detalles adicionales de la operación..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              ></textarea>
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] px-6 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-900/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Procesando...' : (
                <>Verificar y Registrar Venta</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaleForm;
