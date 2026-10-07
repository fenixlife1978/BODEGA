import React, { useState } from 'react';
import { Product, ProductPresentation, PosConfig, CartItem } from '../types/pos';
import { sound } from '../utils/sound';
import {
  X,
  Scale,
  Droplets,
  Package,
  Layers,
  DollarSign,
  Coins,
  Check,
  Plus
} from 'lucide-react';

interface FractionalProductSelectorModalProps {
  product: Product;
  config: PosConfig;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export const FractionalProductSelectorModal: React.FC<FractionalProductSelectorModalProps> = ({
  product,
  config,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  if (!isOpen) return null;

  const isKg = product.unitOfMeasure === 'KG' || product.allowsGrams;
  const isLts = product.unitOfMeasure === 'LTS' || product.allowsMlFraction;
  const hasSubUnit = !!product.allowsSmallerUnit;
  const hasCustomPresentations = product.presentations && product.presentations.length > 0;

  // Mode selection
  const [selectedMode, setSelectedMode] = useState<'main' | 'sub_unit' | 'grams' | 'kg_decimal' | 'ml' | 'bs_budget' | 'custom_pres'>(
    isKg ? 'grams' : isLts ? 'ml' : hasSubUnit ? 'main' : 'main'
  );

  // Values
  const [inputQuantityStr, setInputQuantityStr] = useState<string>('1');
  const [inputGramsStr, setInputGramsStr] = useState<string>('500');
  const [inputMlStr, setInputMlStr] = useState<string>('250');
  const [inputBsBudgetStr, setInputBsBudgetStr] = useState<string>('50.00');
  const [selectedPresId, setSelectedPresId] = useState<string>(
    hasCustomPresentations ? product.presentations![0].id : ''
  );

  // Compute live price & quantity
  let calculatedQty = 1;
  let calculatedPriceUsd = product.priceUsd;
  let calculatedLineTotalUsd = product.priceUsd;
  let displayUnit = product.unitOfMeasure;
  let presentationTitle = product.name;

  if (selectedMode === 'main') {
    const q = parseFloat(inputQuantityStr) || 1;
    calculatedQty = q;
    calculatedPriceUsd = product.priceUsd;
    calculatedLineTotalUsd = calculatedPriceUsd * calculatedQty;
    displayUnit = product.unitOfMeasure;
  } else if (selectedMode === 'sub_unit' && product.unitPriceUsd) {
    const q = parseFloat(inputQuantityStr) || 1;
    calculatedQty = q;
    calculatedPriceUsd = product.unitPriceUsd;
    calculatedLineTotalUsd = calculatedPriceUsd * calculatedQty;
    displayUnit = 'UND';
    presentationTitle = `${product.name} (Unidad Individual)`;
  } else if (selectedMode === 'grams') {
    const gms = parseFloat(inputGramsStr) || 0;
    const kgEquivalent = gms / 1000;
    calculatedQty = kgEquivalent;
    calculatedPriceUsd = product.priceUsd; // price per Kg
    calculatedLineTotalUsd = calculatedPriceUsd * kgEquivalent;
    displayUnit = 'KG';
    presentationTitle = `${product.name} (${gms} g)`;
  } else if (selectedMode === 'kg_decimal') {
    const kg = parseFloat(inputQuantityStr) || 0;
    calculatedQty = kg;
    calculatedPriceUsd = product.priceUsd;
    calculatedLineTotalUsd = calculatedPriceUsd * kg;
    displayUnit = 'KG';
  } else if (selectedMode === 'ml') {
    const ml = parseFloat(inputMlStr) || 0;
    const ltsEquivalent = ml / 1000;
    calculatedQty = ltsEquivalent;
    calculatedPriceUsd = product.priceUsd; // price per liter
    calculatedLineTotalUsd = calculatedPriceUsd * ltsEquivalent;
    displayUnit = 'LTS';
    presentationTitle = `${product.name} (${ml} ml)`;
  } else if (selectedMode === 'bs_budget') {
    // "Cliente quiere 50 Bs de Aceite"
    const bsAmount = parseFloat(inputBsBudgetStr) || 0;
    const usdAmount = bsAmount / config.exchangeRate;
    calculatedLineTotalUsd = usdAmount;
    // Quantity in liters = (usdAmount / pricePerLiter)
    calculatedQty = product.priceUsd > 0 ? usdAmount / product.priceUsd : 0;
    calculatedPriceUsd = product.priceUsd;
    displayUnit = 'LTS';
    const mlCalculated = Math.round(calculatedQty * 1000);
    presentationTitle = `${product.name} (~${mlCalculated} ml / Bs. ${bsAmount.toFixed(2)})`;
  } else if (selectedMode === 'custom_pres' && product.presentations) {
    const pres = product.presentations.find((p) => p.id === selectedPresId);
    if (pres) {
      const q = parseFloat(inputQuantityStr) || 1;
      calculatedQty = q;
      calculatedPriceUsd = pres.priceUsd;
      calculatedLineTotalUsd = calculatedPriceUsd * calculatedQty;
      displayUnit = pres.unitOfMeasure;
      presentationTitle = `${product.name} - ${pres.name}`;
    }
  }

  const calculatedLineTotalBs = calculatedLineTotalUsd * config.exchangeRate;

  const handleConfirm = () => {
    sound.playScan();

    const cartItem: CartItem = {
      product: {
        ...product,
        name: presentationTitle,
      },
      selectedPresentationId: selectedMode === 'custom_pres' ? selectedPresId : undefined,
      presentationName: presentationTitle,
      unitOfMeasure: displayUnit,
      quantity: Number(calculatedQty.toFixed(3)),
      quantityInputStr: calculatedQty.toString(),
      fractionMode: selectedMode === 'bs_budget' ? 'bs_budget' : selectedMode === 'grams' ? 'grams' : selectedMode === 'ml' ? 'ml' : 'direct',
      amountBsBudget: selectedMode === 'bs_budget' ? parseFloat(inputBsBudgetStr) : undefined,
      customPriceUsd: calculatedPriceUsd,
      overrideTotal: Number(calculatedLineTotalUsd.toFixed(2)),
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 md:p-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-300">
        
        {/* Header */}
        <div className="bg-[#1b4e8c] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-200" />
            <div>
              <h2 className="font-bold text-base">{product.name}</h2>
              <p className="text-xs text-blue-200">Selecciona presentación, peso o fracción a despachar</p>
            </div>
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

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          
          {/* Mode Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b pb-3">
            {/* Main Package / Base */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setSelectedMode('main');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                selectedMode === 'main'
                  ? 'bg-[#1b4e8c] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {product.unitOfMeasure === 'PQTE' ? 'Paquete Completo' : product.unitOfMeasure === 'CAJA' ? 'Caja Completa' : `Presentación ${product.unitOfMeasure}`}
            </button>

            {/* Sub-unit / Individual Single Unit */}
            {hasSubUnit && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedMode('sub_unit');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  selectedMode === 'sub_unit'
                    ? 'bg-[#1b4e8c] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                1 Unidad Individual (${product.unitPriceUsd?.toFixed(2)})
              </button>
            )}

            {/* Grams mode */}
            {isKg && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedMode('grams');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${
                    selectedMode === 'grams'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Por Gramos (g)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedMode('kg_decimal');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    selectedMode === 'kg_decimal'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Por Kilogramos (Kg)
                </button>
              </>
            )}

            {/* Milliliters & Bs Budget mode */}
            {isLts && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedMode('ml');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${
                    selectedMode === 'ml'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200'
                  }`}
                >
                  <Droplets className="w-3.5 h-3.5" />
                  <span>Por Mililitros (ml)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedMode('bs_budget');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${
                    selectedMode === 'bs_budget'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Por Monto en Bs.</span>
                </button>
              </>
            )}

            {/* Custom presentations */}
            {hasCustomPresentations && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedMode('custom_pres');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  selectedMode === 'custom_pres'
                    ? 'bg-[#1b4e8c] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Otras Presentaciones
              </button>
            )}
          </div>

          {/* INPUT FORM ACCORDING TO SELECTED MODE */}
          {/* 1. Main / Sub-Unit Quantity */}
          {(selectedMode === 'main' || selectedMode === 'sub_unit') && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad a Llevar ({selectedMode === 'sub_unit' ? 'Unidades sueltas' : product.unitOfMeasure}):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const q = Math.max(1, (parseFloat(inputQuantityStr) || 1) - 1);
                      setInputQuantityStr(q.toString());
                    }}
                    className="w-10 h-10 bg-slate-200 hover:bg-slate-300 font-black rounded-lg text-lg pos-btn"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    value={inputQuantityStr}
                    onChange={(e) => setInputQuantityStr(e.target.value)}
                    className="flex-1 py-2 px-3 text-center text-xl font-black font-mono border-2 border-slate-300 rounded-lg focus:border-[#1b4e8c] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const q = (parseFloat(inputQuantityStr) || 0) + 1;
                      setInputQuantityStr(q.toString());
                    }}
                    className="w-10 h-10 bg-slate-200 hover:bg-slate-300 font-black rounded-lg text-lg pos-btn"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Grams Mode */}
          {selectedMode === 'grams' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad en Gramos (g):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputGramsStr}
                    onChange={(e) => setInputGramsStr(e.target.value)}
                    placeholder="350"
                    className="w-full pl-4 pr-12 py-2.5 text-2xl font-black font-mono text-slate-900 border-2 border-amber-500 rounded-lg bg-amber-50/40 focus:outline-hidden"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-900">
                    Gramos (g)
                  </span>
                </div>
              </div>

              {/* Quick Grams Buttons */}
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {['100', '250', '350', '500', '750', '1000', '1250', '1500'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setInputGramsStr(g);
                    }}
                    className="py-1.5 px-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded text-center pos-btn"
                  >
                    {g} g
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Kg Decimal Mode */}
          {selectedMode === 'kg_decimal' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Peso en Kilogramos (Kg):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputQuantityStr}
                    onChange={(e) => setInputQuantityStr(e.target.value)}
                    placeholder="0.450"
                    className="w-full pl-4 pr-12 py-2.5 text-2xl font-black font-mono text-slate-900 border-2 border-amber-500 rounded-lg bg-amber-50/40 focus:outline-hidden"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-900">
                    Kg
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {['0.250', '0.500', '0.750', '1.000'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setInputQuantityStr(k);
                    }}
                    className="py-1.5 px-1 bg-slate-100 hover:bg-amber-100 border rounded text-center pos-btn"
                  >
                    {k} Kg
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Milliliters Mode */}
          {selectedMode === 'ml' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad en Mililitros (ml):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputMlStr}
                    onChange={(e) => setInputMlStr(e.target.value)}
                    placeholder="250"
                    className="w-full pl-4 pr-12 py-2.5 text-2xl font-black font-mono text-slate-900 border-2 border-teal-500 rounded-lg bg-teal-50/40 focus:outline-hidden"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-teal-900">
                    ml
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {['100', '250', '500', '750', '1000', '1500'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setInputMlStr(m);
                    }}
                    className="py-1.5 px-1 bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-900 rounded text-center pos-btn"
                  >
                    {m} ml
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Bs Budget Mode (Cliente pide X Bolívares) */}
          {selectedMode === 'bs_budget' && (
            <div className="space-y-3">
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                <p className="font-bold">Despacho por Monto en Bolívares (Bs.):</p>
                <p>Escribe el monto en Bs. que el cliente desea llevar y el sistema calculará los ml exactos.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monto Solicitado en Bolívares (Bs.):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-800">
                    Bs.
                  </span>
                  <input
                    type="text"
                    value={inputBsBudgetStr}
                    onChange={(e) => setInputBsBudgetStr(e.target.value)}
                    placeholder="50.00"
                    className="w-full pl-10 pr-4 py-2.5 text-2xl font-black font-mono text-emerald-950 border-2 border-emerald-500 rounded-lg bg-emerald-50/30 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {['20.00', '50.00', '100.00', '200.00'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setInputBsBudgetStr(b);
                    }}
                    className="py-1.5 px-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded text-center pos-btn"
                  >
                    Bs. {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 6. Custom Presentations Selection */}
          {selectedMode === 'custom_pres' && product.presentations && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Elige la presentación:</label>
              {product.presentations.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    sound.playClick();
                    setSelectedPresId(p.id);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                    selectedPresId === p.id
                      ? 'border-[#1b4e8c] bg-blue-50/70'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">{p.name}</div>
                    <div className="text-[10px] text-slate-500">Unidad: {p.unitOfMeasure}</div>
                  </div>
                  <div className="text-right font-mono font-bold text-sm text-blue-900">
                    ${p.priceUsd.toFixed(2)} USD
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LIVE SUMMARY RESULT CARD */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1.5">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Resumen de Línea a Agregar:</div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm truncate max-w-[240px]">{presentationTitle}</span>
              <span className="text-xs text-slate-300 font-mono">Cant: {calculatedQty.toFixed(3)} {displayUnit}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-slate-800 pt-1.5">
              <div className="text-xs text-slate-400">Total Línea:</div>
              <div className="text-right">
                <span className="text-xl font-black font-mono text-emerald-400 mr-2">
                  ${calculatedLineTotalUsd.toFixed(2)} USD
                </span>
                <span className="text-xs font-bold font-mono text-blue-300">
                  (Bs. {calculatedLineTotalBs.toFixed(2)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex-1 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs pos-btn"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 bg-[#1b4e8c] hover:bg-[#153e6d] text-white font-bold rounded-lg text-xs pos-btn flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar al Carrito</span>
          </button>
        </div>
      </div>
    </div>
  );
};
