import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const BLUE = [30, 64, 175];
const DARK = [15, 23, 42];
const SLATE = [71, 85, 105];
const LIGHT = [241, 245, 249];
const GREEN = [5, 150, 105];
const AMBER = [217, 119, 6];
const RED = [220, 38, 38];

const money = (value) => `$ ${Math.round(Number(value || 0)).toLocaleString('es-AR')}`;

const clean = (value, fallback = 'Sin informar') => {
  const normalized = String(value || '').replace(/[\r\n\t]+/g, ' ').trim();
  return normalized || fallback;
};

const isAssignedSeller = (value) => {
  const seller = String(value || '').trim();
  return Boolean(seller && seller !== 'No asignado' && seller !== 'Sin asignar');
};

const formatDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 'Sin fecha';
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const variation = (current, previous) => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

const variationLabel = (value) => {
  if (value === null) return 'Sin base comparable';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}% vs. mes anterior`;
};

export const summarizeMonthlySales = (sales, previousSales = []) => {
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.final_price || 0), 0);
  const previousRevenue = previousSales.reduce((sum, sale) => sum + Number(sale.final_price || 0), 0);
  const sellerMap = {};
  const paymentMap = {};
  const provinceMap = {};

  sales.forEach((sale) => {
    const payment = clean(sale.payment_method);
    const province = clean(sale.buyer_province);

    if (isAssignedSeller(sale.seller_name)) {
      const seller = sale.seller_name.trim();
      if (!sellerMap[seller]) sellerMap[seller] = { name: seller, sales: 0, revenue: 0 };
      sellerMap[seller].sales += 1;
      sellerMap[seller].revenue += Number(sale.final_price || 0);
    }
    paymentMap[payment] = (paymentMap[payment] || 0) + 1;
    provinceMap[province] = (provinceMap[province] || 0) + 1;
  });

  const sellerPerformance = Object.values(sellerMap)
    .map((seller) => ({ ...seller, averageTicket: seller.sales ? seller.revenue / seller.sales : 0 }))
    .sort((a, b) => b.sales - a.sales || b.revenue - a.revenue);
  const paymentPerformance = Object.entries(paymentMap)
    .map(([name, salesCount]) => ({ name, sales: salesCount }))
    .sort((a, b) => b.sales - a.sales);
  const provincePerformance = Object.entries(provinceMap)
    .map(([name, salesCount]) => ({ name, sales: salesCount }))
    .sort((a, b) => b.sales - a.sales);

  return {
    totalSales: sales.length,
    totalRevenue,
    averageTicket: sales.length ? totalRevenue / sales.length : 0,
    previousSales: previousSales.length,
    previousRevenue,
    salesVariation: variation(sales.length, previousSales.length),
    revenueVariation: variation(totalRevenue, previousRevenue),
    sellerPerformance,
    paymentPerformance,
    provincePerformance,
    topSeller: sellerPerformance[0] || null,
    topProvince: provincePerformance[0] || null,
    unassignedSales: sales.filter((sale) => !isAssignedSeller(sale.seller_name)).length,
  };
};

export const summarizeMonthlyFinancing = (financingPlans = [], monthKey) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthInstallments = [];
  const paidInMonth = [];
  const dueInMonth = [];

  financingPlans.forEach((plan) => {
    plan.installments?.forEach((installment) => {
      const dueThisMonth = String(installment.due_date || '').startsWith(monthKey);
      const paidThisMonth = String(installment.paid_at || '').startsWith(monthKey);
      if (dueThisMonth) dueInMonth.push({ ...installment, plan });
      if (paidThisMonth) paidInMonth.push({ ...installment, plan });
      if (dueThisMonth || paidThisMonth) monthInstallments.push({ ...installment, plan, dueThisMonth, paidThisMonth });
    });
  });

  const uniqueInstallments = Array.from(
    new Map(monthInstallments.map((item) => [`${item.plan.id}-${item.id}`, item])).values()
  ).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const activePlans = financingPlans.filter((plan) => plan.status === 'Activo');
  const totalOutstanding = financingPlans.reduce((sum, plan) => (
    sum + (plan.installments || [])
      .filter((installment) => installment.status !== 'Pagada')
      .reduce((installmentSum, installment) => installmentSum + Number(installment.amount || 0), 0)
  ), 0);
  const pendingDue = dueInMonth.filter((item) => item.status !== 'Pagada');
  const overdue = pendingDue.filter((item) => String(item.due_date || '') < todayKey);
  const collected = paidInMonth.reduce((sum, item) => sum + Number(item.paid_amount || item.amount || 0), 0);
  const dueAmount = dueInMonth.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const relevantCustomers = new Set(uniqueInstallments.map((item) => item.plan.id)).size;

  return {
    activePlans: activePlans.length,
    activeFinancedAmount: activePlans.reduce((sum, plan) => sum + Number(plan.financed_amount || 0), 0),
    totalOutstanding,
    collected,
    dueAmount,
    paidCount: paidInMonth.length,
    dueCount: dueInMonth.length,
    pendingCount: pendingDue.length,
    overdueCount: overdue.length,
    relevantCustomers,
    installments: uniqueInstallments,
    hasActivity: uniqueInstallments.length > 0,
  };
};

const drawHeader = (doc, monthLabel, statusLabel) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AUTOMOTORES MARCOS', 15, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(191, 219, 254);
  doc.text('Informe ejecutivo mensual de ventas y financiaciones', 15, 23);

  doc.setFillColor(...BLUE);
  doc.roundedRect(pageWidth - 92, 9, 77, 16, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(monthLabel.toUpperCase(), pageWidth - 53.5, 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(statusLabel, pageWidth - 53.5, 21, { align: 'center' });
};

const drawKpi = (doc, x, label, value, subtitle, accent = BLUE) => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, 42, 61, 28, 3, 3, 'FD');
  doc.setFillColor(...accent);
  doc.roundedRect(x, 42, 4, 28, 3, 3, 'F');
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(label.toUpperCase(), x + 9, 50);
  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.text(clean(value, '-'), x + 9, 59, { maxWidth: 47 });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text(clean(subtitle, ' '), x + 9, 65, { maxWidth: 47 });
};

const addFooters = (doc, monthLabel) => {
  const pages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, pageHeight - 10, pageWidth - 15, pageHeight - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Automotores Marcos - Informe ${monthLabel}`, 15, pageHeight - 5);
    doc.text(`Pagina ${page} de ${pages}`, pageWidth - 15, pageHeight - 5, { align: 'right' });
  }
};

