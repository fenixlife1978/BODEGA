import React, { useState } from 'react';
import { SaleRecord, Product, PosConfig, ReturnRecord } from '../types/pos';
import { sound } from '../utils/sound';
import {
  X,
  RotateCcw,
  Search,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Package,
  DollarSign,
  ShieldCheck
} from 'lucide-react';

interface CustomerReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesHistory: SaleRecord[];
  config: PosConfig;
  onProcessReturn: (returnRecord: ReturnRecord) => void;
}

export const CustomerReturnsModal: React.FC<CustomerReturnsModalProps> = ({
  isOpen,
  onClose,
  salesHistory,
  config,
  onProcessReturn,
}) => {
  const [searchReceipt, setSearchReceipt] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [returnItemsQty, setReturnItemsQty] = useState<{ [productId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Producto en mal estado / vencido');
  const [refundMethod, setRefundMethod] = useState<'EFECTIVO_USD' | 'EFECTIVO_BS' | 'NOTA_CREDITO'>('EFECTIVO_USD');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [successRecord, setSuccessRecord] = useState<ReturnRecord | null>(null);

  if (!isOpen) return null;

  const filteredSales = salesHistory.filter(
    (s) =>
      s.status !== 'ANULADA' &&
      (s.receiptNumber.includes(searchReceipt.trim()) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchReceipt.toLowerCase())) ||
        s.timestamp.includes(searchReceipt.trim()))
  );

  const handleSelectSale = (sale: SaleRecord) => {
    sound.playClick();
    setSelectedSale(sale);
    // Initialize default return quantities to 0
    const initialQtys: { [key: string]: number } = {};
    sale.items.forEach((item) => {
      initialQtys[item.product.id] = 0;
    });
    setReturnItemsQty(initialQtys);
    setSuccessRecord(null);
  };

  const handleQuantityChange = (productId: string, maxQty: number, value: string) => {
    const val = parseFloat(value) || 0;
    const clamped = Math.min(Math.max(0, val), maxQty);
    setReturnItemsQty((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  // Calculate return total
  const itemsToReturn = selectedSale
    ? selectedSale.items
        .filter((item) => (returnItemsQty[item.product.id] || 0) > 0)
        .map((item) => {
          const qty = returnItemsQty[item.product.id];
          const unitPrice = item.product.priceUsd;
          return {
            productId: item.product.id,
            productName: item.product.name,
            quantity: qty,
            unitPriceUsd: unitPrice,
            totalUsd: Number((qty * unitPrice).toFixed(2)),
          };
        })
    : [];

  const totalRefundUsd = itemsToReturn.reduce((sum, item) => sum + item.totalUsd, 0);
  const totalRefundBs = totalRefundUsd * config.exchangeRate;

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || itemsToReturn.length === 0) {
      sound.playError();
      return;
    }

    const returnRecord: ReturnRecord = {
      id: `DEV-${Date.now()}`,
      saleId: selectedSale.id,
      receiptNumber: selectedSale.receiptNumber,
      timestamp: new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }),
      items: itemsToReturn,
      totalRefundUsd,
      totalRefundBs,
      refundMethod,
      reason: returnReason,
      authorizedBy: supervisorPin ? `Sup. PIN ${supervisorPin}` : config.cashierName || 'Cajero 1',
    };

    onProcessReturn(returnRecord);
    sound.playSuccess();
    setSuccessRecord(returnRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#1b4e8c] text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <RotateCcw className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Gestión de Devoluciones & Reintegros</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Reingreso de mercancía a inventario, reintegro de dinero y nota de crédito
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {successRecord ? (
            <div className="bg-white p-6 rounded-xl border border-emerald-300 text-center space-y-4 shadow-sm animate-fade-in">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">¡Devolución Procesada con Éxito!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Comprobante N°: <strong>{successRecord.id}</strong> para Factura #{successRecord.receiptNumber}
                </p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs font-mono max-w-md mx-auto space-y-1">
                <div className="flex justify-between">
                  <span>Monto Reintegrado:</span>
                  <span className="font-bold text-emerald-950">${successRecord.totalRefundUsd.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span>Equivalente en Bs.:</span>
                  <span className="font-bold text-emerald-950">Bs. {successRecord.totalRefundBs.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Método de Reintegro:</span>
                  <span>{successRecord.refundMethod}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Artículos Restituidos:</span>
                  <span>{successRecord.items.length} producto(s) sumados al stock</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 pos-btn cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Comprobante de Devolución</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSale(null);
                    setSuccessRecord(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold pos-btn cursor-pointer"
                >
                  Procesar Otra Devolución
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Select Sale Invoice */}
              <div className="md:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wide block">
                  1. Buscar Factura de Venta:
                </span>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchReceipt}
                    onChange={(e) => setSearchReceipt(e.target.value)}
                    placeholder="N° de Factura (ej: 001001)..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>

                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto space-y-1">
                  {filteredSales.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No se encontraron ventas para devolver.
                    </div>
                  ) : (
                    filteredSales.map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                          selectedSale?.id === sale.id
                            ? 'bg-blue-50 border border-blue-300 shadow-2xs'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex justify-between font-bold text-xs">
                          <span>Factura #{sale.receiptNumber}</span>
                          <span className="font-mono text-[#1b4e8c]">${sale.totalUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10.5px] text-slate-500 mt-0.5 font-mono">
                          <span>{sale.timestamp}</span>
                          <span>{sale.items.length} productos</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Pick Items and Reason */}
              <div className="md:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                {selectedSale ? (
                  <form onSubmit={handleSubmitReturn} className="space-y-4">
                    <div className="border-b pb-2 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase">
                          2. Artículos a Devolver (Factura #{selectedSale.receiptNumber})
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Fecha de compra: {selectedSale.timestamp}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto divide-y divide-slate-100 pr-1">
                      {selectedSale.items.map((item) => {
                        const currentReturn = returnItemsQty[item.product.id] || 0;
                        return (
                          <div key={item.product.id} className="pt-2 flex items-center justify-between text-xs">
                            <div className="truncate max-w-[170px]">
                              <span className="font-bold text-slate-900 block truncate">{item.product.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Comprado: {item.quantity} • ${item.product.priceUsd.toFixed(2)} c/u
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">Devolver:</span>
                              <input
                                type="number"
                                min={0}
                                max={item.quantity}
                                step="any"
                                value={currentReturn}
                                onChange={(e) => handleQuantityChange(item.product.id, item.quantity, e.target.value)}
                                className="w-16 px-2 py-1 text-center font-bold border border-slate-300 rounded focus:border-[#1b4e8c] font-mono text-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Return Details */}
                    <div className="space-y-2 pt-2 border-t text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Motivo de la Devolución:</label>
                        <select
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                        >
                          <option value="Producto en mal estado / vencido">Producto en mal estado / vencido</option>
                          <option value="Error de digitación o cajero">Error de digitación o cajero</option>
                          <option value="Cliente desistió de la compra">Cliente desistió de la compra</option>
                          <option value="Empaque dañado o defectuoso">Empaque dañado o defectuoso</option>
                          <option value="Cambio por otro producto">Cambio por otro producto</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Método de Reintegro:</label>
                          <select
                            value={refundMethod}
                            onChange={(e) => setRefundMethod(e.target.value as any)}
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                          >
                            <option value="EFECTIVO_USD">Efectivo USD ($)</option>
                            <option value="EFECTIVO_BS">Efectivo Bolívares (Bs.)</option>
                            <option value="NOTA_CREDITO">Nota de Crédito a Favor</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">PIN Supervisor (Opcional):</label>
                          <input
                            type="password"
                            value={supervisorPin}
                            onChange={(e) => setSupervisorPin(e.target.value)}
                            placeholder="PIN Autorización"
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                          />
                        </div>
                      </div>

                      {/* Total to refund banner */}
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-center justify-between font-mono">
                        <span className="font-bold text-xs text-blue-900">Total a Reintegrar:</span>
                        <div className="text-right">
                          <span className="font-black text-sm text-[#1b4e8c]">${totalRefundUsd.toFixed(2)} USD</span>
                          <span className="text-[10.5px] text-slate-600 block">
                            (Bs. {totalRefundBs.toFixed(2)})
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={itemsToReturn.length === 0}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 pos-btn cursor-pointer shadow-xs ${
                          itemsToReturn.length > 0
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Confirmar Devolución & Reingreso a Inventario</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                    <Receipt className="w-10 h-10 text-slate-300" />
                    <p className="font-bold text-xs text-slate-600">Selecciona una factura a la izquierda</p>
                    <p className="text-[11px] text-slate-400">Podrás marcar las cantidades devueltas y reintegrar el monto exacto</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Control de Devoluciones POS • Bodega El Sol</span>
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
