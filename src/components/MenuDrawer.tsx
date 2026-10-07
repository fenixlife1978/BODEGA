import React, { useState } from 'react';
import { PosConfig, SaleRecord } from '../types/pos';
import { sound } from '../utils/sound';
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
  CheckCircle2,
  Package
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
}) => {
  const [activeTab, setActiveTab] = useState<'tasa' | 'history' | 'cierre' | 'settings' | 'shortcuts'>('tasa');
  const [newRateInput, setNewRateInput] = useState(config.exchangeRate.toString());
  const [tempStoreName, setTempStoreName] = useState(config.storeName);
  const [tempCashier, setTempCashier] = useState(config.cashierName);
  const [tempRif, setTempRif] = useState(config.taxId);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(newRateInput);
    if (!isNaN(rate) && rate > 0) {
      onUpdateConfig({
        ...config,
        exchangeRate: rate,
      });
      sound.playSuccess();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } else {
      sound.playError();
    }
  };

  const handleSaveStoreConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      storeName: tempStoreName,
      cashierName: tempCashier,
      taxId: tempRif,
    });
    sound.playSuccess();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Cierre de caja calculations
  const totalSalesUsd = salesHistory.reduce((acc, s) => acc + s.totalUsd, 0);
  const totalSalesBs = salesHistory.reduce((acc, s) => acc + s.totalBs, 0);
  const totalCashUsd = salesHistory.reduce((acc, s) => acc + s.payments.cashUsd, 0);
  const totalCashBs = salesHistory.reduce((acc, s) => acc + s.payments.cashBs, 0);
  const totalCardBs = salesHistory.reduce((acc, s) => acc + s.payments.cardBs, 0);
  const totalPagoMovilBs = salesHistory.reduce((acc, s) => acc + s.payments.pagoMovilBs, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-300">
        {/* Drawer Header */}
        <div className="bg-[#1e4b85] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-200" />
            <h2 className="font-bold text-base tracking-wide">Menú de Administración POS</h2>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('tasa');
            }}
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'tasa' ? 'border-[#1e4b85] text-[#1e4b85] bg-white' : 'border-transparent text-slate-600'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Tasa de Cambio</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
              onOpenInventory();
            }}
            className="py-2.5 px-3 flex items-center gap-1.5 border-b-2 border-transparent text-[#1e4b85] hover:bg-blue-50 font-bold whitespace-nowrap"
          >
            <Package className="w-3.5 h-3.5 text-blue-700" />
            <span>Inventario & Costos</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('history');
            }}
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'history' ? 'border-[#1e4b85] text-[#1e4b85] bg-white' : 'border-transparent text-slate-600'
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
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'cierre' ? 'border-[#1e4b85] text-[#1e4b85] bg-white' : 'border-transparent text-slate-600'
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
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'settings' ? 'border-[#1e4b85] text-[#1e4b85] bg-white' : 'border-transparent text-slate-600'
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
            className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'shortcuts' ? 'border-[#1e4b85] text-[#1e4b85] bg-white' : 'border-transparent text-slate-600'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Atajos</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Configuración actualizada correctamente.</span>
            </div>
          )}

          {/* TASA DE CAMBIO */}
          {activeTab === 'tasa' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <span className="text-xs font-bold text-blue-700 uppercase">Tasa Actual de Conversión</span>
                <div className="text-3xl font-black text-[#1e4b85] font-mono mt-1">
                  {config.exchangeRate.toFixed(2)} Bs / USD
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Todos los precios y subtotales se actualizan en tiempo real
                </p>
              </div>

              <form onSubmit={handleSaveRate} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Modificar Tasa de Cambio (Bs. por 1 USD):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={newRateInput}
                      onChange={(e) => setNewRateInput(e.target.value)}
                      className="w-full px-3.5 py-2 text-lg font-bold font-mono border-2 border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Bs/USD
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {[40.00, 42.00, 45.00, 50.00].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setNewRateInput(rate.toFixed(2));
                      }}
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs rounded-md pos-btn"
                    >
                      {rate.toFixed(2)}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#1e4b85] hover:bg-[#163f73] text-white font-bold text-sm rounded-lg pos-btn"
                >
                  Guardar y Aplicar Tasa
                </button>
              </form>
            </div>
          )}

          {/* HISTORIAL DE VENTAS */}
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
                          className="flex items-center gap-1 text-[#1e4b85] hover:underline font-bold"
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

          {/* CIERRE DE CAJA */}
          {activeTab === 'cierre' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Resumen de Ventas del Turno</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    ${totalSalesUsd.toFixed(2)} USD
                  </span>
                  <span className="text-sm font-bold text-blue-300 font-mono">
                    Bs. {totalSalesBs.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Total de transacciones: {salesHistory.length}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wide block border-b pb-1">
                  Desglose por Método de Pago:
                </span>
                
                <div className="flex justify-between text-slate-700">
                  <span>Efectivo Divisas USD:</span>
                  <span className="font-bold font-mono">${totalCashUsd.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Efectivo Bolívares:</span>
                  <span className="font-bold font-mono">Bs. {totalCashBs.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Punto de Venta / Tarjeta:</span>
                  <span className="font-bold font-mono">Bs. {totalCardBs.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Pago Móvil:</span>
                  <span className="font-bold font-mono">Bs. {totalPagoMovilBs.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* AJUSTES */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveStoreConfig} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Establecimiento / Caja:</label>
                  <input
                    type="text"
                    value={tempStoreName}
                    onChange={(e) => setTempStoreName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Cajero / Turno:</label>
                  <input
                    type="text"
                    value={tempCashier}
                    onChange={(e) => setTempCashier(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RIF / Identificación Fiscal:</label>
                  <input
                    type="text"
                    value={tempRif}
                    onChange={(e) => setTempRif(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-[#1e4b85] hover:bg-[#163f73] text-white font-bold text-xs rounded-lg pos-btn"
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
                  className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-800 pos-btn"
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
                  className="w-full flex items-center justify-center gap-2 p-3 bg-[#1b4e8c] hover:bg-[#153e6d] text-white rounded-lg text-xs font-bold pos-btn shadow-xs"
                >
                  <Package className="w-4 h-4" />
                  <span>Abrir Módulo de Inventario y Presentaciones</span>
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
                  className="w-full flex items-center justify-center gap-2 p-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold pos-btn"
                >
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  <span>Restablecer a Datos de la Imagen Original</span>
                </button>
              </div>
            </div>
          )}

          {/* ATAJOS */}
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
                  <span className="font-medium text-slate-700">Cerrar Ventana / Modal:</span>
                  <kbd className="px-2 py-1 bg-slate-800 text-white font-mono rounded font-bold">ESC</kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500 font-mono">
          Punto de Venta Sol v3.1 • Bodega El Sol
        </div>
      </div>
    </div>
  );
};
