import React, { useState, useEffect } from 'react';
import { PosConfig, SaleRecord, ExchangeRateHistoryEntry } from '../types/pos';
import { sound } from '../utils/sound';
import { ReceiptContent } from './ReceiptContent';
import { BcvLogo } from './BcvLogo';
import {
  X,
  DollarSign,
  History,
  FileText,
  Settings,
  Volume2,
  VolumeX,
  Keyboard,
  RotateCcw,
  Store,
  Printer,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Package,
  Calculator,
  Download,
  Receipt,
  Sliders,
  Eye,
  FileCheck,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: PosConfig;
  onUpdateConfig: (newConfig: PosConfig) => void;
  salesHistory: SaleRecord[];
  onReprintSale: (sale: SaleRecord) => void;
  onResetToImageState: () => void;
  onOpenInventory: () => void;
  onOpenCashCut?: () => void;
  // BCV Sync & Rate History props
  rateHistory?: ExchangeRateHistoryEntry[];
  bcvLoading?: boolean;
  bcvLastSync?: string;
  bcvSource?: string;
  bcvChangePercent?: number;
  bcvChangeAmount?: number;
  onSyncBcvRate?: () => Promise<void>;
  onManualRecordRate?: (rate: number) => void;
  onReloadHistory?: () => Promise<void>;
  initialTab?: 'tasa' | 'impresion' | 'history' | 'cierre' | 'settings' | 'shortcuts';
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  salesHistory,
  onReprintSale,
  onResetToImageState,
  onOpenInventory,
  onOpenCashCut,
  rateHistory = [],
  bcvLoading = false,
  bcvLastSync = '',
  bcvSource = 'bcv.today',
  bcvChangePercent = 0,
  bcvChangeAmount = 0,
  onSyncBcvRate,
  onManualRecordRate,
  onReloadHistory,
  initialTab = 'tasa',
}) => {
  const [activeTab, setActiveTab] = useState<'tasa' | 'impresion' | 'history' | 'cierre' | 'settings' | 'shortcuts'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  
  // Rate & Store Config State
  const [newRateInput, setNewRateInput] = useState(config.exchangeRate.toString());
  const [historySearch, setHistorySearch] = useState('');

  const [tempStoreName, setTempStoreName] = useState(config.storeName);
  const [tempCashier, setTempCashier] = useState(config.cashierName);
  const [tempRif, setTempRif] = useState(config.taxId);
  const [tempAddress, setTempAddress] = useState(config.address || '');
  const [tempPhone, setTempPhone] = useState(config.phone || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Printing Parameters State
  const [tempPaperSize, setTempPaperSize] = useState<'80mm' | '58mm'>(config.paperSize || '80mm');
  const [tempHeaderMsg, setTempHeaderMsg] = useState(config.printHeaderMessage || 'VÍVERES • CHARCUTERÍA • BEBIDAS');
  const [tempFooterMsg, setTempFooterMsg] = useState(
    config.printFooterMessage || '*** GRACIAS POR SU COMPRA ***\nConserve su comprobante para cualquier reclamo\n¡Feliz Día!'
  );
  const [tempShowTax, setTempShowTax] = useState(config.printShowTax !== false);
  const [tempShowRate, setTempShowRate] = useState(config.printShowExchangeRate !== false);
  const [tempShowBarcode, setTempShowBarcode] = useState(config.printShowBarcode !== false);
  const [tempAutoPrint, setTempAutoPrint] = useState(config.autoPrint !== false);
  const [tempCopies, setTempCopies] = useState(config.printCopies || 1);
  const [previewPaperSize, setPreviewPaperSize] = useState<'80mm' | '58mm'>(config.paperSize || '80mm');

  if (!isOpen) return null;

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(newRateInput);
    if (!isNaN(rate) && rate > 0) {
      if (onManualRecordRate) {
        onManualRecordRate(rate);
      } else {
        onUpdateConfig({
          ...config,
          exchangeRate: rate,
        });
      }
      sound.playSuccess();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } else {
      sound.playError();
    }
  };

  const handleExportHistoryCsv = () => {
    sound.playClick();
    if (!rateHistory || rateHistory.length === 0) return;
    const headers = ['Fecha y Hora', 'Tasa USD (Bs)', 'Tasa Anterior', 'Variación %', 'Diferencia (Bs)', 'EUR (Bs)', 'Fuente Oficial', 'Tipo'];
    const rows = rateHistory.map((h) => [
      `"${h.dateFormatted}"`,
      h.rate.toFixed(4),
      h.previousRate.toFixed(4),
      `"${h.changePercent >= 0 ? '+' : ''}${h.changePercent.toFixed(2)}%"`,
      `"${h.changeAmount >= 0 ? '+' : ''}${h.changeAmount.toFixed(4)}"`,
      h.eurRate ? h.eurRate.toFixed(4) : 'N/A',
      `"${h.source}"`,
      h.isAutomated ? 'Automático' : 'Manual',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historial_tasa_bcv_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportHistoryTxt = () => {
    sound.playClick();
    if (!rateHistory || rateHistory.length === 0) return;
    const lines = [
      '========================================================================',
      '        BANCO CENTRAL DE VENEZUELA - HISTORIAL DE VARIACIONES DE TASA',
      '        Sincronización con bcv.today | Fuente API: https://bcv.today/api/rate.json',
      '========================================================================',
      `Generado: ${new Date().toLocaleString('es-VE')}`,
      `Total Registros: ${rateHistory.length}`,
      `Tasa Vigente: Bs. ${config.exchangeRate.toFixed(4)} / USD`,
      '------------------------------------------------------------------------',
      'FECHA / HORA         | TASA USD (Bs) | ANTERIOR (Bs) | CAMBIO %   | DIFERENCIA | ORIGEN',
      '------------------------------------------------------------------------',
      ...rateHistory.map((h) => {
        const dateStr = h.dateFormatted.padEnd(20, ' ');
        const rateStr = h.rate.toFixed(4).padStart(13, ' ');
        const prevStr = h.previousRate.toFixed(4).padStart(13, ' ');
        const sign = h.changePercent >= 0 ? '+' : '';
        const pctStr = `${sign}${h.changePercent.toFixed(2)}%`.padStart(10, ' ');
        const diffSign = h.changeAmount >= 0 ? '+' : '';
        const diffStr = `${diffSign}${h.changeAmount.toFixed(4)}`.padStart(10, ' ');
        const srcStr = h.source.substring(0, 25);
        return `${dateStr} | ${rateStr} | ${prevStr} | ${pctStr} | ${diffStr} | ${srcStr}`;
      }),
      '========================================================================',
      'Fin del reporte de auditoría cambiaria.',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_variaciones_bcv_${new Date().toISOString().split('T')[0]}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveStoreConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      storeName: tempStoreName,
      cashierName: tempCashier,
      taxId: tempRif,
      address: tempAddress,
      phone: tempPhone,
    });
    sound.playSuccess();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSavePrintConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      paperSize: tempPaperSize,
      printHeaderMessage: tempHeaderMsg,
      printFooterMessage: tempFooterMsg,
      printShowTax: tempShowTax,
      printShowExchangeRate: tempShowRate,
      printShowBarcode: tempShowBarcode,
      autoPrint: tempAutoPrint,
      printCopies: tempCopies,
    });
    sound.playSuccess();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestPrint = () => {
    sound.playScan();
    window.print();
  };

  // Cierre de caja calculations
  const totalSalesUsd = salesHistory.reduce((acc, s) => acc + s.totalUsd, 0);
  const totalSalesBs = salesHistory.reduce((acc, s) => acc + s.totalBs, 0);
  const totalCashUsd = salesHistory.reduce((acc, s) => acc + s.payments.cashUsd, 0);
  const totalCashBs = salesHistory.reduce((acc, s) => acc + s.payments.cashBs, 0);
  const totalCardBs = salesHistory.reduce((acc, s) => acc + s.payments.cardBs, 0);
  const totalPagoMovilBs = salesHistory.reduce((acc, s) => acc + s.payments.pagoMovilBs, 0);

  // Sample sale record for live receipt preview
  const sampleSaleForPreview: SaleRecord = salesHistory.length > 0 ? salesHistory[0] : {
    id: 'sample-receipt-prev',
    receiptNumber: '001089',
    timestamp: new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }),
    items: [
      {
        product: {
          id: 'prev-1',
          name: 'Harina PAN (3 uds)',
          presentation: '(3 uds)',
          unitOfMeasure: 'PQTE',
          unitPriceNote: '',
          priceUsd: 2.70,
          barcode: '7591011000012',
          category: 'Víveres',
          stock: 50,
          imageUrl: '',
          hasTax: false,
        },
        quantity: 1,
      },
      {
        product: {
          id: 'prev-2',
          name: 'Leche Polvo Campesina',
          presentation: '1 Kg',
          unitOfMeasure: 'PQTE',
          unitPriceNote: '',
          priceUsd: 6.50,
          barcode: '7591011000029',
          category: 'Lácteos',
          stock: 30,
          imageUrl: '',
          hasTax: true,
        },
        quantity: 1,
      },
      {
        product: {
          id: 'prev-3',
          name: 'Arroz Mary (2 uds)',
          presentation: '1 Kg',
          unitOfMeasure: 'PQTE',
          unitPriceNote: '',
          priceUsd: 2.20,
          barcode: '7591011000036',
          category: 'Víveres',
          stock: 45,
          imageUrl: '',
          hasTax: true,
        },
        quantity: 2,
        overrideTotal: 3.30,
      },
    ],
    subtotalUsd: 12.50,
    taxUsd: 1.57,
    totalUsd: 14.07,
    subtotalBs: 12.50 * config.exchangeRate,
    taxBs: 1.57 * config.exchangeRate,
    totalBs: 14.07 * config.exchangeRate,
    exchangeRate: config.exchangeRate,
    cashier: tempCashier || config.cashierName || 'Cajero 1',
    cashRegister: config.registerName || 'Caja 1',
    payments: {
      cashUsd: 15.00,
      cashBs: 0,
      cardBs: 0,
      cardUsd: 0,
      pagoMovilBs: 0,
    },
    changeGivenUsd: 0.93,
    changeGivenBs: 0.93 * config.exchangeRate,
    status: 'COMPLETADA',
  };

  const previewConfig: PosConfig = {
    ...config,
    storeName: tempStoreName,
    taxId: tempRif,
    address: tempAddress,
    phone: tempPhone,
    cashierName: tempCashier,
    paperSize: previewPaperSize,
    printHeaderMessage: tempHeaderMsg,
    printFooterMessage: tempFooterMsg,
    printShowTax: tempShowTax,
    printShowExchangeRate: tempShowRate,
    printShowBarcode: tempShowBarcode,
    autoPrint: tempAutoPrint,
    printCopies: tempCopies,
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className={`w-full ${activeTab === 'impresion' || activeTab === 'tasa' ? 'max-w-2xl' : 'max-w-md'} bg-white h-full shadow-2xl flex flex-col border-l border-slate-300 transition-all duration-300`}>
        {/* Drawer Header */}
        <div className="bg-[#1e4b85] text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-200" />
            <h2 className="font-bold text-base tracking-wide">Menú de Administración POS</h2>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100 overflow-x-auto text-xs font-semibold shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('tasa');
            }}
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'tasa' ? 'border-[#1e4b85] text-[#1e4b85] bg-white font-bold' : 'border-transparent text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            <span>Tasa BCV (bcv.today)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sincronización Activa" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('impresion');
            }}
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'impresion' ? 'border-[#1e4b85] text-[#1e4b85] bg-white font-bold' : 'border-transparent text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-blue-700" />
            <span>Impresión ({tempPaperSize})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
              onOpenInventory();
            }}
            className="py-2.5 px-3 flex items-center gap-1.5 border-b-2 border-transparent text-[#1e4b85] hover:bg-blue-50 font-bold whitespace-nowrap cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-blue-700" />
            <span>Inventario & Costos</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('history');
            }}
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'history' ? 'border-[#1e4b85] text-[#1e4b85] bg-white font-bold' : 'border-transparent text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Ventas ({salesHistory.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('cierre');
            }}
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'cierre' ? 'border-[#1e4b85] text-[#1e4b85] bg-white font-bold' : 'border-transparent text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cierre Caja</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('settings');
            }}
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings' ? 'border-[#1e4b85] text-[#1e4b85] bg-white font-bold' : 'border-transparent text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Ajustes</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('shortcuts');
            }}
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'shortcuts' ? 'border-[#1e4b85] text-[#1e4b85] bg-white font-bold' : 'border-transparent text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Atajos</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-white">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-xs animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Configuración y parámetros guardados correctamente.</span>
            </div>
          )}

          {/* TAB 1: IMPRESIÓN & TICKETS (80mm vs 58mm + VISTA PREVIA) */}
          {activeTab === 'impresion' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-bold text-sm text-[#1e4b85] uppercase tracking-wide flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    <span>Configuración de Impresora y Recibos</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ajuste el formato de papel térmico (80mm / 58mm) y visualice la vista previa en vivo
                  </p>
                </div>
              </div>

              {/* Grid with Form & Live Simulator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Configuration Form */}
                <form onSubmit={handleSavePrintConfig} className="space-y-4">
                  {/* Paper Size Selector (80mm vs 58mm) */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Tamaño de Papel Térmico:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setTempPaperSize('80mm');
                          setPreviewPaperSize('80mm');
                        }}
                        className={`p-3 rounded-lg border-2 flex flex-col items-center text-center transition-all cursor-pointer ${
                          tempPaperSize === '80mm'
                            ? 'border-[#1e4b85] bg-blue-50/70 text-[#1e4b85] shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <span>80 mm</span>
                          {tempPaperSize === '80mm' && <Check className="w-4 h-4 text-[#1e4b85]" />}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 font-normal">
                          Estándar POS (3 Pulgadas)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setTempPaperSize('58mm');
                          setPreviewPaperSize('58mm');
                        }}
                        className={`p-3 rounded-lg border-2 flex flex-col items-center text-center transition-all cursor-pointer ${
                          tempPaperSize === '58mm'
                            ? 'border-[#1e4b85] bg-blue-50/70 text-[#1e4b85] shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <span>58 mm</span>
                          {tempPaperSize === '58mm' && <Check className="w-4 h-4 text-[#1e4b85]" />}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 font-normal">
                          Compacto / Portátil (2 Pulgadas)
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Header Slogan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Slogan / Encabezado del Recibo:
                    </label>
                    <input
                      type="text"
                      value={tempHeaderMsg}
                      onChange={(e) => setTempHeaderMsg(e.target.value)}
                      placeholder="Ej: VÍVERES • CHARCUTERÍA • BEBIDAS"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                    />
                  </div>

                  {/* Footer Message */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mensaje de Pie de Recibo:
                    </label>
                    <textarea
                      rows={2}
                      value={tempFooterMsg}
                      onChange={(e) => setTempFooterMsg(e.target.value)}
                      placeholder="Ej: *** GRACIAS POR SU COMPRA ***"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                    />
                  </div>

                  {/* Toggle Options */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block pb-1 border-b">
                      Opciones de Contenido del Ticket:
                    </span>

                    <label className="flex items-center gap-2 cursor-pointer hover:text-[#1e4b85]">
                      <input
                        type="checkbox"
                        checked={tempShowTax}
                        onChange={(e) => setTempShowTax(e.target.checked)}
                        className="rounded text-[#1e4b85] focus:ring-0 cursor-pointer"
                      />
                      <span>Desglosar IVA (16%) en el recibo</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:text-[#1e4b85]">
                      <input
                        type="checkbox"
                        checked={tempShowRate}
                        onChange={(e) => setTempShowRate(e.target.checked)}
                        className="rounded text-[#1e4b85] focus:ring-0 cursor-pointer"
                      />
                      <span>Imprimir Tasa Oficial de Conversión</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:text-[#1e4b85]">
                      <input
                        type="checkbox"
                        checked={tempShowBarcode}
                        onChange={(e) => setTempShowBarcode(e.target.checked)}
                        className="rounded text-[#1e4b85] focus:ring-0 cursor-pointer"
                      />
                      <span>Imprimir Código de Barras / Referencia al pie</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:text-[#1e4b85]">
                      <input
                        type="checkbox"
                        checked={tempAutoPrint}
                        onChange={(e) => setTempAutoPrint(e.target.checked)}
                        className="rounded text-[#1e4b85] focus:ring-0 cursor-pointer"
                      />
                      <span>Impresión automática al finalizar cada venta (F12)</span>
                    </label>
                  </div>

                  {/* Submit & Test Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-[#1e4b85] hover:bg-[#163f73] text-white font-bold text-xs rounded-lg pos-btn shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Guardar Parámetros de Impresión</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestPrint}
                      className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg pos-btn cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir Ticket de Prueba ({tempPaperSize})</span>
                    </button>
                  </div>
                </form>

                {/* Right: Live Ticket Preview Simulator */}
                <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-between">
                  <div className="w-full flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-[#1e4b85]" />
                      <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                        Vista Previa en Vivo:
                      </span>
                    </div>

                    {/* Preview Switcher */}
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setPreviewPaperSize('80mm')}
                        className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                          previewPaperSize === '80mm'
                            ? 'bg-[#1e4b85] text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        80 mm
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPaperSize('58mm')}
                        className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                          previewPaperSize === '58mm'
                            ? 'bg-[#1e4b85] text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        58 mm
                      </button>
                    </div>
                  </div>

                  {/* Simulator container */}
                  <div
                    id="printable-receipt"
                    className="w-full overflow-y-auto max-h-[380px] p-2 flex justify-center items-start bg-slate-200/50 rounded-lg border border-dashed border-slate-300 shadow-inner"
                  >
                    <ReceiptContent
                      sale={sampleSaleForPreview}
                      config={previewConfig}
                      paperSizeOverride={previewPaperSize}
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 text-center mt-2.5">
                    * El recibo se adaptará automáticamente a rollos de <strong>{previewPaperSize}</strong> al imprimir.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TASA BCV & SINCRONIZACIÓN BCV.TODAY */}
          {activeTab === 'tasa' && (
            <div className="space-y-4">
              {/* Official BCV Sync Banner */}
              <div className="bg-gradient-to-r from-[#0d254c] to-[#1e4b85] text-white p-4 rounded-xl shadow-sm border border-blue-900/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BcvLogo className="w-10 h-10 shrink-0 drop-shadow-md" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm tracking-wide text-white">
                          Sincronización con bcv.today
                        </h3>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Activo
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-blue-200 flex-wrap">
                        <span className="font-semibold text-amber-300">Fuente Oficial API:</span>
                        <a
                          href="https://bcv.today/api/rate.json"
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-white font-mono flex items-center gap-0.5"
                        >
                          https://bcv.today/api/rate.json
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      sound.playClick();
                      if (onSyncBcvRate) await onSyncBcvRate();
                    }}
                    disabled={bcvLoading}
                    className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${bcvLoading ? 'animate-spin' : ''}`} />
                    <span>{bcvLoading ? 'Consultando...' : 'Sincronizar con bcv.today'}</span>
                  </button>
                </div>

                <div className="bg-black/25 rounded-lg p-2.5 text-[11px] text-blue-100/90 leading-relaxed border border-white/10">
                  <p className="flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                    <span>
                      <strong>Consulta automáticamente la tasa publicada por el Banco Central de Venezuela.</strong> El sistema guarda cada variación en el historial con fecha y porcentaje de cambio.
                    </span>
                  </p>
                  <div className="mt-1.5 pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between text-[10px] text-blue-200">
                    <span>Última sincronización: <strong>{bcvLastSync || 'En línea'}</strong></span>
                    <span>Proveedor: <strong>{bcvSource || 'bcv.today (Fuente Oficial API)'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Main Rate Indicators Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* USD Rate Card */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-blue-800 tracking-wider">
                      Tasa Oficial USD (BCV)
                    </span>
                    {bcvChangePercent !== 0 && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                          bcvChangePercent > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {bcvChangePercent > 0 ? (
                          <TrendingUp className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-rose-600" />
                        )}
                        {bcvChangePercent > 0 ? `+${bcvChangePercent.toFixed(2)}%` : `${bcvChangePercent.toFixed(2)}%`}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-black text-[#1e4b85] font-mono mt-1">
                    Bs. {config.exchangeRate.toFixed(4)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                    <span>Bolívares por 1 Dólar</span>
                    {bcvChangeAmount !== 0 && (
                      <span className="font-mono text-slate-600 font-semibold">
                        Dif: {bcvChangeAmount > 0 ? `+${bcvChangeAmount.toFixed(4)}` : bcvChangeAmount.toFixed(4)} Bs.
                      </span>
                    )}
                  </div>
                </div>

                {/* Status & Frecuencia */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                        Sincronización Automática
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Cada 5 min
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 mt-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Verificación Oficial Activa</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Todos los subtotales del POS y precios de venta en Bs. se recalculan al instante con esta tasa.
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Override Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-[#1e4b85]" />
                    Ajuste Manual / Excepcional de Tasa
                  </span>
                  <span className="text-[10px] text-slate-500">Se guardará en el historial con su % de cambio</span>
                </div>

                <form onSubmit={handleSaveRate} className="space-y-2.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.0001"
                        value={newRateInput}
                        onChange={(e) => setNewRateInput(e.target.value)}
                        placeholder="Ej. 873.87"
                        className="w-full px-3 py-1.5 text-base font-bold font-mono border-2 border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Bs/USD
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="py-1.5 px-4 bg-[#1e4b85] hover:bg-[#163f73] text-white font-bold text-xs rounded-lg pos-btn cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      Guardar y Registrar
                    </button>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex gap-1.5 overflow-x-auto">
                    <span className="text-[10px] font-bold text-slate-400 self-center mr-1">Rápidos:</span>
                    {[
                      config.exchangeRate,
                      Number((config.exchangeRate * 1.005).toFixed(2)),
                      Number((config.exchangeRate * 1.01).toFixed(2)),
                      Number((config.exchangeRate * 1.02).toFixed(2)),
                    ].map((rateVal, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setNewRateInput(rateVal.toFixed(4));
                        }}
                        className="py-1 px-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[11px] font-bold rounded pos-btn cursor-pointer"
                      >
                        {rateVal.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </form>
              </div>

              {/* HISTORIAL DE VARIACIONES CON FECHA Y PORCENTAJE DE CAMBIO */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white space-y-0">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <History className="w-4 h-4 text-[#1e4b85]" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                        Historial de Variaciones de la Tasa BCV
                      </h4>
                      <span className="px-1.5 py-0.2 bg-blue-100 text-[#1e4b85] font-bold text-[10px] rounded-full">
                        {rateHistory.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Registro de cada variación con fecha y porcentaje de cambio
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onReloadHistory && (
                      <button
                        type="button"
                        onClick={async () => {
                          sound.playClick();
                          await onReloadHistory();
                        }}
                        title="Recargar histórico oficial desde bcv.today"
                        className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer pos-btn shadow-2xs"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span className="hidden sm:inline">Histórico BCV</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleExportHistoryCsv}
                      disabled={rateHistory.length === 0}
                      title="Descargar en formato CSV"
                      className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer pos-btn shadow-2xs disabled:opacity-40"
                    >
                      <Download className="w-3 h-3 text-emerald-600" />
                      <span>CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportHistoryTxt}
                      disabled={rateHistory.length === 0}
                      title="Descargar reporte de texto"
                      className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer pos-btn shadow-2xs disabled:opacity-40"
                    >
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span>TXT</span>
                    </button>
                  </div>
                </div>

                {/* History Table */}
                <div className="max-h-[340px] overflow-y-auto">
                  {rateHistory.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-2">
                      <History className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold">No hay registros de variación almacenados todavía.</p>
                      {onReloadHistory && (
                        <button
                          type="button"
                          onClick={async () => {
                            sound.playClick();
                            await onReloadHistory();
                          }}
                          className="px-3 py-1.5 bg-[#1e4b85] text-white font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Cargar Histórico Oficial desde bcv.today
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Fecha y Hora</th>
                          <th className="py-2 px-2 text-right">Tasa (USD)</th>
                          <th className="py-2 px-2 text-right">Anterior</th>
                          <th className="py-2 px-2 text-center">% Cambio</th>
                          <th className="py-2 px-2 text-right">Diferencia</th>
                          <th className="py-2 px-3">Fuente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rateHistory.map((item, idx) => {
                          const isPositive = item.changePercent > 0;
                          const isNegative = item.changePercent < 0;
                          return (
                            <tr
                              key={item.id || idx}
                              className={`hover:bg-blue-50/50 transition-colors ${
                                idx === 0 ? 'bg-amber-50/40 font-semibold' : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-slate-800 whitespace-nowrap">
                                <div className="font-medium text-slate-900">{item.dateFormatted}</div>
                                {item.effectiveDate && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Valor: {item.effectiveDate}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-[#1e4b85] whitespace-nowrap">
                                Bs. {item.rate.toFixed(4)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                Bs. {item.previousRate.toFixed(4)}
                              </td>
                              <td className="py-2 px-2 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                    isPositive
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : isNegative
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {isPositive ? (
                                    <ArrowUpRight className="w-2.5 h-2.5 text-emerald-600" />
                                  ) : isNegative ? (
                                    <ArrowDownRight className="w-2.5 h-2.5 text-rose-600" />
                                  ) : null}
                                  {isPositive ? `+${item.changePercent.toFixed(2)}%` : `${item.changePercent.toFixed(2)}%`}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                {item.changeAmount > 0 ? `+${item.changeAmount.toFixed(4)}` : item.changeAmount.toFixed(4)} Bs.
                              </td>
                              <td className="py-2 px-3 text-[10px] text-slate-500 whitespace-nowrap">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200">
                                  {item.source.includes('bcv.today') ? 'bcv.today' : item.source}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HISTORIAL DE VENTAS */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 pb-1 border-b">
                <span>Historial de Facturas Emitidas</span>
                <span>{salesHistory.length} ventas</span>
              </div>

              {salesHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No se han registrado ventas en esta sesión.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {salesHistory.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900">Factura #{sale.receiptNumber}</span>
                        <span className="text-slate-900 font-mono">${sale.totalUsd.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{sale.timestamp}</span>
                        <span className="text-blue-800 font-semibold font-mono">Bs. {sale.totalBs.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                        <span className="text-slate-500">{sale.items.length} artículos</span>
                        <button
                          onClick={() => {
                            sound.playScan();
                            onReprintSale(sale);
                          }}
                          className="flex items-center gap-1 text-[#1e4b85] hover:underline font-bold cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Ver / Reimprimir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CIERRE DE CAJA */}
          {activeTab === 'cierre' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Resumen de Ventas del Turno</span>
                  <span className="px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded text-[10px] font-mono font-bold">
                    {salesHistory.length} Transacciones
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    ${totalSalesUsd.toFixed(2)} USD
                  </span>
                  <span className="text-sm font-bold text-blue-300 font-mono">
                    Bs. {totalSalesBs.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Caja: {config.registerName} • Tasa: {config.exchangeRate.toFixed(2)} Bs/USD
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wide block border-b pb-1">
                  Total Recaudado por Método de Pago:
                </span>
                
                <div className="flex justify-between items-center text-slate-700 py-0.5">
                  <span className="font-medium">1. Efectivo Divisas USD:</span>
                  <div className="text-right">
                    <span className="font-bold font-mono text-emerald-700">${totalCashUsd.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      (Bs. {(totalCashUsd * config.exchangeRate).toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-700 py-0.5 border-t border-slate-200/60">
                  <span className="font-medium">2. Efectivo Bolívares:</span>
                  <span className="font-bold font-mono text-amber-700">Bs. {totalCashBs.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-700 py-0.5 border-t border-slate-200/60">
                  <span className="font-medium">3. Punto de Venta / Tarjeta:</span>
                  <span className="font-bold font-mono text-blue-700">Bs. {totalCardBs.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-700 py-0.5 border-t border-slate-200/60">
                  <span className="font-medium">4. Pago Móvil:</span>
                  <span className="font-bold font-mono text-purple-700">Bs. {totalPagoMovilBs.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Button: Realizar Corte de Caja */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onClose();
                    if (onOpenCashCut) {
                      onOpenCashCut();
                    }
                  }}
                  className="w-full py-3 px-4 bg-[#1b4e8c] hover:bg-[#153e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 pos-btn shadow-md cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-blue-200" />
                  <span>Realizar Corte de Caja & Arqueo</span>
                </button>

                <p className="text-[11px] text-center text-slate-500">
                  Genera el reporte de cierre X / Z, cuadre de gaveta e impresión de comprobante fiscal.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: AJUSTES GENERALES */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveStoreConfig} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Establecimiento / Caja:</label>
                  <input
                    type="text"
                    value={tempStoreName}
                    onChange={(e) => setTempStoreName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Cajero / Turno:</label>
                  <input
                    type="text"
                    value={tempCashier}
                    onChange={(e) => setTempCashier(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RIF / Identificación Fiscal:</label>
                  <input
                    type="text"
                    value={tempRif}
                    onChange={(e) => setTempRif(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dirección del Local:</label>
                  <input
                    type="text"
                    value={tempAddress}
                    onChange={(e) => setTempAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono de Contacto:</label>
                  <input
                    type="text"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-[#1e4b85] hover:bg-[#163f73] text-white font-bold text-xs rounded-lg pos-btn cursor-pointer"
                >
                  Guardar Datos de Tienda
                </button>
              </form>

              {/* Sound Toggle */}
              <div className="pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    sound.enabled = !sound.enabled;
                    onUpdateConfig({ ...config, soundEnabled: !config.soundEnabled });
                    if (sound.enabled) sound.playScan();
                  }}
                  className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-800 pos-btn cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {config.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                    <span>Sonidos de Caja Registradora & Escaneo</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${config.soundEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'}`}>
                    {config.soundEnabled ? 'ACTIVADO' : 'MUTED'}
                  </span>
                </button>
              </div>

              {/* Inventory Management Shortcut */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onClose();
                    onOpenInventory();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-[#1b4e8c] hover:bg-[#153e6d] text-white rounded-lg text-xs font-bold pos-btn shadow-xs cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Abrir Módulo de Inventario y Presentaciones</span>
                </button>
              </div>

              {/* Cash Cut Shortcut Button in Settings */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onClose();
                    if (onOpenCashCut) onOpenCashCut();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold pos-btn shadow-xs cursor-pointer"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Realizar Corte de Caja & Cierre de Turno</span>
                </button>
              </div>

              {/* Restore Initial Screenshot State */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playSuccess();
                    onResetToImageState();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold pos-btn cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  <span>Restablecer a Datos de la Imagen Original</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: ATAJOS DE TECLADO */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wide block">Atajos de Teclado Rápidos:</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg">
                  <span className="font-medium text-slate-700">Finalizar Pago / Cobrar:</span>
                  <kbd className="px-2 py-1 bg-slate-800 text-white font-mono rounded font-bold">F12</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg">
                  <span className="font-medium text-slate-700">Buscar Producto en Barra:</span>
                  <kbd className="px-2 py-1 bg-slate-800 text-white font-mono rounded font-bold">F2</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg">
                  <span className="font-medium text-slate-700">Abrir Catálogo (+ Añadir Producto):</span>
                  <kbd className="px-2 py-1 bg-slate-800 text-white font-mono rounded font-bold">F4</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg">
                  <span className="font-medium text-slate-700">Corte de Caja / Cierre de Turno:</span>
                  <kbd className="px-2 py-1 bg-slate-800 text-white font-mono rounded font-bold">F8</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg">
                  <span className="font-medium text-slate-700">Cerrar Ventana / Modal:</span>
                  <kbd className="px-2 py-1 bg-slate-800 text-white font-mono rounded font-bold">ESC</kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500 font-mono shrink-0">
          Punto de Venta Sol v3.1 • Formato Térmico: {tempPaperSize}
        </div>
      </div>
    </div>
  );
};
