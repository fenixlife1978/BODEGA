import React from 'react';
import { SaleRecord, PosConfig } from '../types/pos';
import { Barcode as BarcodeIcon, Store, Phone, MapPin, Receipt, ShieldCheck } from 'lucide-react';

interface ReceiptContentProps {
  sale: SaleRecord;
  config: PosConfig;
  paperSizeOverride?: '80mm' | '58mm';
  isPrintMode?: boolean;
}

export const ReceiptContent: React.FC<ReceiptContentProps> = ({
  sale,
  config,
  paperSizeOverride,
  isPrintMode = false,
}) => {
  const paperSize = paperSizeOverride || config.paperSize || '80mm';
  const is58mm = paperSize === '58mm';

  const showTax = config.printShowTax !== false;
  const showExchangeRate = config.printShowExchangeRate !== false;
  const showBarcode = config.printShowBarcode !== false;
  const headerMessage = config.printHeaderMessage || '';
  const footerMessage = config.printFooterMessage || '*** GRACIAS POR SU COMPRA ***\nConserve su comprobante para cualquier reclamo';

  return (
    <div
      className={`mx-auto bg-white text-slate-900 font-mono shadow-xs transition-all duration-200 select-none ${
        is58mm
          ? 'w-[240px] max-w-[240px] p-2.5 text-[10.5px] leading-tight border border-slate-300 rounded-sm'
          : 'w-[320px] max-w-[320px] p-4 text-[11.5px] leading-normal border border-slate-300 rounded-md'
      }`}
      style={{
        fontFamily: "'Courier New', Courier, monospace, monospace",
      }}
    >
      {/* Thermal Receipt Header */}
      <div className="text-center border-b border-dashed border-slate-400 pb-2.5 space-y-0.5">
        <h3 className={`font-black uppercase tracking-wider text-black ${is58mm ? 'text-xs' : 'text-sm'}`}>
          {config.storeName || 'BODEGA EL SOL'}
        </h3>
        
        {headerMessage && (
          <p className="text-[10px] font-bold text-slate-700 uppercase">
            {headerMessage}
          </p>
        )}

        <div className="text-[10px] text-slate-600 space-y-0.5 pt-0.5">
          <p>RIF: {config.taxId || 'J-00000000-0'}</p>
          <p className="truncate px-1">{config.address || 'Venezuela'}</p>
          <p>Telf: {config.phone || 'N/A'}</p>
        </div>

        <div className="pt-1.5 border-t border-dotted border-slate-300 text-[10px] text-slate-600 space-y-0.5">
          <div className="flex justify-between font-bold text-slate-800">
            <span>FACTURA: #{sale.receiptNumber}</span>
            <span>{sale.timestamp.split(',')[0]}</span>
          </div>
          <div className="flex justify-between">
            <span>CAJA: {sale.cashRegister || 'Caja 1'}</span>
            <span>HORA: {sale.timestamp.split(',')[1] || ''}</span>
          </div>
          <div className="flex justify-between">
            <span>CAJERO:</span>
            <span className="font-semibold truncate max-w-[120px]">{sale.cashier || 'Cajero 1'}</span>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="py-2.5 border-b border-dashed border-slate-400">
        {is58mm ? (
          // 58mm compact item layout
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold border-b border-dotted border-slate-300 pb-0.5 text-[10px]">
              <span>CANT/DESCRIPCIÓN</span>
              <span>TOTAL</span>
            </div>
            {sale.items.map((item, idx) => {
              const lineTotal = item.overrideTotal ?? (item.product.priceUsd * item.quantity);
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold text-slate-900 truncate">
                    {item.product.name}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>
                      {item.quantity} {item.product.unitOfMeasure || 'UND'} x ${item.product.priceUsd.toFixed(2)}
                    </span>
                    <span className="font-bold text-slate-900">${lineTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // 80mm table layout
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dotted border-slate-400 text-slate-700 text-[10.5px] font-bold">
                <th className="pb-1">DESCRIPCIÓN</th>
                <th className="pb-1 text-center">CANT</th>
                <th className="pb-1 text-right">P.U</th>
                <th className="pb-1 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-slate-200">
              {sale.items.map((item, idx) => {
                const lineTotal = item.overrideTotal ?? (item.product.priceUsd * item.quantity);
                return (
                  <tr key={idx} className="py-1">
                    <td className="py-1 pr-1 font-semibold text-slate-900 leading-tight">
                      <div className="truncate max-w-[125px]">{item.product.name}</div>
                      {item.product.unitOfMeasure && (
                        <div className="text-[9px] text-slate-500 font-normal">[{item.product.unitOfMeasure}]</div>
                      )}
                    </td>
                    <td className="py-1 text-center text-slate-700 font-semibold">{item.quantity}</td>
                    <td className="py-1 text-right text-slate-600">${item.product.priceUsd.toFixed(2)}</td>
                    <td className="py-1 text-right font-bold text-slate-900">${lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Totals Section */}
      <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
        <div className="flex justify-between text-slate-700">
          <span>SUBTOTAL USD:</span>
          <span className="font-semibold">${sale.subtotalUsd.toFixed(2)}</span>
        </div>

        {showTax && (
          <div className="flex justify-between text-slate-700">
            <span>IVA (16%):</span>
            <span className="font-semibold">${sale.taxUsd.toFixed(2)}</span>
          </div>
        )}

        {/* Grand Total Highlight */}
        <div className="pt-1.5 border-t border-slate-400 flex justify-between font-black text-slate-950 text-xs">
          <span>TOTAL USD:</span>
          <span className={`${is58mm ? 'text-xs' : 'text-sm'}`}>${sale.totalUsd.toFixed(2)}</span>
        </div>

        <div className="flex justify-between font-bold text-blue-900 text-[11px]">
          <span>TOTAL BS.:</span>
          <span>Bs. {sale.totalBs.toFixed(2)}</span>
        </div>

        {showExchangeRate && (
          <div className="text-[9.5px] text-slate-500 text-center pt-0.5 border-t border-dotted border-slate-300">
            Tasa Oficial: {sale.exchangeRate.toFixed(2)} Bs/USD
          </div>
        )}
      </div>

      {/* Payment Details */}
      <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1 text-slate-700">
        <div className="font-bold uppercase text-slate-900">FORMAS DE PAGO:</div>
        
        {sale.payments.cashUsd > 0 && (
          <div className="flex justify-between">
            <span>• Efectivo USD ($):</span>
            <span className="font-bold">${sale.payments.cashUsd.toFixed(2)}</span>
          </div>
        )}
        
        {sale.payments.cashBs > 0 && (
          <div className="flex justify-between">
            <span>• Efectivo Bs.:</span>
            <span className="font-bold">Bs. {sale.payments.cashBs.toFixed(2)}</span>
          </div>
        )}

        {sale.payments.cardBs > 0 && (
          <div className="flex justify-between">
            <span>• Punto / Tarjeta:</span>
            <span className="font-bold">Bs. {sale.payments.cardBs.toFixed(2)}</span>
          </div>
        )}

        {sale.payments.pagoMovilBs > 0 && (
          <div className="flex justify-between">
            <span>• Pago Móvil:</span>
            <span className="font-bold">Bs. {sale.payments.pagoMovilBs.toFixed(2)}</span>
          </div>
        )}

        {(sale.changeGivenUsd > 0 || sale.changeGivenBs > 0) && (
          <div className="flex justify-between font-bold text-emerald-800 pt-0.5 border-t border-dotted border-slate-300">
            <span>CAMBIO ENTREGADO:</span>
            <span>
              {sale.changeGivenUsd > 0 ? `$${sale.changeGivenUsd.toFixed(2)} ` : ''}
              {sale.changeGivenBs > 0 ? `(Bs. ${sale.changeGivenBs.toFixed(2)})` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Barcode & Footer Section */}
      <div className="text-center pt-2.5 space-y-1.5 text-[9.5px] text-slate-600">
        {showBarcode && (
          <div className="flex flex-col items-center justify-center py-1">
            {/* Realistic Barcode Stripes */}
            <div className="flex items-center gap-0.5 h-7 bg-white px-2 py-0.5 border border-slate-300 rounded-xs">
              {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 3, 1, 2, 3, 1, 4, 2, 1, 3, 2].map((w, i) => (
                <div
                  key={i}
                  className="bg-black h-full"
                  style={{ width: `${w}px` }}
                />
              ))}
            </div>
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-800 mt-0.5">
              *{sale.receiptNumber}*
            </span>
          </div>
        )}

        {footerMessage && (
          <div className="whitespace-pre-line font-medium leading-tight text-slate-700">
            {footerMessage}
          </div>
        )}

        <div className="text-[8.5px] text-slate-400 pt-1 border-t border-dotted border-slate-300 flex items-center justify-between">
          <span>Formato: {paperSize}</span>
          <span>Punto de Venta Sol v3.1</span>
        </div>
      </div>
    </div>
  );
};
