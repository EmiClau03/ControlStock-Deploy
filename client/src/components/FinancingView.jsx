import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Car, CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign,
  CreditCard, Phone, Plus, Search, Trash2, Undo2, Wallet, X
} from 'lucide-react';
import {
  createFinancingPlan, deleteFinancingPlan, getFinancingPlans, getFinancingVehicles,
  registerInstallmentPayment, undoInstallmentPayment
} from '../api';

const money = (value) => `$${Number(value || 0).toLocaleString('es-AR')}`;

const localDateKey = (date = new Date()) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const nextMonthKey = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Sin fecha';
};

const getInstallmentState = (installment, today = localDateKey()) => {
  if (installment.status === 'Pagada') return 'paid';
  if (today > installment.due_date) return 'overdue';
  if (today === installment.due_date) return 'due';
  if (today.slice(0, 7) === installment.due_date.slice(0, 7)) return 'payment-window';
  return 'upcoming';
};

const emptyForm = () => ({
  vehicle_id: '', customer_name: '', customer_dni: '', customer_phone: '', customer_address: '',
  financed_amount: '', installment_count: '', installment_amount: '', first_due_month: nextMonthKey(), notes: ''
});

const FinancingView = ({ onAlertCountChange }) => {
  const [plans, setPlans] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentData, setPaymentData] = useState({ paid_at: localDateKey(), paid_amount: '', payment_notes: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansResponse, vehiclesResponse] = await Promise.all([
        getFinancingPlans(),
        getFinancingVehicles()
      ]);
      setPlans(plansResponse.data);
      setVehicles(vehiclesResponse.data);
    } catch (error) {
      console.error('Error loading financing:', error);
      alert('No se pudieron cargar las financiaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const enrichedPlans = useMemo(() => plans.map((plan) => {
    const paid = plan.installments.filter((item) => item.status === 'Pagada');
    const pending = plan.installments.filter((item) => item.status !== 'Pagada');
    const overdue = pending.filter((item) => ['overdue', 'due'].includes(getInstallmentState(item)));
    const paidAmount = paid.reduce((sum, item) => sum + Number(item.paid_amount || item.amount || 0), 0);
    const nextPending = pending[0] || null;
    return { ...plan, paid, pending, overdue, paidAmount, nextPending };
  }), [plans]);

  const alertCount = enrichedPlans.reduce((sum, plan) => sum + plan.overdue.length, 0);

  useEffect(() => {
    onAlertCountChange?.(alertCount);
  }, [alertCount, onAlertCountChange]);

  const stats = useMemo(() => {
    const active = enrichedPlans.filter((plan) => plan.status === 'Activo');
    const totalFinanced = active.reduce((sum, plan) => sum + Number(plan.financed_amount || 0), 0);
    const collected = enrichedPlans.reduce((sum, plan) => sum + plan.paidAmount, 0);
    const pending = enrichedPlans.reduce((sum, plan) => (
      sum + plan.pending.reduce((quotaSum, quota) => quotaSum + Number(quota.amount || 0), 0)
    ), 0);
    return { active: active.length, totalFinanced, collected, pending };
  }, [enrichedPlans]);

  const visiblePlans = useMemo(() => enrichedPlans.filter((plan) => {
    const term = search.toLowerCase().trim();
    const matchesSearch = !term || [
      plan.customer_name, plan.customer_dni, plan.customer_phone, plan.brand, plan.model, plan.license_plate
    ].some((value) => String(value || '').toLowerCase().includes(term));
    const matchesFilter = filter === 'all'
      || (filter === 'active' && plan.status === 'Activo')
      || (filter === 'completed' && plan.status === 'Completado')
      || (filter === 'debtors' && plan.overdue.length > 0);
    return matchesSearch && matchesFilter;
  }), [enrichedPlans, filter, search]);

  const handleCalculateInstallment = () => {
    const amount = Number(formData.financed_amount);
    const count = Number(formData.installment_count);
    if (amount > 0 && count > 0) {
      setFormData((current) => ({ ...current, installment_amount: Math.ceil(amount / count) }));
    }
  };

  const handleCreatePlan = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await createFinancingPlan(formData);
      setShowForm(false);
      setFormData(emptyForm());
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'No se pudo crear la financiación.');
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (plan, installment) => {
    setPaymentTarget({ plan, installment });
    setPaymentData({ paid_at: localDateKey(), paid_amount: installment.amount, payment_notes: '' });
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await registerInstallmentPayment(paymentTarget.plan.id, paymentTarget.installment.id, paymentData);
      setPaymentTarget(null);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'No se pudo registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  const handleUndoPayment = async (plan, installment) => {
    if (!window.confirm(`¿Anular el pago de la cuota ${installment.installment_number}?`)) return;
    try {
      await undoInstallmentPayment(plan.id, installment.id);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'No se pudo anular el pago.');
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`¿Eliminar la financiación de ${plan.customer_name}? Se borrará todo su seguimiento de cuotas.`)) return;
    try {
      await deleteFinancingPlan(plan.id);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'No se pudo eliminar la financiación.');
    }
  };

  const planTotal = Number(formData.installment_count || 0) * Number(formData.installment_amount || 0);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <CreditCard size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Cuotas y financiaciones</h2>
              <p className="text-sm text-slate-400">Seguimiento de planes propios y cobros mensuales del 1 al 10.</p>
            </div>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-5 py-3.5">
          <Plus size={19} /> Nueva financiación
        </button>
      </div>

      {alertCount > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={22} />
            <div>
              <h3 className="font-black text-red-300 uppercase tracking-tight">Atención: pagos pendientes al día 10</h3>
              <p className="text-sm text-red-200/70">Hay {alertCount} {alertCount === 1 ? 'cuota pendiente o vencida' : 'cuotas pendientes o vencidas'} que requieren seguimiento.</p>
            </div>
          </div>
          <button onClick={() => setFilter('debtors')} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-widest">
            Ver deudores
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <SummaryCard icon={<Wallet className="text-blue-500" />} label="Planes activos" value={stats.active} detail={money(stats.totalFinanced) + ' financiados'} />
        <SummaryCard icon={<CheckCircle2 className="text-emerald-500" />} label="Total cobrado" value={money(stats.collected)} detail="Pagos registrados" />
        <SummaryCard icon={<CircleDollarSign className="text-amber-500" />} label="Saldo en cuotas" value={money(stats.pending)} detail="Capital pendiente de cobro" />
        <SummaryCard icon={<AlertTriangle className="text-red-500" />} label="Cuotas reclamables" value={alertCount} detail="Pendientes desde el día 10" />
      </div>

      <div className="table-container bg-white p-4 shadow-lg flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-11" placeholder="Buscar cliente, DNI, teléfono, vehículo o patente..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['active', 'Activas'], ['debtors', 'Deudores'], ['completed', 'Completadas'], ['all', 'Todas']
          ].map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filter === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="table-container bg-white p-12 text-center text-slate-400 font-bold">Cargando financiaciones...</div>
      ) : visiblePlans.length === 0 ? (
        <div className="table-container bg-white p-12 text-center">
          <CreditCard size={40} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-black text-slate-700">No hay financiaciones para mostrar</h3>
          <p className="text-sm text-slate-400 mt-1">Creá el primer plan o cambiá los filtros.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {visiblePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              expanded={expandedPlan === plan.id}
              onToggle={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
              onPayment={openPayment}
              onUndoPayment={handleUndoPayment}
              onDelete={handleDeletePlan}
            />
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content !max-w-3xl">
            <ModalHeader title="Nueva financiación propia" subtitle="Las cuotas vencerán automáticamente el día 10 de cada mes" onClose={() => setShowForm(false)} />
            <form onSubmit={handleCreatePlan} className="p-7 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Vehículo financiado" className="md:col-span-2">
                  <select required className="input-field" value={formData.vehicle_id} onChange={(event) => setFormData({ ...formData, vehicle_id: event.target.value })}>
                    <option value="">Seleccionar vehículo</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand} {vehicle.model} {vehicle.year || ''} - {vehicle.license_plate || 'Sin patente'} ({vehicle.status})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nombre y apellido"><input required className="input-field" value={formData.customer_name} onChange={(event) => setFormData({ ...formData, customer_name: event.target.value })} /></Field>
                <Field label="DNI"><input required className="input-field" value={formData.customer_dni} onChange={(event) => setFormData({ ...formData, customer_dni: event.target.value })} /></Field>
                <Field label="Teléfono"><input required className="input-field" value={formData.customer_phone} onChange={(event) => setFormData({ ...formData, customer_phone: event.target.value })} /></Field>
                <Field label="Domicilio"><input className="input-field" value={formData.customer_address} onChange={(event) => setFormData({ ...formData, customer_address: event.target.value })} /></Field>
                <Field label="Monto financiado"><input required type="number" min="1" className="input-field" value={formData.financed_amount} onChange={(event) => setFormData({ ...formData, financed_amount: event.target.value })} /></Field>
                <Field label="Cantidad de cuotas"><input required type="number" min="1" max="120" className="input-field" value={formData.installment_count} onChange={(event) => setFormData({ ...formData, installment_count: event.target.value })} /></Field>
                <Field label="Importe de cada cuota">
                  <div className="flex gap-2">
                    <input required type="number" min="1" className="input-field" value={formData.installment_amount} onChange={(event) => setFormData({ ...formData, installment_amount: event.target.value })} />
                    <button type="button" onClick={handleCalculateInstallment} className="px-3 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black uppercase">Calcular</button>
                  </div>
                </Field>
                <Field label="Primer mes de pago"><input required type="month" className="input-field" value={formData.first_due_month} onChange={(event) => setFormData({ ...formData, first_due_month: event.target.value })} /></Field>
                <Field label="Observaciones" className="md:col-span-2"><textarea rows="3" className="input-field resize-none" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} /></Field>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex flex-wrap justify-between gap-3 text-sm">
                <span className="font-bold text-blue-800">Período mensual de pago: del 1 al 10</span>
                <span className="font-black text-blue-950">Total del plan: {money(planTotal)}</span>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold">Cancelar</button>
                <button disabled={saving} className="flex-[2] btn-primary justify-center py-3">{saving ? 'Guardando...' : 'Crear plan de cuotas'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentTarget && (
        <div className="modal-overlay">
          <div className="modal-content !max-w-md">
            <ModalHeader title={`Registrar cuota ${paymentTarget.installment.installment_number}`} subtitle={paymentTarget.plan.customer_name} onClose={() => setPaymentTarget(null)} />
            <form onSubmit={handlePayment} className="p-7 space-y-5">
              <Field label="Fecha de pago"><input required type="date" className="input-field" value={paymentData.paid_at} onChange={(event) => setPaymentData({ ...paymentData, paid_at: event.target.value })} /></Field>
              <Field label="Importe recibido"><input required type="number" min="1" className="input-field" value={paymentData.paid_amount} onChange={(event) => setPaymentData({ ...paymentData, paid_amount: event.target.value })} /></Field>
              <Field label="Nota del pago"><textarea rows="2" className="input-field resize-none" value={paymentData.payment_notes} onChange={(event) => setPaymentData({ ...paymentData, payment_notes: event.target.value })} /></Field>
              <button disabled={saving} className="btn-primary w-full justify-center py-3.5">{saving ? 'Registrando...' : 'Confirmar pago'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ icon, label, value, detail }) => (
  <div className="table-container bg-white p-5 shadow-lg">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-2">{value}</p>
        <p className="text-[10px] font-bold text-slate-400 mt-1">{detail}</p>
      </div>
      <div className="p-3 rounded-2xl bg-slate-50">{icon}</div>
    </div>
  </div>
);

const PlanCard = ({ plan, expanded, onToggle, onPayment, onUndoPayment, onDelete }) => {
  const progress = plan.installment_count ? (plan.paid.length / plan.installment_count) * 100 : 0;
  return (
    <div className={`table-container bg-white shadow-xl overflow-hidden border ${plan.overdue.length ? 'border-red-200' : 'border-slate-100'}`}>
      <div className="p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className={`p-3 rounded-2xl shrink-0 ${plan.overdue.length ? 'bg-red-50 text-red-500' : plan.status === 'Completado' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
              <Car size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">{plan.customer_name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${plan.status === 'Completado' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{plan.status}</span>
                {plan.overdue.length > 0 && <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-700">{plan.overdue.length} pendientes</span>}
              </div>
              <p className="text-sm font-bold text-slate-600 mt-1">{plan.brand || 'Vehículo eliminado'} {plan.model} {plan.year || ''} · {plan.license_plate || 'Sin patente'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400 font-medium">
                <span>DNI {plan.customer_dni}</span><span className="inline-flex items-center gap-1"><Phone size={12} /> {plan.customer_phone}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xl:min-w-[620px]">
            <PlanMetric label="Financiado" value={money(plan.financed_amount)} />
            <PlanMetric label="Cuota mensual" value={money(plan.installment_amount)} />
            <PlanMetric label="Pagadas" value={`${plan.paid.length}/${plan.installment_count}`} />
            <PlanMetric label="Próximo vencimiento" value={plan.nextPending ? formatDate(plan.nextPending.due_date) : 'Completado'} />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
            <span>Progreso del plan</span><span>{progress.toFixed(0)}% · {money(plan.paidAmount)} cobrado</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <button onClick={onToggle} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />} {expanded ? 'Ocultar cuotas' : 'Ver cuotas'}
          </button>
          <button onClick={() => onDelete(plan)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 text-xs font-bold"><Trash2 size={15} /> Eliminar plan</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr><th className="px-6 py-4">Cuota</th><th className="px-6 py-4">Período</th><th className="px-6 py-4">Vencimiento</th><th className="px-6 py-4">Importe</th><th className="px-6 py-4">Estado</th><th className="px-6 py-4">Pago</th><th className="px-6 py-4 text-right">Acción</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.installments.map((installment) => {
                const state = getInstallmentState(installment);
                return (
                  <tr key={installment.id} className={state === 'overdue' || state === 'due' ? 'bg-red-50/60' : ''}>
                    <td className="px-6 py-4 font-black text-slate-700">#{installment.installment_number}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-500">Del 1 al 10</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600">{formatDate(installment.due_date)}</td>
                    <td className="px-6 py-4 font-black text-slate-800">{money(installment.amount)}</td>
                    <td className="px-6 py-4"><InstallmentBadge state={state} /></td>
                    <td className="px-6 py-4 text-xs text-slate-500">{installment.paid_at ? `${formatDate(installment.paid_at)} · ${money(installment.paid_amount)}` : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      {installment.status === 'Pagada' ? (
                        <button onClick={() => onUndoPayment(plan, installment)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-amber-600"><Undo2 size={14} /> Anular</button>
                      ) : (
                        <button onClick={() => onPayment(plan, installment)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">Registrar pago</button>
                      )}
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
};

const InstallmentBadge = ({ state }) => {
  const styles = {
    paid: ['Pagada', 'bg-emerald-100 text-emerald-700'],
    overdue: ['Vencida', 'bg-red-100 text-red-700'],
    due: ['Vence hoy', 'bg-red-100 text-red-700'],
    'payment-window': ['En período de pago', 'bg-amber-100 text-amber-700'],
    upcoming: ['Próxima', 'bg-slate-100 text-slate-500']
  };
  const [label, className] = styles[state];
  return <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${className}`}>{label}</span>;
};

const PlanMetric = ({ label, value }) => <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p><p className="text-sm font-black text-slate-800 mt-1">{value}</p></div>;
const Field = ({ label, children, className = '' }) => <label className={`space-y-2 ${className}`}><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>{children}</label>;
const ModalHeader = ({ title, subtitle, onClose }) => <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900"><div><h3 className="text-xl font-black text-white uppercase tracking-tight">{title}</h3><p className="text-xs text-slate-400 mt-1">{subtitle}</p></div><button onClick={onClose} className="btn-action"><X size={22} /></button></div>;

export default FinancingView;
