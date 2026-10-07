import React, { useState, useEffect } from 'react';
import { Product, ProductPresentation, ProductSupplier, PosConfig } from '../types/pos';
import { sound } from '../utils/sound';
import {
  X,
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  Barcode,
  Scale,
  Droplets,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Tag,
  DollarSign,
  TrendingUp,
  Percent,
  Truck,
  Building2,
  ShieldAlert,
  HelpCircle,
  Calculator
} from 'lucide-react';

interface InventoryManagementModalProps {
  products: Product[];
  config: PosConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

export const InventoryManagementModal: React.FC<InventoryManagementModalProps> = ({
  products,
  config,
  isOpen,
  onClose,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Form Basic Info
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Víveres');
  const [formUnitOfMeasure, setFormUnitOfMeasure] = useState('UND');
  const [formContentNominal, setFormContentNominal] = useState('1');
  const [formContentUnit, setFormContentUnit] = useState('uds');
  const [formStock, setFormStock] = useState('50');
  const [formStockMin, setFormStockMin] = useState('10');
  const [formHasTax, setFormHasTax] = useState(true);

  // Pricing & Financial Engine States
  const [formManualBaseCost, setFormManualBaseCost] = useState('1.50');
  const [formProfitMargin, setFormProfitMargin] = useState('30'); // %
  const [formAdditionalExpenses, setFormAdditionalExpenses] = useState('5'); // % (fletes, impuestos municipales)
  const [formPricingEngine, setFormPricingEngine] = useState<'markup_cost' | 'markup_sales' | 'gap_auto' | 'fixed_price'>('markup_cost');
  const [formFinalPriceUsd, setFormFinalPriceUsd] = useState('2.05');

  // Multi-Supplier List
  const [formSuppliers, setFormSuppliers] = useState<ProductSupplier[]>([]);
  const [newSupName, setNewSupName] = useState('');
  const [newSupCost, setNewSupCost] = useState('');
  const [newSupContact, setNewSupContact] = useState('');

  // Sub-unit & Fractional rules
  const [formAllowsSmallerUnit, setFormAllowsSmallerUnit] = useState(false);
  const [formUnitPriceUsd, setFormUnitPriceUsd] = useState('');
  const [formAllowsGrams, setFormAllowsGrams] = useState(false);
  const [formAllowsMlFraction, setFormAllowsMlFraction] = useState(false);

  // Additional Presentations list
  const [formPresentations, setFormPresentations] = useState<ProductPresentation[]>([]);
  const [newPresName, setNewPresName] = useState('');
  const [newPresUnit, setNewPresUnit] = useState('UND');
  const [newPresContent, setNewPresContent] = useState('1');
  const [newPresPrice, setNewPresPrice] = useState('');

  if (!isOpen) return null;

  const categories = ['Todos', ...Array.from(new Set(products.map((p) => p.category)))];

  // Dynamic Effective Cost: System ALWAYS takes the MAXIMUM cost among all associated suppliers
  const supplierCosts = formSuppliers.map((s) => s.costPriceUsd).filter((c) => !isNaN(c) && c > 0);
  const maxSupplierCost = supplierCosts.length > 0 ? Math.max(...supplierCosts) : 0;
  const effectiveCostUsd = supplierCosts.length > 0 ? maxSupplierCost : (parseFloat(formManualBaseCost) || 0);

  // Total Cost with Additional Expenses (Fletes, impuestos municipales)
  const expensesPct = parseFloat(formAdditionalExpenses) || 0;
  const costWithExpensesUsd = effectiveCostUsd * (1 + expensesPct / 100);

  // Automatically recalculate final price when parameters change (unless in fixed_price manual mode)
  useEffect(() => {
    const marginPct = parseFloat(formProfitMargin) || 0;

    if (formPricingEngine === 'markup_cost') {
      // Markup sobre Costo: CostoConGastos * (1 + Margen/100)
      const calculated = costWithExpensesUsd * (1 + marginPct / 100);
      setFormFinalPriceUsd(calculated > 0 ? calculated.toFixed(2) : '0.00');
    } else if (formPricingEngine === 'markup_sales') {
      // Margen sobre Venta: CostoConGastos / (1 - Margen/100)
      const denominator = 1 - marginPct / 100;
      const calculated = denominator > 0 ? costWithExpensesUsd / denominator : costWithExpensesUsd;
      setFormFinalPriceUsd(calculated > 0 ? calculated.toFixed(2) : '0.00');
    } else if (formPricingEngine === 'gap_auto') {
      // Brecha Automática (Margen optimizado + compensación de flete / 35% benchmark)
      const targetGap = Math.max(25, marginPct || 35);
      const calculated = costWithExpensesUsd * (1 + targetGap / 100);
      setFormFinalPriceUsd(calculated > 0 ? calculated.toFixed(2) : '0.00');
    }
    // In 'fixed_price', user edits formFinalPriceUsd directly
  }, [effectiveCostUsd, formAdditionalExpenses, formProfitMargin, formPricingEngine]);

  // When in fixed_price mode, compute real effective profit margin
  const finalPriceNum = parseFloat(formFinalPriceUsd) || 0;
  const realProfitMarginPct = costWithExpensesUsd > 0 ? ((finalPriceNum - costWithExpensesUsd) / costWithExpensesUsd) * 100 : 0;
  const realProfitUsd = finalPriceNum - costWithExpensesUsd;
  const finalPriceBs = finalPriceNum * config.exchangeRate;

  const filteredProducts = products.filter((prod) => {
    const matchesCategory = selectedCategory === 'Todos' || prod.category === selectedCategory;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.barcode.includes(searchTerm) ||
      (prod.description && prod.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleStartCreate = () => {
    sound.playClick();
    setEditingProduct(null);
    setIsCreatingNew(true);
    setFormBarcode(Math.floor(7590000000000 + Math.random() * 9999999999).toString());
    setFormName('');
    setFormDescription('');
    setFormCategory('Víveres');
    setFormUnitOfMeasure('UND');
    setFormContentNominal('1');
    setFormContentUnit('uds');
    setFormStock('50');
    setFormStockMin('10');
    setFormHasTax(true);
    setFormManualBaseCost('1.50');
    setFormProfitMargin('30');
    setFormAdditionalExpenses('5');
    setFormPricingEngine('markup_cost');
    setFormFinalPriceUsd('2.05');
    setFormSuppliers([]);
    setFormAllowsSmallerUnit(false);
    setFormUnitPriceUsd('');
    setFormAllowsGrams(false);
    setFormAllowsMlFraction(false);
    setFormPresentations([]);
  };

  const handleStartEdit = (prod: Product) => {
    sound.playClick();
    setEditingProduct(prod);
    setIsCreatingNew(true);
    setFormBarcode(prod.barcode);
    setFormName(prod.name);
    setFormDescription(prod.description || '');
    setFormCategory(prod.category);
    setFormUnitOfMeasure(prod.unitOfMeasure);
    setFormContentNominal(prod.contentNominal ? prod.contentNominal.toString() : '1');
    setFormContentUnit(prod.contentUnit || (prod.unitOfMeasure === 'KG' ? 'g' : prod.unitOfMeasure === 'LTS' ? 'ml' : 'uds'));
    setFormStock(prod.stock.toString());
    setFormStockMin(prod.stockMin ? prod.stockMin.toString() : '10');
    setFormHasTax(prod.hasTax);
    setFormManualBaseCost(prod.baseCostUsd ? prod.baseCostUsd.toString() : (prod.priceUsd * 0.75).toFixed(2));
    setFormProfitMargin(prod.profitMarginPercent ? prod.profitMarginPercent.toString() : '30');
    setFormAdditionalExpenses(prod.additionalExpensesPercent ? prod.additionalExpensesPercent.toString() : '5');
    setFormPricingEngine(prod.pricingEngine || 'fixed_price');
    setFormFinalPriceUsd(prod.priceUsd.toString());
    setFormSuppliers(prod.suppliers || []);
    setFormAllowsSmallerUnit(!!prod.allowsSmallerUnit);
    setFormUnitPriceUsd(prod.unitPriceUsd ? prod.unitPriceUsd.toString() : '');
    setFormAllowsGrams(!!prod.allowsGrams || prod.unitOfMeasure === 'KG');
    setFormAllowsMlFraction(!!prod.allowsMlFraction || prod.unitOfMeasure === 'LTS');
    setFormPresentations(prod.presentations || []);
  };

  // Add Supplier Handler
  const handleAddSupplier = () => {
    if (!newSupName.trim() || !newSupCost) return;
    const cost = parseFloat(newSupCost);
    if (isNaN(cost) || cost <= 0) return;

    const supplier: ProductSupplier = {
      id: 'sup-' + Date.now(),
      name: newSupName.trim(),
      costPriceUsd: cost,
      contactInfo: newSupContact.trim() || undefined,
    };

    setFormSuppliers([...formSuppliers, supplier]);
    setNewSupName('');
    setNewSupCost('');
    setNewSupContact('');
    sound.playClick();
  };

  const handleRemoveSupplier = (id: string) => {
    setFormSuppliers(formSuppliers.filter((s) => s.id !== id));
    sound.playClick();
  };

  // Add Presentation Handler
  const handleAddPresentation = () => {
    if (!newPresName.trim() || !newPresPrice) return;
    const price = parseFloat(newPresPrice);
    if (isNaN(price) || price <= 0) return;

    const pres: ProductPresentation = {
      id: 'pres-' + Date.now(),
      name: newPresName.trim(),
      unitOfMeasure: newPresUnit,
      contentAmount: parseFloat(newPresContent) || 1,
      contentUnit: newPresUnit.toLowerCase(),
      priceUsd: price,
    };

    setFormPresentations([...formPresentations, pres]);
    setNewPresName('');
    setNewPresPrice('');
    setNewPresContent('1');
    sound.playClick();
  };

  const handleRemovePresentation = (id: string) => {
    setFormPresentations(formPresentations.filter((p) => p.id !== id));
    sound.playClick();
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formFinalPriceUsd) {
      sound.playError();
      return;
    }

    const finalPrice = parseFloat(formFinalPriceUsd);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      sound.playError();
      return;
    }

    const isKg = formUnitOfMeasure === 'KG';
    const isLts = formUnitOfMeasure === 'LTS';

    const savedProduct: Product = {
      id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      barcode: formBarcode.trim() || Math.floor(7590000000000 + Math.random() * 9999999999).toString(),
      category: formCategory,
      unitOfMeasure: formUnitOfMeasure,
      contentNominal: parseFloat(formContentNominal) || 1,
      contentUnit: formContentUnit,
      priceUsd: finalPrice,
      baseCostUsd: effectiveCostUsd,
      profitMarginPercent: parseFloat(formProfitMargin) || 0,
      additionalExpensesPercent: parseFloat(formAdditionalExpenses) || 0,
      pricingEngine: formPricingEngine,
      suppliers: formSuppliers,
      stock: parseInt(formStock, 10) || 50,
      stockMin: parseInt(formStockMin, 10) || 10,
      imageUrl: editingProduct ? editingProduct.imageUrl : '',
      hasTax: formHasTax,
      allowsSmallerUnit: formAllowsSmallerUnit,
      unitPriceUsd: formAllowsSmallerUnit && formUnitPriceUsd ? parseFloat(formUnitPriceUsd) : undefined,
      allowsGrams: isKg ? true : formAllowsGrams,
      allowsMlFraction: isLts ? true : formAllowsMlFraction,
      isWeighted: isKg || formAllowsGrams,
      weightUnit: isKg ? 'Kg' : undefined,
      presentations: formPresentations,
      presentation: isKg ? 'Por Peso (Kg)' : isLts ? '1 Litro' : formUnitOfMeasure === 'PQTE' ? 'Paquete' : undefined,
      unitPriceNote: formAllowsSmallerUnit && formUnitPriceUsd ? `($${parseFloat(formUnitPriceUsd).toFixed(2)} c/u)` : undefined,
    };

    onSaveProduct(savedProduct);
    sound.playSuccess();
    setSavedSuccessMsg(`Producto "${savedProduct.name}" guardado exitosamente.`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
    setIsCreatingNew(false);
    setEditingProduct(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[95vh] border border-slate-300">
        
        {/* Header */}
        <div className="bg-[#1b4e8c] text-white px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Package className="w-6 h-6 text-blue-200" />
            <div>
              <h2 className="font-black text-lg tracking-wide">MÓDULO DE INVENTARIO, COSTOS Y PROVEEDORES</h2>
              <p className="text-xs text-blue-200">Motor de fijación de precios, múltiples proveedores (costeo máximo) y control de stock</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 hover:bg-white/20 rounded-md transition-colors text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success Alert */}
        {savedSuccessMsg && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-bold flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedSuccessMsg}</span>
          </div>
        )}

        {/* Action / Search Bar */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código de barras, nombre, proveedor o categoría..."
              className="w-full pl-9 pr-4 py-2 bg-white text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#1b4e8c]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isCreatingNew ? (
              <button
                onClick={handleStartCreate}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm pos-btn cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Registrar Nuevo Producto</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  sound.playClick();
                  setIsCreatingNew(false);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 pos-btn cursor-pointer"
              >
                <span>← Volver al Listado</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          {isCreatingNew ? (
            /* ===================================================================== */
            /* COMPLETE ADVANCED PRODUCT CREATION / EDITING FORM */
            /* ===================================================================== */
            <form onSubmit={handleSubmitForm} className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-slate-300 shadow-sm space-y-6">
              
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-[#1b4e8c]">
                  <Tag className="w-5 h-5" />
                  <h3 className="font-black text-slate-900 text-base">
                    {editingProduct ? `Editar Producto: ${editingProduct.name}` : 'Crear Nuevo Producto en Inventario'}
                  </h3>
                </div>
                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                  Tasa del Sistema: {config.exchangeRate.toFixed(2)} Bs / USD
                </span>
              </div>

              {/* 1. INFORMACIÓN BÁSICA DEL PRODUCTO */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">1. Datos Principales</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Barcode input (supports physical scanner) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Código de Barras *
                    </label>
                    <div className="relative">
                      <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formBarcode}
                        onChange={(e) => setFormBarcode(e.target.value)}
                        placeholder="Pistolea o escribe código"
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold border-2 border-slate-300 rounded-lg focus:border-[#1b4e8c] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ej: Harina PAN 1Kg, Aceite Mazeite 1L..."
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:border-[#1b4e8c] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Description & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">Descripción (Opcional)</label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Detalles adicionales, marca, procedencia..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Categoría</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Víveres">Víveres</option>
                      <option value="Lácteos">Lácteos</option>
                      <option value="Granos">Granos</option>
                      <option value="Charcutería">Charcutería</option>
                      <option value="Carnicería">Carnicería</option>
                      <option value="Frutas y Verduras">Frutas y Verduras</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Limpieza">Limpieza</option>
                      <option value="Snacks y Dulces">Snacks y Dulces</option>
                    </select>
                  </div>
                </div>

                {/* Unit of measure, nominal content & stocks */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">U.M. Original</label>
                    <select
                      value={formUnitOfMeasure}
                      onChange={(e) => {
                        const u = e.target.value;
                        setFormUnitOfMeasure(u);
                        if (u === 'KG') setFormAllowsGrams(true);
                        if (u === 'LTS') setFormAllowsMlFraction(true);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-[#1b4e8c]"
                    >
                      <option value="UND">UND (Unidad)</option>
                      <option value="KG">KG (Kilogramo / Peso)</option>
                      <option value="LTS">LTS (Litros / Líquido)</option>
                      <option value="PQTE">PQTE (Paquete)</option>
                      <option value="CAJA">CAJA (Caja)</option>
                      <option value="LATA">LATA (Lata)</option>
                      <option value="BOT">BOT (Botella)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contenido Nominal</label>
                    <input
                      type="text"
                      value={formContentNominal}
                      onChange={(e) => setFormContentNominal(e.target.value)}
                      placeholder="1, 1000, 3..."
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Stock Actual</label>
                    <input
                      type="text"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-center border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Stock Mínimo</span>
                    </label>
                    <input
                      type="text"
                      value={formStockMin}
                      onChange={(e) => setFormStockMin(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-center border border-amber-300 rounded bg-amber-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* 2. PROVEEDORES ASOCIADOS & COSTEO MÁXIMO */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#1b4e8c]" />
                    <span>2. Proveedores Asociados (Regla de Costo Máximo)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 italic">
                    El sistema siempre toma el precio de costo MÁXIMO para los cálculos
                  </span>
                </div>

                {/* Add Supplier sub-form */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-100 p-3 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    placeholder="Nombre del Proveedor (ej. Polar, Los Andes)"
                    value={newSupName}
                    onChange={(e) => setNewSupName(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-1.5 text-xs border rounded bg-white font-medium"
                  />
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                    <input
                      type="text"
                      placeholder="Costo USD (ej. 1.80)"
                      value={newSupCost}
                      onChange={(e) => setNewSupCost(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 text-xs font-mono font-bold border rounded bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSupplier}
                    className="px-3 py-1.5 bg-[#1b4e8c] hover:bg-[#153e6d] text-white text-xs font-bold rounded pos-btn flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Proveedor</span>
                  </button>
                </div>

                {/* List of associated suppliers */}
                {formSuppliers.length > 0 ? (
                  <div className="space-y-1.5">
                    {formSuppliers.map((sup) => {
                      const isMax = sup.costPriceUsd === maxSupplierCost;
                      return (
                        <div
                          key={sup.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                            isMax ? 'bg-amber-50/80 border-amber-300 font-semibold' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-900">{sup.name}</span>
                            {isMax && (
                              <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">
                                COSTO MÁXIMO ACTIVO
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              ${sup.costPriceUsd.toFixed(2)} USD
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSupplier(sup.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Manual cost input if no suppliers attached */
                  <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Costo Base Manual Directo (Sin proveedores registrados):</span>
                      <span className="text-[11px] text-slate-500">Puedes ingresar el costo manual o agregar proveedores arriba.</span>
                    </div>
                    <div className="w-32 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                      <input
                        type="text"
                        value={formManualBaseCost}
                        onChange={(e) => setFormManualBaseCost(e.target.value)}
                        className="w-full pl-6 pr-2 py-1 text-xs font-mono font-bold border rounded bg-white text-right"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. MOTOR DE VENTA, MARGEN, GASTOS & PRECIO FINAL */}
              <div className="space-y-4 border-t pt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-[#1b4e8c]" />
                  <span>3. Motor Financiero de Venta & Fijación de Precios</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Additional Expenses (%) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Gastos Adicionales (%):</span>
                      <span className="text-[10px] text-slate-400">Flete, tasas mun.</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formAdditionalExpenses}
                        onChange={(e) => setFormAdditionalExpenses(e.target.value)}
                        placeholder="5"
                        className="w-full pl-3 pr-7 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded bg-white"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                      Costo + Gastos: ${costWithExpensesUsd.toFixed(2)}
                    </span>
                  </div>

                  {/* Profit Margin (%) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Margen de Ganancia (%):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formProfitMargin}
                        onChange={(e) => setFormProfitMargin(e.target.value)}
                        placeholder="30"
                        className="w-full pl-3 pr-7 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded bg-white"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block font-mono">
                      Ganancia Est.: +${realProfitUsd.toFixed(2)} USD
                    </span>
                  </div>

                  {/* Pricing Engine Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Motor de Fijación de Venta:
                    </label>
                    <select
                      value={formPricingEngine}
                      onChange={(e) => setFormPricingEngine(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-[#1b4e8c]"
                    >
                      <option value="markup_cost">Markup sobre Costo (Tradicional)</option>
                      <option value="markup_sales">Margen sobre Venta (Gross Margin)</option>
                      <option value="gap_auto">Sistema de Brecha Automático</option>
                      <option value="fixed_price">Precio Fijo Libre Editable</option>
                    </select>
                  </div>
                </div>

                {/* Final Selling Price Display / Free Edit Box */}
                <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      PRECIO FINAL DE VENTA AL PÚBLICO:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-xl">$</span>
                        <input
                          type="text"
                          value={formFinalPriceUsd}
                          onChange={(e) => {
                            setFormFinalPriceUsd(e.target.value);
                            if (formPricingEngine !== 'fixed_price') {
                              setFormPricingEngine('fixed_price');
                            }
                          }}
                          className="pl-8 pr-3 py-1.5 text-2xl font-black font-mono bg-slate-800 text-emerald-400 border border-slate-700 rounded-lg focus:outline-hidden focus:border-emerald-400 w-44"
                          placeholder="0.00"
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-mono">USD</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                      Equivalente en Bolívares (Bs.):
                    </span>
                    <div className="text-2xl font-black font-mono text-blue-300 mt-1">
                      Bs. {finalPriceBs.toFixed(2)}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Margen real obtenido: {realProfitMarginPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. PRESENTACIONES ADICIONALES Y REGLAS FRACCIONADAS */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#1b4e8c]" />
                  <span>4. Opciones de Presentación & Fraccionamiento</span>
                </h4>

                {/* Sub-unit */}
                <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="checkSmallerUnit"
                      checked={formAllowsSmallerUnit}
                      onChange={(e) => setFormAllowsSmallerUnit(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-[#1b4e8c] rounded cursor-pointer"
                    />
                    <label htmlFor="checkSmallerUnit" className="cursor-pointer">
                      <span className="font-bold text-xs text-slate-900 block">Acepta venta por unidad más pequeña / individual</span>
                      <span className="text-[11px] text-slate-600">Para cajas/paquetes que pueden despachar unidades sueltas con precio separado.</span>
                    </label>
                  </div>

                  {formAllowsSmallerUnit && (
                    <div className="w-full sm:w-44 shrink-0">
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Precio Unidad Suelta (USD):</label>
                      <input
                        type="text"
                        value={formUnitPriceUsd}
                        onChange={(e) => setFormUnitPriceUsd(e.target.value)}
                        placeholder="0.90"
                        className="w-full px-2 py-1 text-xs font-bold font-mono border rounded bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Grams & ml checks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="checkGrams"
                      checked={formAllowsGrams || formUnitOfMeasure === 'KG'}
                      onChange={(e) => setFormAllowsGrams(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <label htmlFor="checkGrams" className="cursor-pointer">
                      <span className="font-bold text-xs text-slate-900 block">Venta por Gramos (Gms / Balanza)</span>
                      <span className="text-[11px] text-slate-600">Permite teclear gramos directos o compuesto Kg+g.</span>
                    </label>
                  </div>

                  <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-200 flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="checkMl"
                      checked={formAllowsMlFraction || formUnitOfMeasure === 'LTS'}
                      onChange={(e) => setFormAllowsMlFraction(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-teal-600 rounded cursor-pointer"
                    />
                    <label htmlFor="checkMl" className="cursor-pointer">
                      <span className="font-bold text-xs text-slate-900 block">Venta por ml / Monto en Bs.</span>
                      <span className="text-[11px] text-slate-600">Despacho de líquidos por ml o presupuesto en Bs.</span>
                    </label>
                  </div>
                </div>

                {/* Custom Presentations */}
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-xs text-slate-800 block">Agregar Otras Presentaciones con Precio Individual:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Nombre (ej. Pack x6)"
                      value={newPresName}
                      onChange={(e) => setNewPresName(e.target.value)}
                      className="px-2.5 py-1 text-xs border rounded bg-white"
                    />
                    <select
                      value={newPresUnit}
                      onChange={(e) => setNewPresUnit(e.target.value)}
                      className="px-2 py-1 text-xs border rounded bg-white font-semibold"
                    >
                      <option value="UND">UND</option>
                      <option value="PQTE">PQTE</option>
                      <option value="CAJA">CAJA</option>
                      <option value="KG">KG</option>
                      <option value="LTS">LTS</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Precio USD ($)"
                      value={newPresPrice}
                      onChange={(e) => setNewPresPrice(e.target.value)}
                      className="px-2.5 py-1 text-xs font-mono font-bold border rounded bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddPresentation}
                      className="px-3 py-1 bg-[#1b4e8c] hover:bg-[#153e6d] text-white text-xs font-bold rounded pos-btn"
                    >
                      + Agregar
                    </button>
                  </div>

                  {formPresentations.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {formPresentations.map((pres) => (
                        <div key={pres.id} className="flex items-center justify-between px-3 py-1 bg-white border border-slate-200 rounded text-xs">
                          <span className="font-bold">{pres.name} ({pres.unitOfMeasure})</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-blue-900">${pres.priceUsd.toFixed(2)} USD</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePresentation(pres.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tax Checkbox */}
              <div className="flex items-center gap-2 border-t pt-3">
                <input
                  type="checkbox"
                  id="taxCheck"
                  checked={formHasTax}
                  onChange={(e) => setFormHasTax(e.target.checked)}
                  className="w-4 h-4 text-[#1b4e8c] rounded cursor-pointer"
                />
                <label htmlFor="taxCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Aplica IVA ({Math.round(config.ivaRate * 100)}%)
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-[#1b4e8c] hover:bg-[#153e6d] text-white font-bold rounded-lg text-xs pos-btn flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Producto en Inventario</span>
                </button>
              </div>
            </form>
          ) : (
            /* ===================================================================== */
            /* INVENTORY PRODUCTS TABLE WITH STOCK ALERTS & COSTING PREVIEWS */
            /* ===================================================================== */
            <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#edf2f8] border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">CÓDIGO</th>
                    <th className="px-3.5 py-2.5">PRODUCTO</th>
                    <th className="px-3.5 py-2.5 text-center">U.M.</th>
                    <th className="px-3.5 py-2.5 text-right">COSTO MÁX.</th>
                    <th className="px-3.5 py-2.5 text-right">PRECIO USD</th>
                    <th className="px-3.5 py-2.5 text-right">PRECIO BS.</th>
                    <th className="px-3.5 py-2.5 text-center">PROVEEDORES</th>
                    <th className="px-3.5 py-2.5 text-center">STOCK (MIN)</th>
                    <th className="px-3.5 py-2.5 text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.map((prod) => {
                    const priceBs = prod.priceUsd * config.exchangeRate;
                    const isLowStock = prod.stockMin !== undefined && prod.stock <= prod.stockMin;
                    const supCount = prod.suppliers ? prod.suppliers.length : 0;
                    const maxCost = prod.baseCostUsd || (prod.suppliers && prod.suppliers.length > 0 ? Math.max(...prod.suppliers.map(s => s.costPriceUsd)) : prod.priceUsd * 0.7);

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-600">
                          {prod.barcode}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-slate-900 text-sm">{prod.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {prod.category} {prod.presentation ? `• ${prod.presentation}` : ''}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold font-mono text-[10px]">
                            {prod.unitOfMeasure}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-600">
                          ${maxCost.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-black font-mono text-sm text-slate-900">
                          ${prod.priceUsd.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-semibold font-mono text-blue-900">
                          Bs. {priceBs.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${supCount > 0 ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'text-slate-400'}`}>
                            {supCount > 0 ? `${supCount} prov.` : 'Directo'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono">
                          {isLowStock ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded font-bold text-[10px]" title="Stock al límite o por debajo del mínimo">
                              ⚠️ {prod.stock} / {prod.stockMin || 10}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800">
                              {prod.stock} (Mín: {prod.stockMin || 10})
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(prod)}
                              className="p-1.5 hover:bg-blue-100 text-blue-800 rounded transition-colors"
                              title="Editar producto y costos"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                sound.playClick();
                                onDeleteProduct(prod.id);
                              }}
                              className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600 shrink-0">
          <span>{products.length} productos en inventario</span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg pos-btn cursor-pointer"
          >
            Cerrar Módulo
          </button>
        </div>
      </div>
    </div>
  );
};
