import React, { useState } from 'react';
import { SaleRecord, PosConfig } from '../types/pos';
import { sound } from '../utils/sound';
import { Printer, CheckCircle, X, Download, RotateCcw, Sliders } from 'lucide-react';
import { ReceiptContent } from './ReceiptContent';

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
  const [activePaperSize, setActivePaperSize] = useState<'80mm' | '58mm'>(config.paperSize || '80mm');

  const handlePrint = () => {
    sound.playScan();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-300">
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

        {/* Paper format selector toolbar */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-semibold flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-[#1e4b85]" />
            <span>Formato Impresora:</span>
          </span>
          <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActivePaperSize('80mm');
              }}
              className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                activePaperSize === '80mm'
                  ? 'bg-[#1e4b85] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              80 mm
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActivePaperSize('58mm');
              }}
              className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                activePaperSize === '58mm'
                  ? 'bg-[#1e4b85] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              58 mm
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-4 overflow-y-auto bg-slate-200/60 flex items-center justify-center flex-1">
          <div id="printable-receipt" className="my-auto">
            <ReceiptContent
              sale={sale}
              config={config}
              paperSizeOverride={activePaperSize}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg pos-btn shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir ({activePaperSize})</span>
          </button>
          
          <button
            onClick={() => {
              sound.playCashDrawer();
              onNewSale();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1e4b85] hover:bg-[#163f73] text-white font-bold rounded-lg pos-btn shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Nueva Venta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
