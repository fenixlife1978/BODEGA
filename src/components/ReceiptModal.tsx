import React from 'react';
import { SaleRecord, PosConfig } from '../types/pos';
import { sound } from '../utils/sound';
import { Printer, CheckCircle, X, Download, RotateCcw } from 'lucide-react';

interface ReceiptModalProps {
  sale: SaleRecord;
  config: PosConfig;
  onClose: () => void;
  onNewSale: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  config,
  onClose,
  onNewSale,
}) => {
  const handlePrint = () => {
    sound.playScan();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-300">
        {/* Header */}
        <div className="bg-[#1e4b85] text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-base">¡Venta Exitosa! Factura #{sale.receiptNumber}</span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-6 overflow-y-auto bg-slate-50 font-mono text-xs text-slate-800 space-y-3">
          <div id="printable-receipt" className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            {/* Header info */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3">
              <p className="font-bold text-sm tracking-wider uppercase">{config.storeName}</p>
              <p className="text-[11px] text-slate-600">RIF: {config.taxId}</p>
              <p className="text-[11px] text-slate-600">{config.address}</p>
              <p className="text-[11px] text-slate-600">Telf: {config.phone}</p>
              <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                <span>FACTURA: #{sale.receiptNumber}</span>
                <span>{sale.timestamp}</span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>CAJA: {sale.cashRegister}</span>
                <span>OPERADOR: {sale.cashier}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-400">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 text-[11px]">
                    <th className="pb-1">CANT/DESCRIPCION</th>
                    <th className="pb-1 text-right">P.UNIT</th>
                    <th className="pb-1 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, idx) => {
                    const lineTotal = item.overrideTotal ?? (item.product.priceUsd * item.quantity);
                    return (
                      <tr key={idx} className="py-1">
                        <td className="py-1">
                          <div className="font-semibold text-slate-900">{item.product.name}</div>
                          <div className="text-[10px] text-slate-500">Cant: {item.quantity}</div>
                        </td>
                        <td className="py-1 text-right">${item.product.priceUsd.toFixed(2)}</td>
                        <td className="py-1 text-right font-bold">${lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="py-3 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>SUBTOTAL USD:</span>
                <span className="font-semibold">${sale.subtotalUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>(Subtotal en Bs.):</span>
                <span>Bs. {sale.subtotalBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span className="font-semibold">${sale.taxUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>(IVA en Bs.):</span>
                <span>Bs. {sale.taxBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-300">
                <span>TOTAL VENTA:</span>
                <span>${sale.totalUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs text-blue-900">
                <span>TOTAL EN BOLÍVARES:</span>
                <span>Bs. {sale.totalBs.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-slate-500 text-center pt-1">
                Tasa de Cambio Oficial: {sale.exchangeRate.toFixed(2)} Bs/USD
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="font-semibold text-slate-700">PAGO RECIBIDO:</div>
              {sale.payments.cashUsd > 0 && (
                <div className="flex justify-between">
                  <span>• Efectivo Divisa USD:</span>
                  <span>${sale.payments.cashUsd.toFixed(2)}</span>
                </div>
              )}
              {sale.payments.cashBs > 0 && (
                <div className="flex justify-between">
                  <span>• Efectivo Bolívares:</span>
                  <span>Bs. {sale.payments.cashBs.toFixed(2)}</span>
                </div>
              )}
              {sale.payments.cardBs > 0 && (
                <div className="flex justify-between">
                  <span>• Punto de Venta / Tarjeta:</span>
                  <span>Bs. {sale.payments.cardBs.toFixed(2)}</span>
                </div>
              )}
              {sale.payments.pagoMovilBs > 0 && (
                <div className="flex justify-between">
                  <span>• Pago Móvil ({sale.payments.pagoMovilBank || 'Ref'}):</span>
                  <span>Bs. {sale.payments.pagoMovilBs.toFixed(2)}</span>
                </div>
              )}
              {(sale.changeGivenUsd > 0 || sale.changeGivenBs > 0) && (
                <div className="flex justify-between font-bold text-emerald-700 pt-1">
                  <span>CAMBIO / VUELTO ENTREGADO:</span>
                  <span>
                    {sale.changeGivenUsd > 0 ? `$${sale.changeGivenUsd.toFixed(2)} ` : ''}
                    {sale.changeGivenBs > 0 ? `(Bs. ${sale.changeGivenBs.toFixed(2)})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
              <p className="font-bold">*** GRACIAS POR SU COMPRA ***</p>
              <p>Conserve su factura para cualquier reclamo</p>
              <p className="text-[9px] text-slate-400">Punto de Venta Sol v3.1</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg pos-btn shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket</span>
          </button>
          
          <button
            onClick={() => {
              sound.playCashDrawer();
              onNewSale();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1e4b85] hover:bg-[#163f73] text-white font-bold rounded-lg pos-btn shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Nueva Venta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
