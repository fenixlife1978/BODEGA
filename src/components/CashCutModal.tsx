import React, { useState } from 'react';
import { PosConfig, SaleRecord } from '../types/pos';
import { sound } from '../utils/sound';
import {
  X,
  FileText,
  Printer,
  Download,
  DollarSign,
  CreditCard,
  Smartphone,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Calendar,
  User,
  Store,
  RefreshCw,
  Calculator,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export interface CashCutReport {
  id: string;
  cutType: 'CORTE_X' | 'CORTE_Z';
  timestamp: string;
  shiftStartTimestamp: string;
  storeName: string;
  cashierName: string;
  registerName: string;
  exchangeRate: number;
  initialCashUsd: number;
  initialCashBs: number;
  totalSalesCount: number;
  firstReceipt: string;
  lastReceipt: string;
  totalItemsCount: number;
  subtotalUsd: number;
  taxUsd: number;
  totalSalesUsd: number;
  subtotalBs: number;
  taxBs: number;
  totalSalesBs: number;
  cashUsdCollected: number;
  cashBsCollected: number;
  cardBsCollected: number;
  cardTxCount: number;
  pagoMovilBsCollected: number;
  pagoMovilTxCount: number;
  physicalCashUsdCounted: number;
  physicalCashBsCounted: number;
  differenceUsd: number;
  differenceBs: number;
  notes?: string;
}

interface CashCutModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PosConfig;
  salesHistory: SaleRecord[];
  onFinishShift?: (report: CashCutReport) => void;
}

