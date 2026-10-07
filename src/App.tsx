import React, { useState, useEffect, useRef } from 'react';
import {
  Product,
  CartItem,
  PosConfig,
  SaleRecord,
  PaymentBreakdown,
  Customer,
  CreditPaymentRecord,
  ReturnRecord,
  KardexMovement
} from './types/pos';
import { INITIAL_PRODUCTS, INITIAL_CART, INITIAL_CONFIG } from './data/initialProducts';
import { INITIAL_CUSTOMERS } from './data/initialCustomers';
import { sound } from './utils/sound';
import { fetchBcvRate } from './services/bcvService';
import { BcvLogo } from './components/BcvLogo';
import { AddProductModal } from './components/AddProductModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { MenuDrawer } from './components/MenuDrawer';
import { InventoryManagementModal } from './components/InventoryManagementModal';
import { FractionalProductSelectorModal } from './components/FractionalProductSelectorModal';
import { KardexModal } from './components/KardexModal';
import { CashCutModal, CashCutReport } from './components/CashCutModal';
import { CustomerAccountsModal } from './components/CustomerAccountsModal';
import { CustomerReturnsModal } from './components/CustomerReturnsModal';
import { InvoiceVoidModal } from './components/InvoiceVoidModal';
import { AddCustomerModal } from './components/AddCustomerModal';
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
  Layers,
  FileSpreadsheet,
  CreditCard,
  RotateCcw,
  Ban,
  UserPlus,
  RefreshCw,
  CheckSquare,
  Square,
  UserCheck,
  Receipt,
  Tag,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  // Main POS Data State
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [config, setConfig] = useState<PosConfig>(INITIAL_CONFIG);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [kardexMovements, setKardexMovements] = useState<KardexMovement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [creditPayments, setCreditPayments] = useState<CreditPaymentRecord[]>([]);
  const [returnsHistory, setReturnsHistory] = useState<ReturnRecord[]>([]);

  // Credit Sale in POS State
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(INITIAL_CUSTOMERS[0].id);

  // Search in cart state
  const [cartSearch, setCartSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // BCV Live Rate State
  const [bcvLoading, setBcvLoading] = useState(false);
  const [bcvLastSync, setBcvLastSync] = useState<string>('');
  const [bcvSource, setBcvSource] = useState<string>('bcv.today');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isCashCutOpen, setIsCashCutOpen] = useState(false);
  const [isCxCModalOpen, setIsCxCModalOpen] = useState(false);
  const [isReturnsModalOpen, setIsReturnsModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  const [cashCutReports, setCashCutReports] = useState<CashCutReport[]>([]);
  const [selectedFractionalProduct, setSelectedFractionalProduct] = useState<Product | null>(null);
  const [selectedKardexProduct, setSelectedKardexProduct] = useState<Product | null>(null);
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

  // Dynamic date matching POS clock
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

  // Automatic BCV Rate Fetching via https://bcv.today/api/rate.json
  const syncBcvRate = async () => {
    setBcvLoading(true);
    const result = await fetchBcvRate();
    if (result.success && result.rate > 0) {
      setConfig((prev) => ({ ...prev, exchangeRate: result.rate }));
    }
    setBcvLoading(false);
    setBcvLastSync(result.lastUpdated);
    setBcvSource(result.source);
  };

  useEffect(() => {
    syncBcvRate();
    // Re-sync rate every 5 minutes automatically
    const interval = setInterval(syncBcvRate, 300000);
    return () => clearInterval(interval);
  }, []);

  // Next Invoice Sequence
  const currentInvoiceNumber = (1000 + salesHistory.length + 1).toString().padStart(6, '0');

  // Background Hardware Barcode Scanner & Global Shortcuts Listener
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();

      // Check if user is typing into an input
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
        if (currentTime - lastKeyTime < 65 || barcodeBuffer.length === 0) {
          barcodeBuffer += e.key;
        } else {
          barcodeBuffer = e.key;
        }
        lastKeyTime = currentTime;
      }

      // Keyboard Shortcuts (F12, F2, F4, F8, Esc)
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
      } else if (e.key === 'F8') {
        e.preventDefault();
        sound.playClick();
        setIsCashCutOpen(true);
      } else if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (isInventoryModalOpen) setIsInventoryModalOpen(false);
        if (isCashCutOpen) setIsCashCutOpen(false);
        if (isCxCModalOpen) setIsCxCModalOpen(false);
        if (isReturnsModalOpen) setIsReturnsModalOpen(false);
        if (isVoidModalOpen) setIsVoidModalOpen(false);
        if (isAddCustomerModalOpen) setIsAddCustomerModalOpen(false);
        if (selectedFractionalProduct) setSelectedFractionalProduct(null);
        if (selectedKardexProduct) setSelectedKardexProduct(null);
        if (paymentModalState.isOpen) setPaymentModalState({ isOpen: false, initialTab: 'all' });
        if (receiptModalState.isOpen) setReceiptModalState({ isOpen: false, sale: null });
        if (isMenuOpen) setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    products,
    isAddModalOpen,
    isInventoryModalOpen,
    isCashCutOpen,
    isCxCModalOpen,
    isReturnsModalOpen,
    isVoidModalOpen,
    isAddCustomerModalOpen,
    selectedFractionalProduct,
    selectedKardexProduct,
    paymentModalState,
    receiptModalState,
    isMenuOpen,
  ]);

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
      const lineSubtotal =
        item.overrideTotal !== undefined
          ? item.overrideTotal
          : (item.customPriceUsd ?? item.product.priceUsd) * item.quantity;
      return sum + lineSubtotal * config.ivaRate;
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
    const receiptNum = currentInvoiceNumber;
    const formattedTimestamp = new Date().toLocaleString('es-VE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const activeCustomer = customers.find((c) => c.id === selectedCustomerId);

    const saleRecord: SaleRecord = {
      id: 'sale-' + Date.now(),
      receiptNumber: receiptNum,
      timestamp: formattedTimestamp,
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
      isCreditSale,
      customerId: isCreditSale ? activeCustomer?.id : undefined,
      customerName: isCreditSale ? activeCustomer?.name : undefined,
      customerTaxId: isCreditSale ? activeCustomer?.taxId : undefined,
    };

    // If it's a credit sale, update the customer's balance in accounts receivable (CxC)
    if (isCreditSale && activeCustomer) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === activeCustomer.id
            ? { ...c, currentBalanceUsd: Number((c.currentBalanceUsd + totalUsd).toFixed(2)) }
            : c
        )
      );
    }

    // Automatically record Kardex movements & update stocks for each sold product
    const newMovements: KardexMovement[] = [];
    setProducts((prevProducts) => {
      const updatedProducts = [...prevProducts];
      cart.forEach((cartItem) => {
        const prodIndex = updatedProducts.findIndex((p) => p.id === cartItem.product.id);
        if (prodIndex > -1) {
          const prod = updatedProducts[prodIndex];
          const prevStock = prod.stock;
          const soldQty = cartItem.quantity;
          const newStock = Math.max(0, Number((prevStock - soldQty).toFixed(3)));

          updatedProducts[prodIndex] = {
            ...prod,
            stock: newStock,
          };

          const unitCost = prod.baseCostUsd || prod.priceUsd * 0.75;
          newMovements.push({
            id: 'kardex-pos-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            productId: prod.id,
            timestamp: formattedTimestamp,
            type: 'VENTA',
            reference: `Factura POS #${receiptNum}`,
            quantity: soldQty,
            previousStock: prevStock,
            resultingStock: newStock,
            unitCostUsd: unitCost,
            totalCostUsd: unitCost * soldQty,
            responsible: config.cashierName || 'Caja 1',
            notes: `Venta despachada ${
              isCreditSale ? `[A CRÉDITO - ${activeCustomer?.name}]` : ''
            }`,
          });
        }
      });
      return updatedProducts;
    });

    setKardexMovements((prev) => [...newMovements, ...prev]);
    setSalesHistory((prev) => [saleRecord, ...prev]);
    setLastCambio({ usd: changeUsd, bs: changeBs });
    setPaymentModalState({ isOpen: false, initialTab: 'all' });
    setReceiptModalState({ isOpen: true, sale: saleRecord });
    setIsCreditSale(false); // reset credit mode after checkout
  };

  const handleAddKardexMovement = (movement: KardexMovement, updatedProductStock: number) => {
    setKardexMovements((prev) => [movement, ...prev]);
    setProducts((prev) =>
      prev.map((p) => (p.id === movement.productId ? { ...p, stock: updatedProductStock } : p))
    );
  };

  // Customer Return Handler
  const handleProcessReturn = (returnRecord: ReturnRecord) => {
    setReturnsHistory((prev) => [returnRecord, ...prev]);
    // Restock items to product catalog & log to Kardex
    const returnKardex: KardexMovement[] = [];
    setProducts((prev) => {
      const updated = [...prev];
      returnRecord.items.forEach((retItem) => {
        const idx = updated.findIndex((p) => p.id === retItem.productId);
        if (idx > -1) {
          const prod = updated[idx];
          const prevStock = prod.stock;
          const newStock = Number((prevStock + retItem.quantity).toFixed(3));
          updated[idx] = { ...prod, stock: newStock };

          returnKardex.push({
            id: `kardex-dev-${Date.now()}-${retItem.productId}`,
            productId: prod.id,
            timestamp: returnRecord.timestamp,
            type: 'DEVOLUCION',
            reference: `Devolución #${returnRecord.id} (Factura #${returnRecord.receiptNumber})`,
            quantity: retItem.quantity,
            previousStock: prevStock,
            resultingStock: newStock,
            unitCostUsd: prod.baseCostUsd || prod.priceUsd * 0.75,
            totalCostUsd: (prod.baseCostUsd || prod.priceUsd * 0.75) * retItem.quantity,
            responsible: returnRecord.authorizedBy,
            notes: `Devolución: ${returnRecord.reason}`,
          });
        }
      });
      return updated;
    });
    setKardexMovements((prev) => [...returnKardex, ...prev]);
  };

  // Invoice Void Handler
  const handleVoidSale = (saleId: string, reason: string, supervisorPin: string) => {
    const saleToVoid = salesHistory.find((s) => s.id === saleId);
    if (!saleToVoid) return;

    setSalesHistory((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: 'ANULADA' as const } : s))
    );

    // If it was a credit sale, reverse the customer balance
    if (saleToVoid.isCreditSale && saleToVoid.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === saleToVoid.customerId
            ? { ...c, currentBalanceUsd: Math.max(0, Number((c.currentBalanceUsd - saleToVoid.totalUsd).toFixed(2))) }
            : c
        )
      );
    }

    // Restock all items back to inventory & log Kardex
    const voidKardex: KardexMovement[] = [];
    setProducts((prev) => {
      const updated = [...prev];
      saleToVoid.items.forEach((item) => {
        const idx = updated.findIndex((p) => p.id === item.product.id);
        if (idx > -1) {
          const prod = updated[idx];
          const prevStock = prod.stock;
          const newStock = Number((prevStock + item.quantity).toFixed(3));
          updated[idx] = { ...prod, stock: newStock };

          voidKardex.push({
            id: `kardex-void-${Date.now()}-${item.product.id}`,
            productId: prod.id,
            timestamp: new Date().toLocaleString('es-VE'),
            type: 'AJUSTE_POSITIVO',
            reference: `Anulación Factura #${saleToVoid.receiptNumber}`,
            quantity: item.quantity,
            previousStock: prevStock,
            resultingStock: newStock,
            unitCostUsd: prod.baseCostUsd || prod.priceUsd * 0.75,
            totalCostUsd: (prod.baseCostUsd || prod.priceUsd * 0.75) * item.quantity,
            responsible: supervisorPin ? `Sup. PIN ${supervisorPin}` : config.cashierName || 'Caja 1',
            notes: `Factura Anulada: ${reason}`,
          });
        }
      });
      return updated;
    });
    setKardexMovements((prev) => [...voidKardex, ...prev]);
  };

  // CxC Payment (Abono) Handler
  const handleAddCreditPayment = (payment: CreditPaymentRecord) => {
    setCreditPayments((prev) => [payment, ...prev]);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === payment.customerId
          ? {
              ...c,
              currentBalanceUsd: Math.max(0, Number((c.currentBalanceUsd - payment.amountUsd).toFixed(2))),
            }
          : c
      )
    );
  };

  // Add New Customer Handler
  const handleSaveNewCustomer = (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    setSelectedCustomerId(newCustomer.id);
    setIsCreditSale(true);
  };

  // Search Results for Cart Search Bar
  const searchResults =
    cartSearch.trim().length > 0
      ? products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(cartSearch.toLowerCase()) ||
              p.barcode.includes(cartSearch.trim()) ||
              (p.category && p.category.toLowerCase().includes(cartSearch.toLowerCase()))
          )
          .slice(0, 8)
      : [];

  const currentSelectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-900 text-slate-800 flex flex-col justify-between font-sans select-none">
      {/* ========================================================================= */}
      {/* NOTIFICATION TOAST */}
      {/* ========================================================================= */}
      {barcodeNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1b4e8c] text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce border-2 border-blue-300">
          <Barcode className="w-4 h-4 text-emerald-300" />
          <span>{barcodeNotification}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP SYSTEM WINDOW BAR (DESKTOP CHROME TITLE) */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#cbd5e1] border-b border-[#94a3b8] px-4 py-1 flex items-center justify-between text-xs text-slate-800 shrink-0 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1b4e8c]"></span>
          <span className="font-bold tracking-tight text-slate-900">
            Punto de Venta Sol v3.1 • Sistema de Facturación e Inventario
          </span>
          <span className="text-slate-500 font-mono text-[11px] ml-2">
            Terminal: {config.registerName} • Cajero: {config.cashierName}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
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
      {/* 2. MAIN HEADER BAR (NAVY BLUE BODEGA EL SOL) WITH BCV LOGO & ACTION ICONS */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#1b4e8c] text-white px-5 py-2 flex items-center justify-between gap-3 shadow-md shrink-0">
        {/* Left Title & Invoice Number */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white leading-tight">
              {config.storeName}
            </h1>
            <p className="text-[11px] text-blue-100 font-normal">
              {displayDate}
            </p>
          </div>

          {/* Prominent Current Invoice Number */}
          <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-blue-300/30 flex items-center gap-1.5 font-mono">
            <span className="text-[10px] uppercase font-bold text-blue-200">Factura N°:</span>
            <span className="font-black text-amber-300 text-sm">#{currentInvoiceNumber}</span>
          </div>
        </div>

        {/* Center: VISIBLE OFFICIAL BCV RATE WITH LOGO & AUTO-UPDATE */}
        <div className="flex items-center gap-2 bg-[#0e2c54]/90 px-3.5 py-1.5 rounded-xl border border-amber-400/40 shadow-inner">
          <BcvLogo className="w-7 h-7 shrink-0 drop-shadow-xs" />
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                Tasa Oficial BCV
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Tasa en vivo" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-white font-mono leading-none">
                Bs. {config.exchangeRate.toFixed(2)}
              </span>
              <span className="text-[10px] text-blue-200 font-mono">/ USD</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              syncBcvRate();
            }}
            title="Actualizar tasa desde https://bcv.today/api/rate.json"
            className="p-1 hover:bg-white/15 rounded-md text-blue-200 hover:text-white transition-colors cursor-pointer ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${bcvLoading ? 'animate-spin text-amber-300' : ''}`} />
          </button>
        </div>

        {/* Right: ACTION ICONS (Consultar CxC, Devoluciones, Anulación, Nuevo Cliente, Venta a Crédito) */}
        <div className="flex items-center gap-2">
          {/* Action 1: Consultar CxC */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsCxCModalOpen(true);
            }}
            title="Consultar Cuentas por Cobrar (CxC) & Créditos"
            className="px-2.5 py-1.5 bg-blue-900/80 hover:bg-blue-800 text-white rounded-lg border border-blue-400/30 flex items-center gap-1.5 text-xs font-bold transition-colors pos-btn cursor-pointer shadow-xs"
          >
            <CreditCard className="w-4 h-4 text-emerald-300" />
            <span className="hidden sm:inline">Consultar CxC</span>
          </button>

          {/* Action 2: Devoluciones */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsReturnsModalOpen(true);
            }}
            title="Procesar Devoluciones de Clientes"
            className="px-2.5 py-1.5 bg-blue-900/80 hover:bg-blue-800 text-white rounded-lg border border-blue-400/30 flex items-center gap-1.5 text-xs font-bold transition-colors pos-btn cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Devoluciones</span>
          </button>

          {/* Action 3: Anulación */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsVoidModalOpen(true);
            }}
            title="Anular Facturas Emitidas"
            className="px-2.5 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-white rounded-lg border border-rose-400/30 flex items-center gap-1.5 text-xs font-bold transition-colors pos-btn cursor-pointer shadow-xs"
          >
            <Ban className="w-4 h-4 text-rose-300" />
            <span className="hidden sm:inline">Anulación</span>
          </button>

          {/* Action 4: + Nuevo Cliente */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsAddCustomerModalOpen(true);
            }}
            title="Registrar Nuevo Cliente en el Sistema"
            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg border border-emerald-400/30 flex items-center gap-1.5 text-xs font-bold transition-colors pos-btn cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-emerald-200" />
            <span className="hidden sm:inline">+ Cliente</span>
          </button>

          {/* Action 5: TOGGLE VENTA A CRÉDITO */}
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg border border-blue-300/30 text-xs">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsCreditSale(!isCreditSale);
              }}
              className="flex items-center gap-1.5 font-bold cursor-pointer hover:text-amber-300 transition-colors"
            >
              {isCreditSale ? (
                <CheckSquare className="w-4 h-4 text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-300" />
              )}
              <span className={isCreditSale ? 'text-amber-300 font-black' : 'text-slate-100'}>
                Venta a Crédito
              </span>
            </button>

            {isCreditSale && (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="bg-white text-slate-900 text-[11px] font-bold py-0.5 px-2 rounded border-0 outline-hidden max-w-[140px] truncate"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (${Math.max(0, c.creditLimitUsd - c.currentBalanceUsd).toFixed(0)} disp.)
                  </option>
                ))}
              </select>
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
      {/* 3. MAIN BODY / CARRITO DE COMPRAS CARD WITH EMBEDDED INTELLIGENT SEARCH BAR */}
      {/* ========================================================================= */}
      <div className="px-5 py-2.5 bg-[#dce3ec] flex flex-col justify-start flex-1 overflow-hidden">
        <div className="w-full bg-white rounded-lg border border-[#c4d2e3] shadow-xs overflow-hidden flex flex-col flex-1">
          {/* Card Header: CARRITO DE COMPRAS + INTELLIGENT SEARCH BAR (Replaces + Agregar Producto) */}
          <div className="px-6 py-2.5 flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70">
            {/* Left Title */}
            <div className="flex items-center gap-3 shrink-0">
              <h2 className="text-xl font-black tracking-tight text-black uppercase">
                CARRITO DE COMPRAS
              </h2>
              <span className="px-2 py-0.5 bg-blue-100 text-[#1b4e8c] font-bold text-xs rounded-full font-mono">
                {cart.length} ítems
              </span>

              {isCreditSale && currentSelectedCustomer && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-xs rounded-md border border-amber-300 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Crédito a: {currentSelectedCustomer.name}</span>
                </span>
              )}
            </div>

            {/* Middle: EMBEDDED INTELLIGENT SEARCH BAR */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={cartSearch}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                onChange={(e) => setCartSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchResults.length > 0) {
                      handleSmartAddProduct(searchResults[0]);
                      setCartSearch('');
                    } else if (cartSearch.trim()) {
                      const matched = products.find(
                        (p) => p.barcode === cartSearch.trim() || p.barcode.endsWith(cartSearch.trim())
                      );
                      if (matched) {
                        handleSmartAddProduct(matched);
                        setCartSearch('');
                      }
                    }
                  }
                }}
                placeholder="Buscar por código de barras, nombre o categoría... (F2)"
                className="w-full bg-white text-slate-900 placeholder:text-slate-400 text-xs pl-9 pr-8 py-2 rounded-lg border-2 border-slate-300 shadow-2xs focus:outline-hidden focus:border-[#1b4e8c] font-medium"
              />
              {cartSearch && (
                <button
                  onClick={() => setCartSearch('')}
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
                        setCartSearch('');
                      }}
                      className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
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
                        <div className="text-[10px] text-blue-700 font-mono">
                          Bs. {(prod.priceUsd * config.exchangeRate).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearCart}
                title="Vaciar Carrito"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors pos-btn cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CABECERA DE TABLA CON PRIMERA COLUMNA "CÓDIGO" */}
          <div className="bg-[#edf2f8] px-6 py-2 border-b border-slate-300 flex items-center justify-between text-xs font-black text-slate-800 uppercase tracking-wider shrink-0">
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
          <div className="divide-y divide-slate-200 min-h-[220px] max-h-[380px] overflow-y-auto flex-1">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                <ShoppingBag className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                <p className="font-bold text-base text-slate-600">El carrito está vacío</p>
                <p className="text-xs text-slate-400">
                  Usa la barra de búsqueda superior o escanea un código de barras
                </p>
              </div>
            ) : (
              cart.map((item, index) => {
                const unitPrice = item.customPriceUsd ?? item.product.priceUsd;
                const lineSubtotal = item.overrideTotal ?? unitPrice * item.quantity;
                const lineTax = item.product.hasTax !== false ? lineSubtotal * config.ivaRate : 0;
                const priceBs = unitPrice * config.exchangeRate;
                const lineSubtotalBs = lineSubtotal * config.exchangeRate;
                const lineTaxBs = lineTax * config.exchangeRate;
                const umLabel =
                  item.unitOfMeasure || item.product.unitOfMeasure || (item.product.isWeighted ? 'KG' : 'UND');
                const isWeightedOrFractional =
                  item.product.isWeighted ||
                  item.product.allowsGrams ||
                  item.product.allowsMlFraction ||
                  item.product.unitOfMeasure === 'KG' ||
                  item.product.unitOfMeasure === 'LTS';

                return (
                  <div
                    key={index}
                    className="px-6 py-2 hover:bg-slate-50/90 transition-colors flex items-center justify-between gap-2 group"
                  >
                    {/* 1. PRIMERA COLUMNA: CÓDIGO */}
                    <div className="w-28 shrink-0">
                      <button
                        onClick={() => setSelectedKardexProduct(item.product)}
                        className="font-mono text-xs font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 px-2 py-0.5 rounded border border-slate-300 tracking-tight cursor-pointer transition-colors"
                        title="Clic para ver Ficha de Kardex"
                      >
                        {item.product.barcode}
                      </button>
                    </div>

                    {/* 2. DESCRIPCIÓN (Clean Text, clickable to change presentation) */}
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={() => {
                            if (
                              item.product.allowsSmallerUnit ||
                              (item.product.presentations && item.product.presentations.length > 0)
                            ) {
                              setSelectedFractionalProduct(item.product);
                            }
                          }}
                          className={`text-sm font-bold text-black ${
                            item.product.allowsSmallerUnit ||
                            (item.product.presentations && item.product.presentations.length > 0)
                              ? 'hover:text-[#1b4e8c] cursor-pointer hover:underline'
                              : ''
                          }`}
                        >
                          {item.product.name}
                        </span>
                        {item.product.hasTax === false && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                            EXENTO
                          </span>
                        )}
                      </div>
                      {item.selectedPresentationName && (
                        <div className="text-[11px] font-semibold text-[#1b4e8c]">
                          Presentación: {item.selectedPresentationName}
                        </div>
                      )}
                    </div>

                    {/* 3. UNIDAD DE MEDIDA (U.M.) */}
                    <div className="w-16 text-center">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {umLabel}
                      </span>
                    </div>

                    {/* 4. PRECIO USD / BS. */}
                    <div className="w-32 text-right">
                      <div className="text-sm font-bold text-black font-mono">
                        ${unitPrice.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        Bs. {priceBs.toFixed(2)}
                      </div>
                    </div>

                    {/* 5. CANTIDAD / PESO (FREE-FORM TEXT EDITABLE INPUT) */}
                    <div className="w-32 flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleStepQuantity(index, isWeightedOrFractional ? -0.1 : -1)}
                        className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 font-bold pos-btn cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.quantityInputStr ?? item.quantity.toString()}
                          onChange={(e) => handleUpdateQuantityString(index, e.target.value)}
                          className="w-16 px-1 py-0.5 text-center text-sm font-black text-black font-mono border-2 border-slate-300 rounded bg-white focus:border-[#1b4e8c] focus:outline-hidden"
                        />
                      </div>

                      <button
                        onClick={() => handleStepQuantity(index, isWeightedOrFractional ? 0.1 : 1)}
                        className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 font-bold pos-btn cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* 6. IVA (16%) */}
                    <div className="w-24 text-right">
                      <div className="text-xs font-semibold text-slate-700 font-mono">
                        ${lineTax.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Bs. {lineTaxBs.toFixed(2)}
                      </div>
                    </div>

                    {/* 7. SUBTOTAL */}
                    <div className="w-32 text-right">
                      <div className="text-base font-black text-black font-mono">
                        ${lineSubtotal.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-blue-900 font-bold font-mono">
                        Bs. {lineSubtotalBs.toFixed(2)}
                      </div>
                    </div>

                    {/* 8. ACTIONS */}
                    <div className="w-7 text-center">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-400 hover:text-red-600 transition-colors pos-btn cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM POS TOTALS & CHECKOUT PANEL (LOCKED IN 1 SINGLE ROW) */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#f8fafc] border-t-2 border-[#1b4e8c] shrink-0 shadow-lg">
        <div className="grid grid-cols-5 divide-x divide-[#cbd5e1] border-b border-[#cbd5e1]">
          {/* Box 1: SUBTOTAL USD */}
          <div className="py-2 px-3 flex flex-col justify-center items-center text-center bg-white/60">
            <span className="font-bold text-xs text-black tracking-tight uppercase">
              SUBTOTAL USD:
            </span>
            <div className="font-bold text-[24px] text-black leading-tight my-0.5 font-mono">
              ${subtotalUsd.toFixed(2)}
            </div>
            <div className="text-[10px] text-black leading-snug font-mono">
              <div>(Con. a Bs: {subtotalBs.toFixed(2)})</div>
              <div>Tasa {config.exchangeRate.toFixed(2)} Bs/USD</div>
            </div>
          </div>

          {/* Box 2: TOTAL IVA (16%) */}
          <div className="py-2 px-3 flex flex-col justify-center items-center text-center bg-white/60">
            <span className="font-bold text-xs text-black tracking-tight uppercase">
              TOTAL IVA ({Math.round(config.ivaRate * 100)}%):
            </span>
            <div className="font-bold text-[24px] text-black leading-tight my-0.5 font-mono">
              ${taxUsd.toFixed(2)}
            </div>
            <div className="text-[10px] text-black leading-snug font-mono">
              (Bs. {taxBs.toFixed(2)})
            </div>
          </div>

          {/* Box 3: TOTAL VENTA */}
          <div className="py-2 px-3 flex flex-col justify-center items-center text-center bg-white/60">
            <span className="font-bold text-xs text-black tracking-tight uppercase">
              TOTAL VENTA:
            </span>
            <div className="font-bold text-[24px] text-black leading-tight my-0.5 font-mono">
              ${totalUsd.toFixed(2)}
            </div>
            <div className="text-[10px] text-black leading-snug font-mono">
              (Bs. {totalBs.toFixed(2)})
            </div>
          </div>

          {/* Box 4: CAMBIO */}
          <div className="py-2 px-3 flex flex-col justify-center items-center text-center bg-white/60">
            <span className="font-bold text-xs text-black tracking-tight uppercase">
              CAMBIO:
            </span>
            <div className="font-bold text-[24px] text-black leading-tight my-0.5 font-mono">
              ${lastCambio.usd.toFixed(2)}
            </div>
            <div className="text-[10px] text-black leading-snug font-mono">
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
        onOpenKardex={(prod) => setSelectedKardexProduct(prod)}
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
          onOpenKardex={(prod) => setSelectedKardexProduct(prod)}
        />
      )}

      {/* Kardex Modal */}
      {selectedKardexProduct && (
        <KardexModal
          product={selectedKardexProduct}
          config={config}
          isOpen={!!selectedKardexProduct}
          onClose={() => setSelectedKardexProduct(null)}
          kardexMovements={kardexMovements}
          onAddKardexMovement={handleAddKardexMovement}
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
        onOpenCashCut={() => {
          setIsMenuOpen(false);
          setIsCashCutOpen(true);
        }}
      />

      {/* Cash Cut / Shift Closing Modal */}
      <CashCutModal
        isOpen={isCashCutOpen}
        onClose={() => setIsCashCutOpen(false)}
        config={config}
        salesHistory={salesHistory}
        onFinishShift={(report) => {
          setCashCutReports((prev) => [report, ...prev]);
        }}
      />

      {/* Customer Accounts & Credit Receivable (CxC) Modal */}
      <CustomerAccountsModal
        isOpen={isCxCModalOpen}
        onClose={() => setIsCxCModalOpen(false)}
        customers={customers}
        config={config}
        onAddPayment={handleAddCreditPayment}
        onOpenNewCustomer={() => {
          setIsCxCModalOpen(false);
          setIsAddCustomerModalOpen(true);
        }}
      />

      {/* Customer Returns Modal */}
      <CustomerReturnsModal
        isOpen={isReturnsModalOpen}
        onClose={() => setIsReturnsModalOpen(false)}
        salesHistory={salesHistory}
        config={config}
        onProcessReturn={handleProcessReturn}
      />

      {/* Invoice Void Modal */}
      <InvoiceVoidModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        salesHistory={salesHistory}
        config={config}
        onVoidSale={handleVoidSale}
      />

      {/* Add New Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onSaveCustomer={handleSaveNewCustomer}
      />
    </div>
  );
}
