import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { createVehicle, updateVehicle } from '../api';

const VehicleForm = ({ vehicle, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    version: '',
    mileage: '',
    fuel: 'Nafta',
    transmission: 'Manual',
    color: '',
    license_plate: '',
    price: '',
    description: '',
    status: 'Disponible',
    is_offer: false,
    offer_price: ''
  });

  useEffect(() => {
    if (vehicle) {
      setFormData(vehicle);
    }
  }, [vehicle]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (vehicle) {
        await updateVehicle(vehicle.id, formData);
      } else {
        await createVehicle(formData);
      }
      onSave();
    } catch (error) {
      alert('Error al guardar el vehículo');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-900/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold text-white">
            {vehicle ? 'Editar Vehículo' : 'Agregar Nuevo Vehículo'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Marca *</label>
            <input 
              required name="brand" value={formData.brand} onChange={handleChange}
              className="input-field" 
              placeholder="Ej: Toyota"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Modelo *</label>
            <input 
              required name="model" value={formData.model} onChange={handleChange}
              className="input-field" 
              placeholder="Ej: Corolla"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Año</label>
            <input 
              type="number" name="year" value={formData.year} onChange={handleChange}
              className="input-field" 
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Color</label>
            <input 
              name="color" value={formData.color} onChange={handleChange}
              className="input-field" 
              placeholder="Ej: Gris Plata"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Patente</label>
            <input 
              name="license_plate" value={formData.license_plate} onChange={handleChange}
              className="input-field font-mono uppercase tracking-widest placeholder:tracking-normal" 
              placeholder="Ej: AA123BB"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Kilometraje</label>
            <input 
              type="number" name="mileage" value={formData.mileage} onChange={handleChange}
              className="input-field" 
              placeholder="0"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Precio (ARS)</label>
            <input 
              type="number" name="price" value={formData.price} onChange={handleChange}
              className="input-field font-black text-blue-400" 
              placeholder="0.00"
            />
          </div>

          <div className="flex items-end gap-3 mb-1">
            <div className="flex-1 space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">
                Precio de Oferta (ARS)
              </label>
              <input 
                type="number" 
                name="offer_price" 
                value={formData.offer_price || ''} 
                onChange={handleChange}
                disabled={!formData.is_offer}
                className={`input-field font-black ${formData.is_offer ? 'text-red-400 border-red-500/30 bg-red-500/5' : 'bg-white/5 opacity-50'}`} 
                placeholder="0.00"
              />
            </div>
            <div className="pb-1">
              <label className="flex items-center gap-2 cursor-pointer group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/10 transition-all">
                <input 
                  type="checkbox" 
                  name="is_offer" 
                  checked={formData.is_offer} 
                  onChange={(e) => setFormData(p => ({ ...p, is_offer: e.target.checked }))}
                  className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-blue-500 bg-transparent"
                />
                <span className="text-xs font-bold text-slate-100 uppercase tracking-tight">En Oferta</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Combustible</label>
            <select 
              name="fuel" value={formData.fuel} onChange={handleChange}
              className="input-field cursor-pointer"
            >
              <option value="Nafta">Nafta</option>
              <option value="Diesel">Diesel</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Eléctrico">Eléctrico</option>
              <option value="GNC">GNC</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Estado Comercial</label>
            <select 
              name="status" value={formData.status} onChange={handleChange}
              className="input-field cursor-pointer font-bold"
            >
              <option value="Disponible">🟢 Disponible</option>
              <option value="Muy Visto">🔥 Muy Visto</option>
              <option value="Reservado">🟡 Reservado</option>
              <option value="Vendido">🔴 Vendido</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Transmisión</label>
            <select 
              name="transmission" value={formData.transmission} onChange={handleChange}
              className="input-field cursor-pointer"
            >
              <option value="Manual">Manual</option>
              <option value="Automática">Automática</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider ml-1">Notas / Descripción</label>
            <textarea 
              name="description" value={formData.description} onChange={handleChange} rows="3"
              className="input-field resize-none"
              placeholder="Detalles adicionales del vehículo..."
            ></textarea>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-8 mt-4 border-t border-white/5">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">
              <Save size={18} />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleForm;
