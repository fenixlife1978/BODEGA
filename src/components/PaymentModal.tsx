import React, { useState, useEffect } from 'react';
import { PosConfig, PaymentBreakdown } from '../types/pos';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  X,
  DollarSign,
  CreditCard,
  Smartphone,
  Check,
  Calculator,
  ArrowRight,
  Sparkles,
  Banknote,
  Coins
} from 'lucide-react';

interface PaymentModalProps {
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  subtotalBs: number;
  taxBs: number;
  totalBs: number;
  config: PosConfig;
  initialTab?: 'all' | 'cash' | 'card_mobile';
  onClose: () => void;
  onCompleteSale: (payments: PaymentBreakdown, changeUsd: number, changeBs: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  subtotalUsd,
  taxUsd,
  totalUsd,
  subtotalBs,
  taxBs,
  totalBs,
  config,
  initialTab = 'all',
  onClose,
  onCompleteSale,
}) => {
  const [activeTab, setActiveTab] = useState<'cash_usd' | 'cash_bs' | 'card' | 'pago_movil' | 'mixed'>(
    initialTab === 'cash' ? 'cash_usd' : initialTab === 'card_mobile' ? 'card' : 'cash_usd'
  );

  // Inputs for payments
  const [cashUsdReceived, setCashUsdReceived] = useState<string>('');
  const [cashBsReceived, setCashBsReceived] = useState<string>('');
  const [cardAmountBs, setCardAmountBs] = useState<string>('');
  const [pagoMovilAmountBs, setPagoMovilAmountBs] = useState<string>('');
  const [pagoMovilRef, setPagoMovilRef] = useState<string>('');
  const [pagoMovilBank, setPagoMovilBank] = useState<string>('Banesco');

  // Auto-fill active method when switching if single payment mode
  useEffect(() => {
    if (activeTab === 'cash_usd') {
      setCashUsdReceived(totalUsd.toFixed(2));
    } else if (activeTab === 'cash_bs') {
      setCashBsReceived(totalBs.toFixed(2));
    } else if (activeTab === 'card') {
      setCardAmountBs(totalBs.toFixed(2));
    } else if (activeTab === 'pago_movil') {
      setPagoMovilAmountBs(totalBs.toFixed(2));
      if (!pagoMovilRef) {
        setPagoMovilRef(Math.floor(1000 + Math.random() * 9000).toString());
      }
    }
  }, [activeTab, totalUsd, totalBs]);

  // Compute parsed payments
  const numCashUsd = parseFloat(cashUsdReceived) || 0;
  const numCashBs = parseFloat(cashBsReceived) || 0;
  const numCardBs = parseFloat(cardAmountBs) || 0;
  const numPagoMovilBs = parseFloat(pagoMovilAmountBs) || 0;

  // Total received converted to USD equivalent
  let totalReceivedUsd = 0;
  if (activeTab === 'cash_usd') {
    totalReceivedUsd = numCashUsd;
  } else if (activeTab === 'cash_bs') {
    totalReceivedUsd = numCashBs / config.exchangeRate;
  } else if (activeTab === 'card') {
    totalReceivedUsd = numCardBs / config.exchangeRate;
  } else if (activeTab === 'pago_movil') {
    totalReceivedUsd = numPagoMovilBs / config.exchangeRate;
  } else {
    // Mixed
    totalReceivedUsd = numCashUsd + ((numCashBs + numCardBs + numPagoMovilBs) / config.exchangeRate);
  }

  const diffUsd = totalReceivedUsd - totalUsd;
  const isPaidInFull = diffUsd >= -0.009;
  const changeUsd = diffUsd > 0 ? diffUsd : 0;
  const changeBs = changeUsd * config.exchangeRate;
  const remainingUsd = diffUsd < 0 ? Math.abs(diffUsd) : 0;
  const remainingBs = remainingUsd * config.exchangeRate;

  const handleFinish = () => {
    if (!isPaidInFull) {
      sound.playError();
      return;
    }

    sound.playCashDrawer();
    sound.playSuccess();
    
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore
    }

    const breakdown: PaymentBreakdown = {
      cashUsd: activeTab === 'cash_usd' || activeTab === 'mixed' ? numCashUsd : 0,
      cashBs: activeTab === 'cash_bs' || activeTab === 'mixed' ? numCashBs : 0,
      cardBs: activeTab === 'card' || activeTab === 'mixed' ? numCardBs : 0,
      cardUsd: 0,
      pagoMovilBs: activeTab === 'pago_movil' || activeTab === 'mixed' ? numPagoMovilBs : 0,
      pagoMovilRef: pagoMovilRef,
      pagoMovilBank: pagoMovilBank,
    };

    onCompleteSale(breakdown, changeUsd, changeBs);
  };

  const setExactUsd = () => {
    sound.playClick();
    setCashUsdReceived(totalUsd.toFixed(2));
  };

  const addBillUsd = (amount: number) => {
    sound.playClick();
    const current = parseFloat(cashUsdReceived) || 0;
    setCashUsdReceived((current + amount).toFixed(2));
  };

  const banks = [
    'Banesco',
    'Banco de Venezuela (BDV)',
    'Mercantil',
    'BBVA Provincial',
    'Bancaribe',
    'BNC Nacional de Crédito',
    'Bancaribe',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[95vh] border border-slate-300">
        {/* Header */}
        <div className="bg-[#1e4b85] text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-white" />
            <div>
              <h2 className="font-black text-lg tracking-wide">FINALIZAR COBRO / PAGO</h2>
              <p className="text-xs text-blue-200">Tasa Oficial: {config.exchangeRate.toFixed(2)} Bs/USD</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 hover:bg-white/20 rounded-md transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Amount Summary Cards */}
        <div className="bg-[#eef2f8] p-4 border-b border-slate-200 grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total a Pagar (USD)</span>
            <span className="text-2xl md:text-3xl font-black text-slate-900 font-mono tracking-tight">
              ${totalUsd.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-500">
              Subtotal: ${subtotalUsd.toFixed(2)} + IVA: ${taxUsd.toFixed(2)}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total en Bolívares (Bs.)</span>
            <span className="text-2xl md:text-3xl font-black text-blue-900 font-mono tracking-tight">
              Bs. {totalBs.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-500">
              Subtotal: Bs. {subtotalBs.toFixed(2)} + IVA: Bs. {taxBs.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Method Tabs */}
        <div className="flex border-b border-slate-300 bg-slate-100 overflow-x-auto">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('cash_usd');
            }}
            className={`flex-1 min-w-[110px] py-2.5 px-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'cash_usd'
                ? 'border-[#1e4b85] text-[#1e4b85] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>Efectivo USD</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('cash_bs');
            }}
            className={`flex-1 min-w-[110px] py-2.5 px-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'cash_bs'
                ? 'border-[#1e4b85] text-[#1e4b85] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Efectivo Bs.</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('card');
            }}
            className={`flex-1 min-w-[110px] py-2.5 px-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'card'
                ? 'border-[#1e4b85] text-[#1e4b85] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>Punto / Débito</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('pago_movil');
            }}
            className={`flex-1 min-w-[110px] py-2.5 px-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'pago_movil'
                ? 'border-[#1e4b85] text-[#1e4b85] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Smartphone className="w-4 h-4 text-teal-600" />
            <span>Pago Móvil</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('mixed');
            }}
            className={`flex-1 min-w-[100px] py-2.5 px-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'mixed'
                ? 'border-[#1e4b85] text-[#1e4b85] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Mixto</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Cash USD */}
          {activeTab === 'cash_usd' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Monto Recibido en USD ($):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashUsdReceived}
                    onChange={(e) => setCashUsdReceived(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xl font-bold font-mono text-slate-900 border-2 border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick bill buttons */}
              <div>
                <span className="text-xs text-slate-500 font-medium block mb-1.5">Billetes rápidos USD:</span>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 5, 10, 20, 50, 100].map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => addBillUsd(bill)}
                      className="py-2 px-1 text-center bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-sm rounded-lg pos-btn"
                    >
                      +${bill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={setExactUsd}
                  className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-md pos-btn"
                >
                  Monto Exacto (${totalUsd.toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setCashUsdReceived((Math.ceil(totalUsd)).toFixed(2))}
                  className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-md pos-btn"
                >
                  Redondear Arriba (${Math.ceil(totalUsd)}.00)
                </button>
              </div>
            </div>
          )}

          {/* Cash Bs */}
          {activeTab === 'cash_bs' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Monto Recibido en Bolívares (Bs.):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                    Bs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashBsReceived}
                    onChange={(e) => setCashBsReceived(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 text-xl font-bold font-mono text-slate-900 border-2 border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCashBsReceived(totalBs.toFixed(2))}
                  className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-md pos-btn"
                >
                  Monto Exacto (Bs. {totalBs.toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setCashBsReceived((Math.ceil(totalBs / 50) * 50).toFixed(2))}
                  className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-md pos-btn"
                >
                  Múltiplo de 50 (Bs. {(Math.ceil(totalBs / 50) * 50).toFixed(2)})
                </button>
              </div>
            </div>
          )}

          {/* Card / Punto de Venta */}
          {activeTab === 'card' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-blue-600 shrink-0" />
                <div className="text-xs text-blue-900">
                  <p className="font-bold">Terminal Punto de Venta Inteligente</p>
                  <p className="text-blue-700">Pase la tarjeta del cliente por el dispositivo POS.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Monto a Cobrar por Punto (Bs.):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cardAmountBs}
                  onChange={(e) => setCardAmountBs(e.target.value)}
                  className="w-full px-4 py-2.5 text-xl font-bold font-mono text-slate-900 border-2 border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Pago Movil */}
          {activeTab === 'pago_movil' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Banco Emisor:
                  </label>
                  <select
                    value={pagoMovilBank}
                    onChange={(e) => setPagoMovilBank(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                  >
                    {banks.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Últimos 4 Dígitos / Referencia:
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={pagoMovilRef}
                    onChange={(e) => setPagoMovilRef(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                    placeholder="Ej. 8492"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Monto en Bolívares (Bs.):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pagoMovilAmountBs}
                  onChange={(e) => setPagoMovilAmountBs(e.target.value)}
                  className="w-full px-4 py-2 text-lg font-bold font-mono text-slate-900 border-2 border-slate-300 rounded-lg focus:border-[#1e4b85] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Mixed */}
          {activeTab === 'mixed' && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-600 font-medium">Distribuye el pago entre varias formas combinadas:</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Efectivo USD ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashUsdReceived}
                    onChange={(e) => setCashUsdReceived(e.target.value)}
                    className="w-full px-3 py-1.5 text-base font-bold font-mono border border-slate-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Efectivo Bolívares (Bs.):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashBsReceived}
                    onChange={(e) => setCashBsReceived(e.target.value)}
                    className="w-full px-3 py-1.5 text-base font-bold font-mono border border-slate-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Punto de Venta (Bs.):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cardAmountBs}
                    onChange={(e) => setCardAmountBs(e.target.value)}
                    className="w-full px-3 py-1.5 text-base font-bold font-mono border border-slate-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Pago Móvil (Bs.):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pagoMovilAmountBs}
                    onChange={(e) => setPagoMovilAmountBs(e.target.value)}
                    className="w-full px-3 py-1.5 text-base font-bold font-mono border border-slate-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Change or Remaining Calculation Box */}
          <div className="p-3.5 rounded-lg border flex items-center justify-between transition-colors bg-slate-50 border-slate-200">
            {isPaidInFull ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    {changeUsd > 0.001 ? 'Cambio / Vuelto a Entregar:' : 'Monto Completo Exacto'}
                  </span>
                  <div className="text-xl font-black text-emerald-900 font-mono">
                    ${changeUsd.toFixed(2)} USD
                    <span className="text-sm font-semibold text-emerald-700 ml-2">
                      (Bs. {changeBs.toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                    Faltante por Pagar:
                  </span>
                  <div className="text-xl font-black text-amber-900 font-mono">
                    ${remainingUsd.toFixed(2)} USD
                    <span className="text-sm font-semibold text-amber-700 ml-2">
                      (Bs. {remainingBs.toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-right text-xs text-slate-500 font-mono">
              Recibido eq: ${totalReceivedUsd.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-sm pos-btn"
          >
            Cancelar (Esc)
          </button>

          <button
            onClick={handleFinish}
            disabled={!isPaidInFull}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-black text-base transition-all shadow-md pos-btn ${
              isPaidInFull
                ? 'bg-[#1e4b85] hover:bg-[#163f73] text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>CONFIRMAR PAGO Y EMITIR FACTURA</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
