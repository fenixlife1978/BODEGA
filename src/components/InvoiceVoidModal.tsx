import React, { useState } from 'react';
import { SaleRecord, PosConfig } from '../types/pos';
import { sound } from '../utils/sound';
import {
  X,
  Ban,
  Search,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Receipt,
  RotateCcw,
  Calendar,
  DollarSign
} from 'lucide-react';

interface InvoiceVoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesHistory: SaleRecord[];
  config: PosConfig;
  onVoidSale: (saleId: string, reason: string, supervisorPin: string) => void;
}

export const InvoiceVoidModal: React.FC<InvoiceVoidModalProps> = ({
  isOpen,
  onClose,
  salesHistory,
  config,
  onVoidSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [voidReason, setVoidReason] = useState('Error en factura / Cobro duplicado');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const validSales = salesHistory.filter(
    (s) =>
      s.status !== 'ANULADA' &&
      (s.receiptNumber.includes(searchTerm.trim()) ||
        s.timestamp.includes(searchTerm.trim()) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    onVoidSale(selectedSale.id, voidReason, supervisorPin);
    sound.playError();
    setSuccessMsg(`¡Factura #${selectedSale.receiptNumber} anulada correctamente! La mercancía fue restaurada al inventario.`);
    setSelectedSale(null);
    setSupervisorPin('');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Ban className="w-6 h-6 text-rose-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Anulación de Facturas Emitidas</h2>
              <p className="text-xs text-rose-200 mt-0.5">
                Revocación formal de transacciones con restitución automática de stock
              </p>
            </div>
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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {successMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Column: Select Sale to Void */}
            <div className="md:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wide block">
                Seleccionar Factura a Anular:
              </span>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="N° de Factura..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto space-y-1">
                {validSales.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No hay facturas emitidas disponibles para anular.
                  </div>
                ) : (
                  validSales.map((sale) => (
                    <div
                      key={sale.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedSale(sale);
                      }}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                        selectedSale?.id === sale.id
                          ? 'bg-rose-50 border border-rose-300 shadow-2xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex justify-between font-bold text-xs">
                        <span className="text-slate-900">Factura #{sale.receiptNumber}</span>
                        <span className="font-mono text-rose-700">${sale.totalUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10.5px] text-slate-500 mt-0.5 font-mono">
                        <span>{sale.timestamp}</span>
                        <span>{sale.items.length} artículos</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Voiding Details & Confirmation */}
            <div className="md:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              {selectedSale ? (
                <form onSubmit={handleConfirmVoid} className="space-y-4 animate-fade-in">
                  <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>¿Confirmar Anulación de la Factura #{selectedSale.receiptNumber}?</span>
                    </div>
                    <p className="text-[11px] text-rose-700">
                      Esta acción cancela la venta en el reporte de caja y restituye todos los artículos al stock disponible.
                    </p>
                  </div>

                  <div className="text-xs space-y-2 font-mono bg-slate-50 p-3 rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Total de la Factura:</span>
                      <span className="font-black text-slate-900">${selectedSale.totalUsd.toFixed(2)} USD (Bs. {selectedSale.totalBs.toFixed(2)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Artículos Vendidos:</span>
                      <span>{selectedSale.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Motivo de Anulación:</label>
                      <select
                        value={voidReason}
                        onChange={(e) => setVoidReason(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                      >
                        <option value="Error en factura / Cobro duplicado">Error en factura / Cobro duplicado</option>
                        <option value="Fallo en pasarela de pago o tarjeta">Fallo en pasarela de pago o tarjeta</option>
                        <option value="Cliente desistió antes del despacho">Cliente desistió antes del despacho</option>
                        <option value="Prueba técnica o demostración">Prueba técnica o demostración</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">PIN Supervisor (Opcional):</label>
                      <input
                        type="password"
                        value={supervisorPin}
                        onChange={(e) => setSupervisorPin(e.target.value)}
                        placeholder="PIN de autorización..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 pos-btn cursor-pointer shadow-md"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Anular Factura Definitivamente</span>
                  </button>
                </form>
              ) : (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <Receipt className="w-10 h-10 text-slate-300" />
                  <p className="font-bold text-xs text-slate-600">Seleccione la factura que desea anular</p>
                  <p className="text-[11px] text-slate-400">Verifique los ítems antes de proceder con la anulación</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Auditoría Fiscal POS • Bodega El Sol</span>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold rounded text-slate-800 pos-btn cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
