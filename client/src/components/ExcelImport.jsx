import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, CheckCircle, Info } from 'lucide-react';
import { importExcel } from '../api';

const ExcelImport = ({ onClose, onImported }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      setLoading(true);
      await importExcel(file);
      setCompleted(true);
      setTimeout(() => {
        onImported();
      }, 1500);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Error importing Excel. Ensure format is correct.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content !max-w-md">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Importar desde Excel</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center text-center">
          {completed ? (
            <div className="py-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">¡Importación Exitosa!</h3>
              <p className="text-slate-500 mt-2">Los vehículos se han añadido al stock.</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <FileSpreadsheet size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Selecciona tu archivo .xlsx</h3>
              <p className="text-slate-500 mt-2 mb-8 text-sm font-medium">
                Asegúrate de que las columnas coincidan: <br/>
                <span className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-600 mt-2 inline-block border border-slate-200">
                  marca | modelo | año | color | patente | km | precio (ARS) | combustible | Estado Comercial
                </span>
              </p>

              <label className="w-full p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer mb-6 group">
                <input type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                <div className="flex flex-col items-center">
                  <Upload size={24} className="text-slate-300 group-hover:text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-slate-600">
                    {file ? file.name : 'Seleccionar archivo'}
                  </span>
                </div>
              </label>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3 text-left mb-8">
                <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  La importación creará nuevos registros. No sobrescribirá los existentes.
                </p>
              </div>

              <button 
                onClick={handleImport}
                disabled={!file || loading}
                className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                  !file || loading 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                }`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Confirmar Importación'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImport;
