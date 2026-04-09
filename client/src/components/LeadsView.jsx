import React, { useState, useEffect } from 'react';
import { Mail, Phone, Clock, MessageSquare, CheckCircle, Clock3, Archive, Send } from 'lucide-react';
import api from '../api';

const LeadsView = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leads');
      setLeads(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Error al cargar las consultas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const updateLeadStatus = async (id, newStatus) => {
    try {
      await api.put(`/leads/${id}`, { estado: newStatus });
      setLeads(leads.map(lead => lead.id === id ? { ...lead, estado: newStatus } : lead));
    } catch (err) {
      console.error('Error updating lead status:', err);
      alert('Error al actualizar el estado');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Nuevo': return 'bg-red-100 text-red-700 border-red-200';
      case 'Contactado': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Cerrado': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Nuevo': return <Clock3 size={14} />;
      case 'Contactado': return <Phone size={14} />;
      case 'Cerrado': return <CheckCircle size={14} />;
      default: return null;
    }
  };

  const formatWhatsAppMessage = (lead) => {
    const text = `Hola ${lead.nombre}, te contacto de Automotores Marcos por tu consulta sobre ${lead.vehiculo || 'un vehículo'}.`;
    return `https://wa.me/${lead.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Consultas Recibidas</h2>
          <p className="text-gray-500">Gestioná los interesados que llegan desde la landing page</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white px-4 py-2 rounded-lg border shadow-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-sm font-medium text-gray-700">
              {leads.filter(l => l.estado === 'Nuevo').length} Nuevas
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
          <Archive size={20} />
          {error}
        </div>
      )}

      {leads.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="text-gray-300" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">No hay consultas aún</h3>
          <p className="text-gray-400">Las consultas que completen en la web aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(lead.estado)}`}>
                    {getStatusIcon(lead.estado)}
                    {lead.estado}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 uppercase tracking-wider font-bold">
                    <Clock size={10} />
                    {new Date(lead.created_at).toLocaleDateString()} {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  {lead.nombre} {lead.apellido}
                </h3>
                
                <div className="flex items-center gap-2 text-blue-600 font-medium text-sm mb-4">
                  <Phone size={14} />
                  {lead.telefono}
                </div>

                {lead.vehiculo && (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4">
                    <p className="text-[10px] text-blue-400 uppercase font-bold mb-1 tracking-wider">Vehículo Consultado</p>
                    <p className="text-blue-800 font-bold text-sm">{lead.vehiculo}</p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider">Mensaje</p>
                  <p className="text-gray-600 text-sm italic">"{lead.mensaje || 'Sin mensaje'}"</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t flex items-center gap-2">
                <div className="flex-1 dropdown relative group">
                   <select 
                    value={lead.estado}
                    onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="Nuevo">🔴 Marcar como Nuevo</option>
                    <option value="Contactado">🟡 Marcar Contactado</option>
                    <option value="Cerrado">🟢 Marcar Cerrado</option>
                  </select>
                </div>
                
                <a 
                  href={formatWhatsAppMessage(lead)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-xl transition-colors shadow-sm"
                  title="Contactar por WhatsApp"
                >
                  <Send size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadsView;