export const downloadMonthlySalesReport = ({ monthKey, monthLabel, sales, previousSales, financingPlans = [], isClosedMonth }) => {
  if (!monthKey || monthKey === 'All') throw new Error('Seleccioná un mes para generar el informe.');

  const summary = summarizeMonthlySales(sales, previousSales);
  const financing = summarizeMonthlyFinancing(financingPlans, monthKey);
  if (!sales.length && !financing.hasActivity) throw new Error('No hay ventas ni actividad de cuotas en el período seleccionado.');
  const statusLabel = isClosedMonth ? 'MES CERRADO' : 'MES EN CURSO';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawHeader(doc, monthLabel, statusLabel);
  doc.setFillColor(...LIGHT);
  doc.rect(0, 34, pageWidth, 176, 'F');

  drawKpi(doc, 15, 'Ventas', String(summary.totalSales), variationLabel(summary.salesVariation), GREEN);
  drawKpi(doc, 82, 'Facturacion', money(summary.totalRevenue), variationLabel(summary.revenueVariation), BLUE);
  drawKpi(doc, 149, 'Ticket promedio', money(summary.averageTicket), 'Promedio por operacion', [124, 58, 237]);
  drawKpi(
    doc,
    216,
    'Vendedor destacado',
    summary.topSeller?.name || 'Sin datos',
    summary.topSeller ? `${summary.topSeller.sales} ventas - ${money(summary.topSeller.revenue)}` : 'Sin ventas asignadas',
    [217, 119, 6]
  );

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 78, 267, 22, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text('RESUMEN EJECUTIVO', 21, 86);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  const summaryParts = [
    `${summary.totalSales} operaciones por ${money(summary.totalRevenue)}, con ticket promedio de ${money(summary.averageTicket)}.`,
    summary.topSeller ? `${summary.topSeller.name} lidero el mes con ${summary.topSeller.sales} ventas.` : 'No hay vendedor destacado.',
    summary.topProvince ? `${summary.topProvince.name} fue la principal region con ${summary.topProvince.sales} operaciones.` : 'Sin informacion geografica.',
    summary.totalSales
      ? summary.unassignedSales
        ? `${summary.unassignedSales} ventas historicas no tienen vendedor asignado.`
        : 'Todas las ventas tienen vendedor asignado.'
      : 'El periodo no registra ventas cerradas.',
    financing.hasActivity ? `En cuotas se cobraron ${money(financing.collected)} y quedaron ${financing.pendingCount} vencimientos del periodo sin cancelar.` : 'El periodo no registra actividad de cuotas.',
  ];
  doc.text(doc.splitTextToSize(summaryParts.join(' '), 253), 21, 93);

  autoTable(doc, {
    startY: 107,
    margin: { left: 15, right: 151 },
    tableWidth: 131,
    head: [['Vendedor', 'Ventas', 'Facturacion', 'Ticket prom.']],
    body: summary.sellerPerformance.map((seller) => [
      seller.name,
      String(seller.sales),
      money(seller.revenue),
      money(seller.averageTicket),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.4, textColor: DARK, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  });

  autoTable(doc, {
    startY: 107,
    margin: { left: 153, right: 15 },
    tableWidth: 129,
    head: [['Medio de pago', 'Operaciones', 'Participacion']],
    body: summary.paymentPerformance.map((payment) => [
      payment.name,
      String(payment.sales),
      `${((payment.sales / summary.totalSales) * 100).toFixed(1)}%`,
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.4, textColor: DARK, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
  });

  if (sales.length) {
    doc.addPage('a4', 'landscape');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.setFontSize(15);
    doc.text(`Detalle de operaciones - ${monthLabel}`, 15, 16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE);
    doc.setFontSize(8);
    doc.text(`${sales.length} ventas incluidas en el informe`, 15, 22);

    autoTable(doc, {
      startY: 28,
      margin: { left: 15, right: 15, top: 24, bottom: 16 },
      head: [['Fecha', 'Vehiculo', 'Vendedor', 'Cliente', 'Ubicacion', 'Pago', 'Precio final']],
      body: sales.map((sale) => [
        formatDate(sale.sale_date),
        `${clean(sale.brand)} ${clean(sale.model, '')} ${sale.year || ''}`.trim(),
        clean(sale.seller_name, 'No asignado'),
        clean(sale.buyer_name),
        [sale.buyer_locality, sale.buyer_province].filter(Boolean).map((value) => clean(value)).join(', ') || 'Sin informar',
        clean(sale.payment_method),
        money(sale.final_price),
      ]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 2.2, textColor: DARK, overflow: 'linebreak' },
      headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 48 },
        2: { cellWidth: 24 },
        3: { cellWidth: 35 },
        4: { cellWidth: 43 },
        5: { cellWidth: 31 },
        6: { cellWidth: 31, halign: 'right', fontStyle: 'bold', textColor: GREEN },
      },
    });
  }

  if (financing.hasActivity) {
    doc.addPage('a4', 'landscape');
    drawHeader(doc, monthLabel, statusLabel);
    doc.setFillColor(...LIGHT);
    doc.rect(0, 34, pageWidth, 176, 'F');

    drawKpi(doc, 15, 'Cobrado en cuotas', money(financing.collected), `${financing.paidCount} pagos registrados`, GREEN);
    drawKpi(doc, 82, 'Vencimientos del mes', String(financing.dueCount), `${money(financing.dueAmount)} programados`, BLUE);
    drawKpi(doc, 149, 'Pendientes del mes', String(financing.pendingCount), `${financing.overdueCount} vencidos al dia de hoy`, financing.pendingCount ? RED : GREEN);
    drawKpi(doc, 216, 'Saldo pendiente total', money(financing.totalOutstanding), `${financing.activePlans} planes activos`, AMBER);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 78, 267, 22, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text('RESUMEN DE FINANCIACIONES Y CUOTAS', 21, 86);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    const financingText = `${financing.relevantCustomers} clientes tuvieron actividad en el periodo. Se cobraron ${money(financing.collected)}. De ${financing.dueCount} cuotas con vencimiento mensual, ${financing.pendingCount} siguen pendientes. La cartera activa representa ${money(financing.activeFinancedAmount)} financiados y un saldo actual por cobrar de ${money(financing.totalOutstanding)}.`;
    doc.text(doc.splitTextToSize(financingText, 253), 21, 93);

    autoTable(doc, {
      startY: 107,
      margin: { left: 15, right: 15, top: 24, bottom: 16 },
      head: [['Cliente', 'Vehiculo', 'Cuota', 'Periodo de pago', 'Vencimiento', 'Estado', 'Importe', 'Cobrado']],
      body: financing.installments.map((installment) => {
        const isOverdue = installment.status !== 'Pagada' && String(installment.due_date || '') < new Date().toISOString().slice(0, 10);
        return [
          clean(installment.plan.customer_name),
          `${clean(installment.plan.brand)} ${clean(installment.plan.model, '')}`.trim(),
          `${installment.installment_number}/${installment.plan.installment_count}`,
          `Del ${installment.plan.payment_day_from || 1} al ${installment.plan.payment_day_to || 10}`,
          formatDate(installment.due_date),
          installment.status === 'Pagada' ? `Pagada ${formatDate(installment.paid_at)}` : isOverdue ? 'Vencida' : 'Pendiente',
          money(installment.amount),
          installment.paidThisMonth ? money(installment.paid_amount || installment.amount) : '-',
        ];
      }),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 6.8, cellPadding: 2.1, textColor: DARK, overflow: 'linebreak' },
      headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 39 },
        1: { cellWidth: 43 },
        2: { cellWidth: 17, halign: 'center' },
        3: { cellWidth: 29, halign: 'center' },
        4: { cellWidth: 27, halign: 'center' },
        5: { cellWidth: 35 },
        6: { cellWidth: 29, halign: 'right' },
        7: { cellWidth: 29, halign: 'right', fontStyle: 'bold', textColor: GREEN },
      },
    });
  }

  addFooters(doc, monthLabel);
  doc.save(`informe-mensual-${monthKey}.pdf`);
};
