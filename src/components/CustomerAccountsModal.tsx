import React, { useState } from 'react';
import { Customer, CreditPaymentRecord, PosConfig } from '../types/pos';
import { sound } from '../utils/sound';
import {
  X,
  Search,
  UserCheck,
  DollarSign,
  CreditCard,
  Phone,
  MapPin,
  Calendar,
  Plus,
  ArrowDownRight,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Printer,
  Coins
} from 'lucide-react';

interface CustomerAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  config: PosConfig;
  onAddPayment: (payment: CreditPaymentRecord) => void;
  onOpenNewCustomer: () => void;
}

export const CustomerAccountsModal: React.FC<CustomerAccountsModalProps> = ({
  isOpen,
  onClose,
  customers,
  config,
  onAddPayment,
  onOpenNewCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Payment Form State
  const [payAmountUsd, setPayAmountUsd] = useState('');
  const [payMethod, setPayMethod] = useState<'EFECTIVO_USD' | 'EFECTIVO_BS' | 'PAGO_MOVIL' | 'PUNTO_VENTA' | 'TRANSFERENCIA'>('EFECTIVO_USD');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const totalOutstandingUsd = customers.reduce((acc, c) => acc + c.currentBalanceUsd, 0);
  const totalOutstandingBs = totalOutstandingUsd * config.exchangeRate;

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amountNum = parseFloat(payAmountUsd);
    if (isNaN(amountNum) || amountNum <= 0) {
      sound.playError();
      return;
    }

    const newPayment: CreditPaymentRecord = {
      id: `ABONO-${Date.now()}`,
      customerId: selectedCustomer.id,
      timestamp: new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }),
      amountUsd: amountNum,
      amountBs: amountNum * config.exchangeRate,
      exchangeRate: config.exchangeRate,
      paymentMethod: payMethod,
      reference: payRef.trim() || `Abono Caja #${Date.now().toString().slice(-4)}`,
      notes: payNotes,
      receivedBy: config.cashierName || 'Cajero 1',
    };

    onAddPayment(newPayment);
    sound.playSuccess();
    setSuccessMsg(`¡Abono de $${amountNum.toFixed(2)} registrado con éxito para ${selectedCustomer.name}!`);
    setShowPaymentForm(false);
    setPayAmountUsd('');
    setPayRef('');
    setPayNotes('');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#1b4e8c] text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Cuentas por Cobrar (CxC) & Créditos</h2>
                <span className="px-2 py-0.5 bg-blue-900 text-blue-200 rounded text-xs font-mono font-bold">
                  {customers.length} Clientes
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Gestión de saldos pendientes, límites comerciales y registro de abonos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenNewCustomer();
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 pos-btn cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Cliente</span>
            </button>

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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Cartera Total por Cobrar (USD)
              </span>
              <div className="text-2xl font-black text-rose-700 font-mono">
                ${totalOutstandingUsd.toFixed(2)} USD
              </div>
              <div className="text-xs font-bold text-slate-600 font-mono mt-0.5">
                Bs. {totalOutstandingBs.toFixed(2)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Clientes con Deuda Activa
              </span>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {customers.filter((c) => c.currentBalanceUsd > 0).length} de {customers.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {(customers.filter((c) => c.currentBalanceUsd === 0).length)} solventes al día
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Tasa de Liquidación BCV
              </span>
              <div className="text-xl font-black text-[#1b4e8c] font-mono">
                {config.exchangeRate.toFixed(2)} Bs / USD
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Abonos convertibles en tiempo real
              </div>
            </div>
          </div>

          {/* Main Grid: Customer List & Detail/Payment */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Search & Customer List */}
            <div className="lg:col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, RIF o teléfono..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-[#1b4e8c] focus:outline-hidden"
                />
              </div>

              <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto space-y-1">
                {filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  const hasDebt = cust.currentBalanceUsd > 0;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedCustomer(cust);
                        setShowPaymentForm(false);
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 border border-blue-300 shadow-2xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{cust.name}</h4>
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            {cust.taxId} • Telf: {cust.phone}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <div
                            className={`font-black text-xs ${
                              hasDebt ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            ${cust.currentBalanceUsd.toFixed(2)}
                          </div>
                          <span className="text-[9.5px] text-slate-400 block">
                            Límite: ${cust.creditLimitUsd.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Customer Account & Payment Action */}
            <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              {selectedCustomer ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900">{selectedCustomer.name}</h3>
                      <div className="text-xs text-slate-600 font-mono mt-0.5">
                        RIF/CI: <strong>{selectedCustomer.taxId}</strong> • Plazo: {selectedCustomer.creditDays} días
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
                        {selectedCustomer.address || 'Sin dirección'}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-[11px] font-black uppercase ${
                        selectedCustomer.currentBalanceUsd > 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {selectedCustomer.currentBalanceUsd > 0 ? 'Con Saldo Deudor' : 'Solvente'}
                    </span>
                  </div>

                  {/* Financial Status Summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans">Deuda Actual:</span>
                      <span className="font-black text-base text-rose-700">
                        ${selectedCustomer.currentBalanceUsd.toFixed(2)} USD
                      </span>
                      <span className="text-[10.5px] text-slate-500 block">
                        (Bs. {(selectedCustomer.currentBalanceUsd * config.exchangeRate).toFixed(2)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans">Crédito Disponible:</span>
                      <span className="font-black text-base text-emerald-700">
                        ${Math.max(0, selectedCustomer.creditLimitUsd - selectedCustomer.currentBalanceUsd).toFixed(2)}
                      </span>
                      <span className="text-[10.5px] text-slate-500 block">
                        Límite: ${selectedCustomer.creditLimitUsd.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment registration form */}
                  {showPaymentForm ? (
                    <form onSubmit={handleRegisterPayment} className="space-y-3 pt-2 border-t border-slate-200 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                          Registrar Abono a la Deuda:
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPaymentForm(false)}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Monto a Abonar (USD):</label>
                          <input
                            type="number"
                            step="0.01"
                            max={selectedCustomer.currentBalanceUsd}
                            value={payAmountUsd}
                            onChange={(e) => setPayAmountUsd(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-1.5 font-bold font-mono text-sm border-2 border-emerald-500 rounded-lg focus:outline-hidden"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Equivalente en Bs.:</label>
                          <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-bold font-mono text-slate-800 border">
                            Bs. {((parseFloat(payAmountUsd) || 0) * config.exchangeRate).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Método de Pago:</label>
                          <select
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                          >
                            <option value="EFECTIVO_USD">Efectivo USD ($)</option>
                            <option value="EFECTIVO_BS">Efectivo Bolívares (Bs.)</option>
                            <option value="PAGO_MOVIL">Pago Móvil</option>
                            <option value="PUNTO_VENTA">Punto de Venta</option>
                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Referencia / Comprobante:</label>
                          <input
                            type="text"
                            value={payRef}
                            onChange={(e) => setPayRef(e.target.value)}
                            placeholder="Ej: Ref #8821"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg pos-btn shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar y Procesar Abono</span>
                      </button>
                    </form>
                  ) : (
                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setShowPaymentForm(true);
                          setPayAmountUsd(selectedCustomer.currentBalanceUsd.toFixed(2));
                        }}
                        disabled={selectedCustomer.currentBalanceUsd <= 0}
                        className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 pos-btn cursor-pointer ${
                          selectedCustomer.currentBalanceUsd > 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                        <span>Abonar a la Cuenta</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          window.print();
                        }}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-1.5 pos-btn cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Estado de Cuenta</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <UserCheck className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                  <p className="font-bold text-xs text-slate-600">Seleccione un cliente para ver su estado de cuenta</p>
                  <p className="text-[11px] text-slate-400">Podrá registrar abonos de facturas a crédito y descargar comprobantes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Módulo Financiero CxC • Bodega El Sol</span>
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