export const CashCutModal: React.FC<CashCutModalProps> = ({
  isOpen,
  onClose,
  config,
  salesHistory,
  onFinishShift,
}) => {
  const [cutType, setCutType] = useState<'CORTE_X' | 'CORTE_Z'>('CORTE_Z');
  const [initialFundUsd, setInitialFundUsd] = useState('20.00');
  const [initialFundBs, setInitialFundBs] = useState('0.00');
  const [physicalCashUsd, setPhysicalCashUsd] = useState('');
  const [physicalCashBs, setPhysicalCashBs] = useState('');
  const [notes, setNotes] = useState('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [showDetailedSales, setShowDetailedSales] = useState(false);

  if (!isOpen) return null;

  const exchangeRate = config.exchangeRate || 42.0;

  // Aggregate sales calculations
  const totalSalesCount = salesHistory.length;
  const firstReceipt = totalSalesCount > 0 ? salesHistory[0].receiptNumber : '---';
  const lastReceipt = totalSalesCount > 0 ? salesHistory[totalSalesCount - 1].receiptNumber : '---';

  const totalItemsCount = salesHistory.reduce(
    (acc, s) => acc + s.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0),
    0
  );

  const subtotalUsd = salesHistory.reduce((acc, s) => acc + s.subtotalUsd, 0);
  const taxUsd = salesHistory.reduce((acc, s) => acc + s.taxUsd, 0);
  const totalSalesUsd = salesHistory.reduce((acc, s) => acc + s.totalUsd, 0);

  const subtotalBs = salesHistory.reduce((acc, s) => acc + s.subtotalBs, 0);
  const taxBs = salesHistory.reduce((acc, s) => acc + s.taxBs, 0);
  const totalSalesBs = salesHistory.reduce((acc, s) => acc + s.totalBs, 0);

  // Breakdown by payment methods
  const cashUsdCollected = salesHistory.reduce((acc, s) => acc + (s.payments.cashUsd || 0), 0);
  const cashBsCollected = salesHistory.reduce((acc, s) => acc + (s.payments.cashBs || 0), 0);
  const cardBsCollected = salesHistory.reduce((acc, s) => acc + (s.payments.cardBs || 0), 0);
  const cardTxCount = salesHistory.filter((s) => (s.payments.cardBs || 0) > 0).length;
  const pagoMovilBsCollected = salesHistory.reduce((acc, s) => acc + (s.payments.pagoMovilBs || 0), 0);
  const pagoMovilTxCount = salesHistory.filter((s) => (s.payments.pagoMovilBs || 0) > 0).length;

  // Change given
  const changeGivenUsd = salesHistory.reduce((acc, s) => acc + (s.changeGivenUsd || 0), 0);
  const changeGivenBs = salesHistory.reduce((acc, s) => acc + (s.changeGivenBs || 0), 0);

  // Net Cash expected in register (Initial Fund + Cash Sales - Change Given)
  const initUsdNum = parseFloat(initialFundUsd) || 0;
  const initBsNum = parseFloat(initialFundBs) || 0;
  const expectedCashUsd = initUsdNum + cashUsdCollected - changeGivenUsd;
  const expectedCashBs = initBsNum + cashBsCollected - changeGivenBs;

  const countedUsdNum = physicalCashUsd !== '' ? parseFloat(physicalCashUsd) || 0 : expectedCashUsd;
  const countedBsNum = physicalCashBs !== '' ? parseFloat(physicalCashBs) || 0 : expectedCashBs;

  const diffUsd = countedUsdNum - expectedCashUsd;
  const diffBs = countedBsNum - expectedCashBs;

  const nowFormatted = new Date().toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  const generateReportData = (): CashCutReport => {
    return {
      id: `CORTE-${Date.now()}`,
      cutType,
      timestamp: nowFormatted,
      shiftStartTimestamp: salesHistory.length > 0 ? salesHistory[0].timestamp : nowFormatted,
      storeName: config.storeName || 'Punto de Venta Sol',
      cashierName: config.cashierName || 'Cajero Principal',
      registerName: config.registerName || 'Caja 1',
      exchangeRate,
      initialCashUsd: initUsdNum,
      initialCashBs: initBsNum,
      totalSalesCount,
      firstReceipt,
      lastReceipt,
      totalItemsCount,
      subtotalUsd,
      taxUsd,
      totalSalesUsd,
      subtotalBs,
      taxBs,
      totalSalesBs,
      cashUsdCollected,
      cashBsCollected,
      cardBsCollected,
      cardTxCount,
      pagoMovilBsCollected,
      pagoMovilTxCount,
      physicalCashUsdCounted: countedUsdNum,
      physicalCashBsCounted: countedBsNum,
      differenceUsd: diffUsd,
      differenceBs: diffBs,
      notes,
    };
  };

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const handleDownloadReport = () => {
    sound.playSuccess();
    const report = generateReportData();
    const content = `=====================================================
          REPORTE DE CORTE DE CAJA (${report.cutType === 'CORTE_Z' ? 'CIERRE FINAL Z' : 'CORTE PARCIAL X'})
=====================================================
Establecimiento: ${report.storeName}
RIF: ${config.taxId}
Caja / Terminal: ${report.registerName}
Cajero: ${report.cashierName}
Fecha y Hora de Emisión: ${report.timestamp}
Tasa de Cambio Oficial: ${report.exchangeRate.toFixed(2)} Bs/USD
-----------------------------------------------------
RESUMEN DE OPERACIONES:
Total Facturas Emitidas: ${report.totalSalesCount}
Rango de Facturas: #${report.firstReceipt} hasta #${report.lastReceipt}
Total Unidades Vendidas: ${report.totalItemsCount.toFixed(3)}

VENTAS TOTALES:
Base Imponible (Subtotal): $${report.subtotalUsd.toFixed(2)} / Bs. ${report.subtotalBs.toFixed(2)}
IVA 16%: $${report.taxUsd.toFixed(2)} / Bs. ${report.taxBs.toFixed(2)}
TOTAL RECAUDADO: $${report.totalSalesUsd.toFixed(2)} / Bs. ${report.totalSalesBs.toFixed(2)}
-----------------------------------------------------
DESGLOSE POR MÉTODO DE PAGO:
1. Efectivo Divisas (USD):  $${report.cashUsdCollected.toFixed(2)} (Equiv. Bs. ${(report.cashUsdCollected * report.exchangeRate).toFixed(2)})
2. Efectivo Bolívares (Bs): Bs. ${report.cashBsCollected.toFixed(2)}
3. Punto de Venta / Débito: Bs. ${report.cardBsCollected.toFixed(2)} (${report.cardTxCount} txs)
4. Pago Móvil:              Bs. ${report.pagoMovilBsCollected.toFixed(2)} (${report.pagoMovilTxCount} txs)
-----------------------------------------------------
AUDITORÍA Y ARQUEO FÍSICO DE CAJA:
Fondo Inicial Apertura:     $${report.initialCashUsd.toFixed(2)} | Bs. ${report.initialCashBs.toFixed(2)}
Efectivo Esperado en Caja:  $${expectedCashUsd.toFixed(2)} | Bs. ${expectedCashBs.toFixed(2)}
Efectivo Contado Físico:    $${report.physicalCashUsdCounted.toFixed(2)} | Bs. ${report.physicalCashBsCounted.toFixed(2)}
Diferencia en USD:          ${report.differenceUsd >= 0 ? '+' : ''}$${report.differenceUsd.toFixed(2)} (${report.differenceUsd === 0 ? 'CUADRE EXACTO' : report.differenceUsd > 0 ? 'SOBRANTE' : 'FALTANTE'})
Diferencia en Bs:           ${report.differenceBs >= 0 ? '+' : ''}Bs. ${report.differenceBs.toFixed(2)}
-----------------------------------------------------
Notas / Observaciones: ${report.notes || 'Sin observaciones'}
=====================================================
Firma del Cajero: ___________________________________
Firma del Supervisor: _______________________________
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Corte_Caja_${report.cutType}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  const handleFinishAndResetShift = () => {
    if (window.confirm('¿Está seguro de que desea registrar el Cierre de Caja definitivo (Corte Z) y cerrar este turno?')) {
      sound.playSuccess();
      const report = generateReportData();
      if (onFinishShift) {
        onFinishShift(report);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#1b4e8c] text-white px-6 py-4 flex items-center justify-between shadow-md select-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Corte de Caja y Cierre de Turno</h2>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    cutType === 'CORTE_Z'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-blue-300 text-blue-950'
                  }`}
                >
                  {cutType === 'CORTE_Z' ? 'Cierre Diario (Z)' : 'Corte Parcial (X)'}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                {config.storeName} • Terminal: {config.registerName} • Tasa: {exchangeRate.toFixed(2)} Bs/USD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cut type selector */}
            <div className="bg-white/10 p-1 rounded-lg flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCutType('CORTE_X');
                }}
                className={`px-2.5 py-1 rounded font-bold transition-colors ${
                  cutType === 'CORTE_X' ? 'bg-white text-[#1b4e8c] shadow-xs' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                Corte X (Parcial)
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCutType('CORTE_Z');
                }}
                className={`px-2.5 py-1 rounded font-bold transition-colors ${
                  cutType === 'CORTE_Z' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                Corte Z (Cierre Final)
              </button>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {isSavedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Reporte de corte de caja descargado con éxito para los registros contables.</span>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {/* Card 1: Total Recaudado USD */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total Recaudado</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ${totalSalesUsd.toFixed(2)}
              </div>
              <div className="text-xs font-bold text-blue-700 font-mono mt-0.5">
                Bs. {totalSalesBs.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Base: ${subtotalUsd.toFixed(2)} + IVA: ${taxUsd.toFixed(2)}
              </div>
            </div>

            {/* Card 2: Total Transacciones */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Transacciones</span>
                <Receipt className="w-4 h-4 text-[#1b4e8c]" />
              </div>
              <div className="text-2xl font-black text-[#1b4e8c] font-mono">
                {totalSalesCount}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Tickets: #{firstReceipt} → #{lastReceipt}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {totalItemsCount.toFixed(3)} artículos despachados
              </div>
            </div>

            {/* Card 3: Efectivo en Caja */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Efectivo Total</span>
                <Coins className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-700 font-mono">
                ${cashUsdCollected.toFixed(2)} USD
              </div>
              <div className="text-xs font-bold text-slate-700 font-mono mt-0.5">
                Bs. {cashBsCollected.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Ventas directas en billetes
              </div>
            </div>

            {/* Card 4: Dinero Electrónico */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Punto + Móvil</span>
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-black text-purple-700 font-mono">
                Bs. {(cardBsCollected + pagoMovilBsCollected).toFixed(2)}
              </div>
              <div className="text-xs font-bold text-slate-600 font-mono mt-0.5">
                ${((cardBsCollected + pagoMovilBsCollected) / exchangeRate).toFixed(2)} USD
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {cardTxCount + pagoMovilTxCount} cobros electrónicos
              </div>
            </div>
          </div>

          {/* Main Grid: Breakdown & Arqueo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Detailed Payment Methods Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#1b4e8c]" />
                  <span>Desglose por Método de Pago</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">Tasa: {exchangeRate.toFixed(2)}</span>
              </div>

              <div className="space-y-3">
                {/* 1. Efectivo USD */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-600 text-white rounded-md">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-emerald-900">Efectivo Divisas ($ USD)</div>
                      <div className="text-[11px] text-emerald-700">Billetes extranjeros recibidos</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-emerald-950 font-mono">
                      ${cashUsdCollected.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-800 font-mono">
                      Bs. {(cashUsdCollected * exchangeRate).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* 2. Efectivo Bolívares */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-600 text-white rounded-md">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-amber-900">Efectivo Bolívares (Bs.)</div>
                      <div className="text-[11px] text-amber-700">Moneda nacional en efectivo</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-amber-950 font-mono">
                      Bs. {cashBsCollected.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-bold text-amber-800 font-mono">
                      ${(cashBsCollected / exchangeRate).toFixed(2)} USD
                    </div>
                  </div>
                </div>

                {/* 3. Punto de Venta / Tarjetas */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#1b4e8c] text-white rounded-md">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-blue-900">Punto de Venta / Tarjetas</div>
                      <div className="text-[11px] text-blue-700">{cardTxCount} transacciones de tarjeta</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-blue-950 font-mono">
                      Bs. {cardBsCollected.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-bold text-blue-800 font-mono">
                      ${(cardBsCollected / exchangeRate).toFixed(2)} USD
                    </div>
                  </div>
                </div>

                {/* 4. Pago Móvil */}
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-600 text-white rounded-md">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-purple-900">Pago Móvil Interbancario</div>
                      <div className="text-[11px] text-purple-700">{pagoMovilTxCount} transferencias P2P</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-purple-950 font-mono">
                      Bs. {pagoMovilBsCollected.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-bold text-purple-800 font-mono">
                      ${(pagoMovilBsCollected / exchangeRate).toFixed(2)} USD
                    </div>
                  </div>
                </div>
              </div>

              {/* Fiscal Totals Box */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg font-mono">
                <div>
                  <span className="text-slate-500 block text-[11px]">Base Imponible:</span>
                  <span className="font-bold text-slate-800">${subtotalUsd.toFixed(2)} (Bs. {subtotalBs.toFixed(2)})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">IVA Recaudado (16%):</span>
                  <span className="font-bold text-slate-800">${taxUsd.toFixed(2)} (Bs. {taxBs.toFixed(2)})</span>
                </div>
              </div>
            </div>

            {/* Right Column: Physical Cash Audit & Balancing (Arqueo de Caja) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-amber-600" />
                    <span>Auditoría & Arqueo Físico de Caja</span>
                  </h3>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Cuadre de Cierre
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Fondo Inicial */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-700 block">1. Fondo de Apertura (Base Inicial de Caja):</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1 font-semibold">Fondo Inicial USD ($):</label>
                        <input
                          type="text"
                          value={initialFundUsd}
                          onChange={(e) => setInitialFundUsd(e.target.value)}
                          placeholder="20.00"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-sm focus:border-[#1b4e8c] focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1 font-semibold">Fondo Inicial Bs.:</label>
                        <input
                          type="text"
                          value={initialFundBs}
                          onChange={(e) => setInitialFundBs(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-sm focus:border-[#1b4e8c] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Conteo Real en Caja */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-700 block">2. Efectivo Físico Contado en Caja (Gaveta):</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1 font-semibold">Billetes USD ($):</label>
                        <input
                          type="text"
                          value={physicalCashUsd}
                          onChange={(e) => setPhysicalCashUsd(e.target.value)}
                          placeholder={expectedCashUsd.toFixed(2)}
                          className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-400 rounded font-mono font-bold text-sm focus:border-[#1b4e8c] focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1 font-semibold">Efectivo Bs.:</label>
                        <input
                          type="text"
                          value={physicalCashBs}
                          onChange={(e) => setPhysicalCashBs(e.target.value)}
                          placeholder={expectedCashBs.toFixed(2)}
                          className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-400 rounded font-mono font-bold text-sm focus:border-[#1b4e8c] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resultados de Diferencia / Cuadre */}
                  <div
                    className={`p-3.5 rounded-lg border flex items-center justify-between ${
                      Math.abs(diffUsd) < 0.01 && Math.abs(diffBs) < 0.01
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : diffUsd >= 0 && diffBs >= 0
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <div>
                      <div className="font-black text-xs uppercase tracking-wide flex items-center gap-1.5">
                        {Math.abs(diffUsd) < 0.01 && Math.abs(diffBs) < 0.01 ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Caja Cuadrada Exacta</span>
                          </>
                        ) : diffUsd >= 0 && diffBs >= 0 ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span>Sobrante en Caja</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <span>Diferencia / Faltante en Caja</span>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Esperado: ${expectedCashUsd.toFixed(2)} USD | Bs. {expectedCashBs.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-base font-black">
                        {diffUsd >= 0 ? '+' : ''}${diffUsd.toFixed(2)} USD
                      </div>
                      <div className="text-xs font-bold">
                        {diffBs >= 0 ? '+' : ''}Bs. {diffBs.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Notas / Observaciones del Cierre:</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej: Turno regular sin novedades, corte Z aprobado por supervisor..."
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-[#1b4e8c] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-1.5 pos-btn cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Guardar Reporte (.TXT)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 pos-btn cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Cierre Fiscal</span>
                </button>

                {cutType === 'CORTE_Z' && (
                  <button
                    type="button"
                    onClick={handleFinishAndResetShift}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 pos-btn cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cerrar Turno & Reiniciar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>Cajero: <strong>{config.cashierName || 'Cajero 1'}</strong></span>
            <span>Fecha: <strong>{nowFormatted}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold rounded text-slate-800 pos-btn cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
