import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

// ─── CHANGE THIS TO YOUR DESIRED PASSWORD ───────────────────────────────────
const ADMIN_PASSWORD = 'marcos2025';
// ────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'am_admin_auth';

export default function LoginGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Check if already authenticated in this session
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      setAuthenticated(true);
    } else {
      // Focus input shortly after mount
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Small artificial delay for a polished feel
    await new Promise((r) => setTimeout(r, 600));

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthenticated(true);
    } else {
      setError('Contraseña incorrecta. Intentá de nuevo.');
      setShaking(true);
      setLoading(false);
      setPassword('');
      setTimeout(() => setShaking(false), 650);
      inputRef.current?.focus();
    }
  };

  if (authenticated) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Ambient glows */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-md mx-4 ${shaking ? 'animate-shake' : ''}`}
        style={{ animation: shaking ? undefined : 'zoomIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div
          style={{
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '2rem',
            boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.1)',
            backdropFilter: 'blur(24px)',
            padding: '3rem 2.5rem',
          }}
        >
          {/* Logo / Icon */}
          <div className="flex flex-col items-center mb-8">
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(96,165,250,0.08))',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '1.25rem',
                padding: '1rem',
                marginBottom: '1.25rem',
                boxShadow: '0 0 40px rgba(59,130,246,0.15)',
              }}
            >
              <Lock size={32} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Automotores Marcos
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-medium tracking-wide">
              Panel de administración
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Contraseña de acceso
            </label>

            <div className="relative mb-5">
              <input
                ref={inputRef}
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••••"
                autoComplete="current-password"
                className="input-field pr-12"
                disabled={loading}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 0,
                  lineHeight: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl text-sm font-medium"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171',
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary w-full justify-center relative"
              style={{ opacity: !password ? 0.5 : 1 }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Ingresar al panel
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6 font-medium">
            Acceso restringido · Solo personal autorizado
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-8px); }
          30%       { transform: translateX(8px); }
          45%       { transform: translateX(-6px); }
          60%       { transform: translateX(6px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.6s ease-in-out; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
