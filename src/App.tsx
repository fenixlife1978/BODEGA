import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, PosConfig, SaleRecord, PaymentBreakdown } from './types/pos';
import { INITIAL_PRODUCTS, INITIAL_CART, INITIAL_CONFIG } from './data/initialProducts';
import { sound } from './utils/sound';
import { AddProductModal } from './components/AddProductModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { MenuDrawer } from './components/MenuDrawer';
import { InventoryManagementModal } from './components/InventoryManagementModal';
import { FractionalProductSelectorModal } from './components/FractionalProductSelectorModal';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  Menu,
  Minus as WindowMinus,
  Square as WindowSquare,
  X as WindowClose,
  ShoppingBag,
  Scale,
  Droplets,
  Barcode,
  CheckCircle2,
  Layers
} from 'lucide-react';

export default function App() {
  // Main State
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [config, setConfig] = useState<PosConfig>(INITIAL_CONFIG);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);

  // Search in header state
  const [headerSearch, setHeaderSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [selectedFractionalProduct, setSelectedFractionalProduct] = useState<Product | null>(null);
  const [barcodeNotification, setBarcodeNotification] = useState<string | null>(null);

  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    initialTab: 'all' | 'cash' | 'card_mobile';
  }>({
    isOpen: false,
    initialTab: 'all',
  });
  const [receiptModalState, setReceiptModalState] = useState<{
    isOpen: boolean;
    sale: SaleRecord | null;
  }>({
    isOpen: false,
    sale: null,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastCambio, setLastCambio] = useState<{ usd: number; bs: number }>({ usd: 0, bs: 0 });

  // Fixed or dynamic date matching screenshot
  const [displayDate, setDisplayDate] = useState('Sexta: 14 Oct 2023 10:45 AM');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = now.getDate();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedTime = `${hours}:${minutes} ${ampm}`;
      setDisplayDate(`Sexta: ${day} ${month} ${year} ${formattedTime}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Background Hardware Barcode Scanner & Global Shortcuts Listener
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();

      // Check if user is typing into a form input
      const activeElement = document.activeElement;
      const isInputActive = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      // Detect hardware barcode scanner (rapid keystrokes < 65ms apart)
      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
          const scannedCode = barcodeBuffer.trim();
          const matchedProduct = products.find(
            (p) => p.barcode === scannedCode || p.barcode.endsWith(scannedCode)
          );

          if (matchedProduct) {
            e.preventDefault();
            sound.playScan();
            handleSmartAddProduct(matchedProduct);
            setBarcodeNotification(`Escaneado: ${matchedProduct.name}`);
            setTimeout(() => setBarcodeNotification(null), 2500);
            barcodeBuffer = '';
            return;
          }
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1) {
        // If keystrokes happen in rapid succession, accumulate
        if (currentTime - lastKeyTime < 65 || barcodeBuffer.length === 0) {
          barcodeBuffer += e.key;
        } else {
          barcodeBuffer = e.key;
        }
        lastKeyTime = currentTime;
      }

      // Keyboard Shortcuts (F12, F2, F4, Esc)
      if (e.key === 'F12') {
        e.preventDefault();
        sound.playClick();
        if (cart.length > 0) {
          setPaymentModalState({ isOpen: true, initialTab: 'all' });
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        sound.playClick();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        sound.playClick();
        setIsAddModalOpen(true);
      } else if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (isInventoryModalOpen) setIsInventoryModalOpen(false);
        if (selectedFractionalProduct) setSelectedFractionalProduct(null);
        if (paymentModalState.isOpen) setPaymentModalState({ isOpen: false, initialTab: 'all' });
        if (receiptModalState.isOpen) setReceiptModalState({ isOpen: false, sale: null });
        if (isMenuOpen) setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, products, isAddModalOpen, isInventoryModalOpen, selectedFractionalProduct, paymentModalState, receiptModalState, isMenuOpen]);

  // Cart Calculations with item-level tax awareness
  const calculateSubtotalUsd = () => {
    return cart.reduce((sum, item) => {
      if (item.overrideTotal !== undefined) {
        return sum + item.overrideTotal;
      }
      const price = item.customPriceUsd ?? item.product.priceUsd;
      return sum + price * item.quantity;
    }, 0);
  };

  const calculateTaxUsd = () => {
    return cart.reduce((sum, item) => {
      if (item.product.hasTax === false) return sum;
      const lineSubtotal = item.overrideTotal !== undefined 
        ? item.overrideTotal 
        : (item.customPriceUsd ?? item.product.priceUsd) * item.quantity;
      return sum + (lineSubtotal * config.ivaRate);
    }, 0);
  };

  const subtotalUsd = calculateSubtotalUsd();
  const taxUsd = calculateTaxUsd();
  const totalUsd = subtotalUsd + taxUsd;

  const subtotalBs = subtotalUsd * config.exchangeRate;
  const taxBs = taxUsd * config.exchangeRate;
  const totalBs = totalUsd * config.exchangeRate;

  // Smart Add Product Handler
  const handleSmartAddProduct = (product: Product, quantity: number = 1) => {
    sound.playScan();
    // If product has complex presentations, smaller unit sales, or fractional grams/ml options, open selector
    if (product.allowsSmallerUnit || (product.presentations && product.presentations.length > 0)) {
      setSelectedFractionalProduct(product);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const currentQty = updated[existingIndex].quantity;
        const newQty = Number((currentQty + quantity).toFixed(3));
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          quantityInputStr: newQty.toString(),
          overrideTotal: undefined,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity,
            quantityInputStr: quantity.toString(),
            unitOfMeasure: product.unitOfMeasure,
          },
        ];
      }
    });
  };

  const handleAddCustomCartItem = (cartItem: CartItem) => {
    setCart((prev) => [...prev, cartItem]);
  };

  // Free-form text editable quantity handler allowing deleting down to empty and typing decimals like 0.450
  const handleUpdateQuantityString = (index: number, textValue: string) => {
    setCart((prev) => {
      const updated = [...prev];
      const parsed = parseFloat(textValue);
      const cleanNum = isNaN(parsed) ? 0 : parsed;
      updated[index] = {
        ...updated[index],
        quantity: cleanNum,
        quantityInputStr: textValue,
        overrideTotal: undefined,
      };
      return updated;
    });
  };

  const handleStepQuantity = (index: number, delta: number) => {
    sound.playClick();
    setCart((prev) => {
      const updated = [...prev];
      const current = updated[index].quantity;
      const next = Math.max(0, Number((current + delta).toFixed(3)));
      if (next <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...updated[index],
        quantity: next,
        quantityInputStr: next.toString(),
        overrideTotal: undefined,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    sound.playClick();
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    sound.playClick();
    setCart([]);
  };

  const handleResetToImage = () => {
    setCart(INITIAL_CART);
    setConfig(INITIAL_CONFIG);
    setLastCambio({ usd: 0, bs: 0 });
    sound.playSuccess();
  };

  // Checkout Handlers
  const handleOpenPayment = (mode: 'all' | 'cash' | 'card_mobile') => {
    sound.playClick();
    if (cart.length === 0) {
      sound.playError();
      return;
    }
    setPaymentModalState({ isOpen: true, initialTab: mode });
  };

  const handleCompleteSale = (payments: PaymentBreakdown, changeUsd: number, changeBs: number) => {
    const saleRecord: SaleRecord = {
      id: 'sale-' + Date.now(),
      receiptNumber: (1000 + salesHistory.length + 1).toString(),
      timestamp: new Date().toLocaleString('es-VE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      items: [...cart],
      subtotalUsd,
      taxUsd,
      totalUsd,
      subtotalBs,
      taxBs,
      totalBs,
      exchangeRate: config.exchangeRate,
      cashier: config.cashierName,
      cashRegister: config.registerName,
      payments,
      changeGivenUsd: changeUsd,
      changeGivenBs: changeBs,
      status: 'COMPLETADA',
    };

    setSalesHistory((prev) => [saleRecord, ...prev]);
    setLastCambio({ usd: changeUsd, bs: changeBs });
    setPaymentModalState({ isOpen: false, initialTab: 'all' });
    setReceiptModalState({ isOpen: true, sale: saleRecord });
    setCart([]);
  };

  // Intelligent Search Filter: matches keywords, names, barcodes, categories
  const searchResults = headerSearch.trim()
    ? products.filter((p) => {
        const query = headerSearch.toLowerCase().trim();
        const barcodeMatch = p.barcode.includes(query) || p.barcode.endsWith(query);
        const nameMatch = p.name.toLowerCase().includes(query);
        const categoryMatch = p.category.toLowerCase().includes(query);
        const descMatch = p.description && p.description.toLowerCase().includes(query);
        return barcodeMatch || nameMatch || categoryMatch || descMatch;
      })
    : [];

  return (
    <div className="w-full min-h-screen bg-[#dce3ec] flex flex-col items-center justify-start font-sans select-none antialiased overflow-x-auto">
      
      {/* Toast Notification on Barcode Scan */}
      {barcodeNotification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 text-xs font-bold animate-fade-in border border-emerald-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{barcodeNotification}</span>
        </div>
      )}

      {/* Outer Application Window Frame: locked desktop width matching native POS monitor */}
      <div className="w-full min-w-[1040px] max-w-[1340px] bg-[#dce3ec] flex flex-col min-h-screen justify-between border-x border-[#b9cadc] shadow-xl">
        
        <div>
          {/* ========================================================================= */}
          {/* 1. TOP WINDOW BAR (CHROME / TITLE BAR) */}
          {/* ========================================================================= */}
          <div className="w-full bg-[#e3eaf3] border-b border-[#cbd5e1] px-3 py-1 flex items-center justify-between select-none text-xs text-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm">☀️</span>
              <span className="font-normal text-slate-900 tracking-tight text-[13px]">
                Punto de Venta Sol v3.1
              </span>
            </div>

            {/* Window controls */}
            <div className="flex items-center">
              <button
                onClick={() => sound.playClick()}
                title="Minimizar"
                className="px-3 py-1 hover:bg-[#cbd5e1] text-slate-700 transition-colors pos-btn cursor-pointer"
              >
                <WindowMinus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }}
                title="Maximizar"
                className="px-3 py-1 hover:bg-[#cbd5e1] text-slate-700 transition-colors pos-btn cursor-pointer"
              >
                <WindowSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  handleResetToImage();
                }}
                title="Reiniciar a Datos Originales"
                className="px-3 py-1 hover:bg-red-500 hover:text-white text-slate-700 transition-colors pos-btn cursor-pointer"
              >
                <WindowClose className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MAIN HEADER BAR (NAVY BLUE BODEGA EL SOL - CAJA 1) - IDENTICAL VISUALLY */}
          {/* ========================================================================= */}
          <div className="w-full bg-[#1b4e8c] text-white px-6 py-2.5 flex items-center justify-between gap-4 shadow-sm shrink-0">
            {/* Left Title & Date */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
                {config.storeName}
              </h1>
              <p className="text-xs text-blue-100 font-normal mt-0.5">
                {displayDate}
              </p>
            </div>

            {/* Right Search Input & Hamburger Menu */}
            <div className="flex items-center gap-3 relative">
              <div className="relative w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={headerSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (searchResults.length > 0) {
                        handleSmartAddProduct(searchResults[0]);
                        setHeaderSearch('');
                      } else if (headerSearch.trim()) {
                        const matched = products.find(
                          (p) => p.barcode === headerSearch.trim() || p.barcode.endsWith(headerSearch.trim())
                        );
                        if (matched) {
                          handleSmartAddProduct(matched);
                          setHeaderSearch('');
                        }
                      }
                    }
                  }}
                  placeholder="Buscar productos..."
                  className="w-full bg-white text-slate-900 placeholder:text-slate-500 text-sm pl-9 pr-8 py-1.5 rounded-lg border-0 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-300 font-normal"
                />
                {headerSearch && (
                  <button
                    onClick={() => setHeaderSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <WindowClose className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Instant Intelligent Search Dropdown */}
                {isSearchFocused && searchResults.length > 0 && (
                  <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-lg shadow-2xl border border-slate-300 z-40 max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((prod) => (
                      <div
                        key={prod.id}
                        onMouseDown={() => {
                          handleSmartAddProduct(prod);
                          setHeaderSearch('');
                        }}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {prod.barcode}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <span>{prod.name}</span>
                              {prod.isWeighted && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                  Balanza
                                </span>
                              )}
                            </div>
                            {prod.presentation && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                {prod.presentation}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xs text-slate-900">${prod.priceUsd.toFixed(2)}</div>
                          <div className="text-[10px] text-blue-700 font-mono">Bs. {(prod.priceUsd * config.exchangeRate).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hamburger Menu Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setIsMenuOpen(true);
                }}
                title="Menú de Administración"
                className="p-1.5 bg-transparent hover:bg-white/15 rounded text-white transition-colors pos-btn shrink-0 cursor-pointer"
              >
                <Menu className="w-6 h-6 stroke-[2.2]" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. MAIN BODY / CARRITO DE COMPRAS CARD */}
          {/* ========================================================================= */}
          <div className="px-5 py-3 bg-[#dce3ec] flex flex-col justify-start">
            <div className="w-full bg-white rounded-lg border border-[#c4d2e3] shadow-xs overflow-hidden flex flex-col">
              
              {/* Card Header: CARRITO DE COMPRAS & Trash Icon */}
              <div className="px-6 py-2.5 flex items-center justify-between border-b border-slate-100">
                <h2 className="text-xl font-black tracking-tight text-black uppercase">
                  CARRITO DE COMPRAS
                </h2>

                <button
                  onClick={handleClearCart}
                  title="Vaciar Carrito"
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors pos-btn cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* CABECERA DE TABLA CON PRIMERA COLUMNA "CÓDIGO" */}
              <div className="bg-[#edf2f8] px-6 py-2 border-b border-slate-300 flex items-center justify-between text-xs font-black text-slate-800 uppercase tracking-wider">
                <div className="w-28 text-slate-700">CÓDIGO</div>
                <div className="flex-1 min-w-[180px] text-slate-700">DESCRIPCIÓN</div>
                <div className="w-16 text-center text-slate-700">U.M.</div>
                <div className="w-32 text-right text-slate-700">PRECIO USD / BS.</div>
                <div className="w-32 text-center text-slate-700">CANTIDAD / PESO</div>
                <div className="w-24 text-right text-slate-700">IVA (16%)</div>
                <div className="w-32 text-right text-slate-700">SUBTOTAL</div>
                <div className="w-7 text-center text-slate-400"></div>
              </div>

              {/* Cart Items List Table Rows (Compact py-2 padding, No photos) */}
              <div className="divide-y divide-slate-200 min-h-[220px] max-h-[380px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                    <ShoppingBag className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                    <p className="font-bold text-base text-slate-600">El carrito está vacío</p>
                    <p className="text-xs text-slate-400">
                      Usa el buscador o presiona el botón <span className="font-semibold text-[#1b4e8c]">+ Añadir Producto</span>
                    </p>
                  </div>
                ) : (
                  cart.map((item, index) => {
                    const unitPrice = item.customPriceUsd ?? item.product.priceUsd;
                    const lineSubtotal = item.overrideTotal ?? (unitPrice * item.quantity);
                    const lineTax = item.product.hasTax !== false ? lineSubtotal * config.ivaRate : 0;
                    const priceBs = unitPrice * config.exchangeRate;
                    const lineSubtotalBs = lineSubtotal * config.exchangeRate;
                    const lineTaxBs = lineTax * config.exchangeRate;
                    const umLabel = item.unitOfMeasure || item.product.unitOfMeasure || (item.product.isWeighted ? 'KG' : 'UND');
                    const isWeightedOrFractional = item.product.isWeighted || item.product.allowsGrams || item.product.allowsMlFraction || item.product.unitOfMeasure === 'KG' || item.product.unitOfMeasure === 'LTS';

                    return (
                      <div
                        key={index}
                        className="px-6 py-2 hover:bg-slate-50/90 transition-colors flex items-center justify-between gap-2 group"
                      >
                        {/* 1. PRIMERA COLUMNA: CÓDIGO */}
                        <div className="w-28 shrink-0">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 tracking-tight select-all">
                            {item.product.barcode}
                          </span>
                        </div>

                        {/* 2. DESCRIPCIÓN (Clean Text, clickable to change presentation) */}
                        <div
                          onClick={() => setSelectedFractionalProduct(item.product)}
                          className="flex items-center gap-2 flex-1 min-w-[180px] cursor-pointer"
                          title="Clic para cambiar presentación / fracción"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-black text-[14px] leading-tight group-hover:text-[#1b4e8c] transition-colors">
                                {item.presentationName || item.product.name}
                              </h3>
                              {item.product.isWeighted && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                  Balanza
                                </span>
                              )}
                            </div>
                            {item.product.presentation && (
                              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                                {item.product.presentation}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 3. UNIDAD DE MEDIDA (U.M.) */}
                        <div className="w-16 text-center shrink-0">
                          <span className="inline-block text-[10px] font-extrabold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tracking-wider">
                            {umLabel}
                          </span>
                        </div>

                        {/* 4. PRECIO USD / BS. */}
                        <div className="w-32 text-right shrink-0">
                          <div className="font-bold text-black text-[14px] font-mono">
                            ${unitPrice.toFixed(2)}
                            {isWeightedOrFractional && <span className="text-[10px] font-normal text-slate-500">/{umLabel}</span>}
                          </div>
                          <div className="text-[10px] font-medium text-blue-800 font-mono">
                            Bs. {priceBs.toFixed(2)}
                          </div>
                          {item.product.unitPriceNote && (
                            <div className="text-[9px] text-slate-500 font-mono">
                              {item.product.unitPriceNote}
                            </div>
                          )}
                        </div>

                        {/* 5. CANTIDAD / PESO (FREE TEXT EDITABLE INPUT ALLOWING EMPTY / DECIMALS) */}
                        <div className="w-32 flex items-center justify-center shrink-0">
                          {isWeightedOrFractional ? (
                            /* Free Text Editable Input for Fractional / Weight Items */
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={item.quantityInputStr ?? item.quantity.toString()}
                                onChange={(e) => handleUpdateQuantityString(index, e.target.value)}
                                className="w-20 px-1 py-0.5 text-center font-bold font-mono text-xs border-2 border-amber-400 bg-amber-50/70 text-slate-900 rounded focus:border-[#1b4e8c] focus:outline-hidden focus:bg-white shadow-2xs"
                                placeholder="0.00"
                                title="Editar libremente cantidad o peso"
                              />
                              <span className="text-[11px] font-bold text-amber-900 font-mono">
                                {umLabel}
                              </span>
                            </div>
                          ) : (
                            /* Interactive Counter with Direct Free-text input */
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStepQuantity(index, -1)}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-600 transition-colors pos-btn cursor-pointer"
                                title="Disminuir"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="text"
                                value={item.quantityInputStr ?? item.quantity.toString()}
                                onChange={(e) => handleUpdateQuantityString(index, e.target.value)}
                                className="w-10 px-1 py-0.5 text-center font-bold font-mono text-xs border border-slate-300 rounded bg-white text-black focus:outline-hidden focus:border-[#1b4e8c]"
                              />
                              <button
                                onClick={() => handleStepQuantity(index, 1)}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-600 transition-colors pos-btn cursor-pointer"
                                title="Aumentar"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 6. IVA (16%) */}
                        <div className="w-24 text-right shrink-0">
                          {item.product.hasTax !== false ? (
                            <>
                              <div className="font-semibold text-slate-900 text-xs font-mono">
                                ${lineTax.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-slate-500 font-mono">
                                (Bs. {lineTaxBs.toFixed(2)})
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                              Exento
                            </span>
                          )}
                        </div>

                        {/* 7. SUBTOTAL */}
                        <div className="w-32 text-right shrink-0">
                          <div className="font-black text-black text-sm font-mono">
                            ${lineSubtotal.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-semibold text-blue-900 font-mono">
                            Bs. {lineSubtotalBs.toFixed(2)}
                          </div>
                        </div>

                        {/* 8. ACCIÓN ELIMINAR */}
                        <div className="w-7 text-center shrink-0">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            title="Eliminar artículo"
                          >
                            <WindowClose className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Total Row */}
              <div className="px-6 py-2.5 border-t border-slate-300 bg-white flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                  <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-bold border border-blue-200 text-[11px]">
                    {cart.length} productos en carrito
                  </span>
                  <span className="text-[11px] text-slate-400">• Lector de código de barras activo automáticamente</span>
                </div>

                <div className="flex items-center gap-8">
                  <span className="font-bold text-black text-base">
                    Total:
                  </span>
                  <div className="text-right font-mono">
                    <span className="font-bold text-black text-base mr-2">
                      ${subtotalUsd.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-blue-900">
                      (Bs. {subtotalBs.toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>

              {/* "+ Añadir Producto" Button */}
              <div className="p-3 bg-white border-t border-slate-100">
                <button
                  onClick={() => {
                    sound.playClick();
                    setIsAddModalOpen(true);
                  }}
                  className="w-full py-2 px-4 bg-[#1b4e8c] hover:bg-[#153e6d] active:bg-[#0f2e52] text-white font-semibold text-base rounded-lg flex items-center justify-center gap-2 shadow-2xs transition-colors pos-btn cursor-pointer"
                >
                  <Plus className="w-5 h-5 font-bold" />
                  <span>Añadir Producto</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. POS BOTTOM BAR / FOOTER (LOCKED IN A SINGLE CONTINUOUS LINE: 5 COLUMNS) */}
        {/* ========================================================================= */}
        <div className="w-full bg-[#f0f4f9] border-t border-[#c6d4e4] grid grid-cols-5 divide-x divide-[#cbd5e1] text-black shrink-0">
          
          {/* Box 1: SUBTOTAL USD */}
          <div className="py-2.5 px-3 flex flex-col justify-center items-center text-center bg-white/60">
            <span className="font-bold text-sm text-black tracking-tight uppercase">
              SUBTOTAL USD:
            </span>
            <div className="font-bold text-[26px] text-black leading-tight my-0.5 font-mono">
              ${subtotalUsd.toFixed(2)}
            </div>
            <div className="text-[11px] text-black leading-snug">
              <div>(Con. a Bs: {subtotalBs.toFixed(2)} / B</div>
              <div>Tasa {config.exchangeRate.toFixed(2)} Bs/USD)</div>
            </div>
          </div>

          {/* Box 2: TOTAL IVA (16%) */}
          <div className="py-2.5 px-3 flex flex-col justify-center items-center text-center bg-white/60">
            <span className="font-bold text-sm text-black tracking-tight uppercase">
              TOTAL IVA ({Math.round(config.ivaRate * 100)}%):
            </span>
            <div className="font-bold text-[26px] text-black leading-tight my-0.5 font-mono">
              ${taxUsd.toFixed(2)}
            </div>
            <div className="text-[11px] text-black leading-snug font-mono">
              (Bs. {taxBs.toFixed(2)})
            </div>
          </div>

          {/* Box 3: TOTAL VENTA */}
          <div className="py-2.5 px-3 flex flex-col justify-center items-center text-center bg-white/60">
            <span className="font-bold text-sm text-black tracking-tight uppercase">
              TOTAL VENTA:
            </span>
            <div className="font-bold text-[26px] text-black leading-tight my-0.5 font-mono">
              ${totalUsd.toFixed(2)}
            </div>
            <div className="text-[11px] text-black leading-snug font-mono">
              (Bs. {totalBs.toFixed(2)})
            </div>
          </div>

          {/* Box 4: CAMBIO */}
          <div className="py-2.5 px-3 flex flex-col justify-center items-center text-center bg-white/60">
            <span className="font-bold text-sm text-black tracking-tight uppercase">
              CAMBIO:
            </span>
            <div className="font-bold text-[26px] text-black leading-tight my-0.5 font-mono">
              ${lastCambio.usd.toFixed(2)}
            </div>
            <div className="text-[11px] text-black leading-snug font-mono">
              (Bs. {lastCambio.bs.toFixed(2)})
            </div>
          </div>

          {/* Box 5: ACTION BUTTONS (FINALIZAR PAGO / EFECTIVO / PUNTO) */}
          <div className="p-2 flex flex-col justify-center gap-1 bg-white/40">
            {/* Top Primary Button: FINALIZAR PAGO (F12) */}
            <button
              onClick={() => handleOpenPayment('all')}
              className="w-full py-1.5 px-2 bg-[#1b4e8c] hover:bg-[#153e6d] active:bg-[#0f2e52] text-white font-bold text-[13px] rounded-sm tracking-wider uppercase shadow-2xs transition-colors pos-btn cursor-pointer text-center"
            >
              FINALIZAR PAGO (F12)
            </button>

            {/* Split Bottom Buttons in 1 row side-by-side */}
            <div className="grid grid-cols-2 gap-1">
              {/* Left: Efectivo USD/Bolívares */}
              <button
                onClick={() => handleOpenPayment('cash')}
                className="py-1 px-1 bg-white hover:bg-slate-100 active:bg-slate-200 border border-[#cbd5e1] text-black font-bold text-[11px] rounded-sm leading-tight text-center pos-btn cursor-pointer shadow-2xs"
              >
                <div>Efectivo</div>
                <div>USD/Bolívares</div>
              </button>

              {/* Right: Punto/Tarjeta / Pago Movil */}
              <button
                onClick={() => handleOpenPayment('card_mobile')}
                className="py-1 px-1 bg-white hover:bg-slate-100 active:bg-slate-200 border border-[#cbd5e1] text-black font-bold text-[11px] rounded-sm leading-tight text-center pos-btn cursor-pointer shadow-2xs"
              >
                <div>Punto/Tarjeta</div>
                <div>/ Pago Movil</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODALS & POPUPS */}
      {/* ========================================================================= */}
      {/* Fractional / Multi-presentation Selector Modal */}
      {selectedFractionalProduct && (
        <FractionalProductSelectorModal
          product={selectedFractionalProduct}
          config={config}
          isOpen={!!selectedFractionalProduct}
          onClose={() => setSelectedFractionalProduct(null)}
          onAddToCart={handleAddCustomCartItem}
        />
      )}

      {/* Inventory Management Module */}
      <InventoryManagementModal
        products={products}
        config={config}
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        onSaveProduct={(savedProd) => {
          setProducts((prev) => {
            const idx = prev.findIndex((p) => p.id === savedProd.id);
            if (idx > -1) {
              const copy = [...prev];
              copy[idx] = savedProd;
              return copy;
            } else {
              return [savedProd, ...prev];
            }
          });
        }}
        onDeleteProduct={(id) => {
          setProducts((prev) => prev.filter((p) => p.id !== id));
        }}
      />

      {/* Add Product Modal (Catalog view) */}
      {isAddModalOpen && (
        <AddProductModal
          products={products}
          config={config}
          onClose={() => setIsAddModalOpen(false)}
          onAddProductToCart={(prod, qty) => {
            handleSmartAddProduct(prod, qty);
          }}
          onAddNewProductToCatalog={(newProd) => {
            setProducts((prev) => [newProd, ...prev]);
          }}
          onOpenInventoryModal={() => {
            setIsAddModalOpen(false);
            setIsInventoryModalOpen(true);
          }}
        />
      )}

      {/* Payment / Checkout Modal (F12) */}
      {paymentModalState.isOpen && (
        <PaymentModal
          subtotalUsd={subtotalUsd}
          taxUsd={taxUsd}
          totalUsd={totalUsd}
          subtotalBs={subtotalBs}
          taxBs={taxBs}
          totalBs={totalBs}
          config={config}
          initialTab={paymentModalState.initialTab}
          onClose={() => setPaymentModalState({ isOpen: false, initialTab: 'all' })}
          onCompleteSale={handleCompleteSale}
        />
      )}

      {/* Receipt Modal */}
      {receiptModalState.isOpen && receiptModalState.sale && (
        <ReceiptModal
          sale={receiptModalState.sale}
          config={config}
          onClose={() => setReceiptModalState({ isOpen: false, sale: null })}
          onNewSale={() => {
            setReceiptModalState({ isOpen: false, sale: null });
            handleClearCart();
          }}
        />
      )}

      {/* Administration Menu Drawer */}
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        config={config}
        onUpdateConfig={(newConfig) => setConfig(newConfig)}
        salesHistory={salesHistory}
        onReprintSale={(sale) => {
          setReceiptModalState({ isOpen: true, sale });
          setIsMenuOpen(false);
        }}
        onResetToImageState={handleResetToImage}
        onOpenInventory={() => setIsInventoryModalOpen(true)}
      />
    </div>
  );
}
