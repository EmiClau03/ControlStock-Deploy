import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Maximize2, ImageIcon } from 'lucide-react';
import { getVehicle, uploadPhotos, deletePhoto, API_BASE_URL } from '../api';

const PhotoManager = ({ vehicle, onClose, onChange }) => {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    fetchPhotos();
  }, [vehicle]);

  const fetchPhotos = async () => {
    try {
      const { data } = await getVehicle(vehicle.id);
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      await uploadPhotos(vehicle.id, files);
      await fetchPhotos();
      onChange(); // Update photo count on dashboard
    } catch (error) {
      alert('Error al subir las fotos');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (id) => {
    if (window.confirm('¿Eliminar esta foto?')) {
      try {
        await deletePhoto(id);
        await fetchPhotos();
        onChange();
      } catch (error) {
        alert('Error al eliminar la foto');
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content !max-w-4xl">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{vehicle.brand} <span className="text-slate-400 font-medium">{vehicle.model}</span></h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">{photos.length} ARCHIVOS MULTIMEDIA</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-90">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* Upload Button */}
            <label className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group shadow-inner">
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              {uploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
              ) : (
                <>
                  <Plus size={32} className="text-slate-300 group-hover:text-slate-900 transition-colors duration-300" />
                  <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-slate-900 mt-2">Cargar Fotos</span>
                </>
              )}
            </label>

            {/* Photos */}
            {photos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-xl overflow-hidden relative group border border-slate-100">
                <img 
                  src={`${API_BASE_URL}/../uploads/${photo.filename}`} 
                  alt="Vehicle" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={() => setPreviewPhoto(photo)}
                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                  >
                    <Maximize2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {photos.length === 0 && !uploading && (
            <div className="mt-8 py-12 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-slate-400">
              <ImageIcon size={48} className="mb-4 opacity-20" />
              <p className="font-medium">No hay fotos cargadas todavía</p>
              <button 
                onClick={() => document.querySelector('input[type="file"]').click()}
                className="mt-4 text-blue-600 font-bold hover:underline"
              >
                Haz clic aquí para subir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Preview */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
          <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full">
            <X size={32} />
          </button>
          <img 
            src={`${API_BASE_URL}/../uploads/${previewPhoto.filename}`} 
            alt="Preview" 
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default PhotoManager;
