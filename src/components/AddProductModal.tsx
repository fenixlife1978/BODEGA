import React, { useState } from 'react';
import { Product, PosConfig } from '../types/pos';
import { sound } from '../utils/sound';
import {
  X,
  Search,
  Plus,
  Package,
  Barcode,
  ShoppingBag,
  Tag,
  Scale,
  FileSpreadsheet
} from 'lucide-react';

interface AddProductModalProps {
  products: Product[];
  config: PosConfig;
  onClose: () => void;
  onAddProductToCart: (product: Product, quantity: number) => void;
  onAddNewProductToCatalog: (newProd: Product) => void;
  onOpenInventoryModal?: () => void;
  onOpenKardex?: (product: Product) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  products,
  config,
  onClose,
  onAddProductToCart,
  onAddNewProductToCatalog,
  onOpenInventoryModal,
  onOpenKardex,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New product state
  const [newName, setNewName] = useState('');
  const [newPriceUsd, setNewPriceUsd] = useState('');
  const [newPresentation, setNewPresentation] = useState('');
  const [newCategory, setNewCategory] = useState('Víveres');
  const [newUnitOfMeasure, setNewUnitOfMeasure] = useState('UND');
  const [newBarcode, setNewBarcode] = useState('');
  const [newIsWeighted, setNewIsWeighted] = useState(false);
  const [newHasTax, setNewHasTax] = useState(true);

  // Selected weighted product popup / weight entry
  const [weightModalProduct, setWeightModalProduct] = useState<Product | null>(null);
  const [selectedWeight, setSelectedWeight] = useState<string>('1.000');

  const categories = ['Todos', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((prod) => {
    const matchesCategory = selectedCategory === 'Todos' || prod.category === selectedCategory;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.barcode.includes(searchTerm) ||
      (prod.presentation && prod.presentation.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSelectProduct = (prod: Product) => {
    if (prod.isWeighted) {
      sound.playClick();
      setWeightModalProduct(prod);
      setSelectedWeight('1.000');
    } else {
      sound.playScan();
      onAddProductToCart(prod, 1);
    }
  };

  const handleConfirmWeight = () => {
    if (!weightModalProduct) return;
    const w = parseFloat(selectedWeight);
    if (isNaN(w) || w <= 0) {
      sound.playError();
      return;
    }
    sound.playScan();
    onAddProductToCart(weightModalProduct, w);
    setWeightModalProduct(null);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPriceUsd) {
      sound.playError();
      return;
    }

    const price = parseFloat(newPriceUsd);
    if (isNaN(price) || price <= 0) {
      sound.playError();
      return;
    }

    const newProd: Product = {
      id: 'prod-' + Date.now(),
      name: newName.trim(),
      priceUsd: price,
      presentation: newPresentation.trim() || (newIsWeighted ? 'Por Peso (Kg)' : undefined),
      unitOfMeasure: newIsWeighted ? 'KG' : newUnitOfMeasure,
      unitPriceNote: newIsWeighted ? `($${price.toFixed(2)} / Kg)` : '',
      barcode: newBarcode.trim() || Math.floor(7590000000000 + Math.random() * 9999999999).toString(),
      category: newCategory,
      stock: 50,
      imageUrl: '',
      hasTax: newHasTax,
      isWeighted: newIsWeighted,
      weightUnit: newIsWeighted ? 'Kg' : undefined,
    };

    onAddNewProductToCatalog(newProd);
    sound.playSuccess();
    if (newIsWeighted) {
      setWeightModalProduct(newProd);
      setSelectedWeight('1.000');
    } else {
      onAddProductToCart(newProd, 1);
    }
    setShowCreateForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-300">
        {/* Modal Header */}
        <div className="bg-[#1e4b85] text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Package className="w-6 h-6 text-white" />
            <div>
              <h2 className="font-black text-lg tracking-wide">CATÁLOGO DE PRODUCTOS - BODEGA EL SOL</h2>
              <p className="text-xs text-blue-200">Selecciona o busca un producto para añadirlo al carrito</p>
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

        {/* Top Search & Actions */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código de barras o presentación..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#1e4b85] focus:ring-1 focus:ring-[#1e4b85]"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {onOpenInventoryModal && (
              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                  onOpenInventoryModal();
                }}
                className="w-full md:w-auto px-3.5 py-2 bg-[#1e4b85] hover:bg-[#163f73] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 pos-btn shrink-0"
              >
                <Package className="w-4 h-4" />
                <span>Módulo de Inventario & Costos</span>
              </button>
            )}

            <button
              onClick={() => {
                sound.playClick();
                setShowCreateForm(!showCreateForm);
              }}
              className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 pos-btn shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showCreateForm ? 'Ver Catálogo' : '+ Crear Rápido'}</span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        {!showCreateForm && (
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  sound.playClick();
                  setSelectedCategory(cat);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#1e4b85] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-4 overflow-y-auto flex-1 max-h-[55vh]">
          {showCreateForm ? (
            /* Create Form */
            <form onSubmit={handleCreateProduct} className="max-w-xl mx-auto space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-300">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Tag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Registrar Nuevo Producto en Inventario</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Queso Paisa Rallado o Tomates"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio en USD ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ej: 5.50"
                    value={newPriceUsd}
                    onChange={(e) => setNewPriceUsd(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                  />
                  {newPriceUsd && !isNaN(parseFloat(newPriceUsd)) && (
                    <p className="text-[11px] text-blue-700 mt-1 font-semibold">
                      Eq: Bs. {(parseFloat(newPriceUsd) * config.exchangeRate).toFixed(2)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Presentación</label>
                  <input
                    type="text"
                    placeholder="Ej: (1 Kg), (500g) o (Unidad)"
                    value={newPresentation}
                    onChange={(e) => setNewPresentation(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                  >
                    <option value="Víveres">Víveres</option>
                    <option value="Charcutería">Charcutería</option>
                    <option value="Frutas y Verduras">Frutas y Verduras</option>
                    <option value="Carnicería">Carnicería</option>
                    <option value="Lácteos">Lácteos</option>
                    <option value="Granos">Granos</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Snacks y Dulces">Snacks y Dulces</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unidad de Medida (U.M.)</label>
                  <select
                    value={newIsWeighted ? 'KG' : newUnitOfMeasure}
                    disabled={newIsWeighted}
                    onChange={(e) => setNewUnitOfMeasure(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:border-[#1e4b85] bg-white disabled:bg-slate-100"
                  >
                    <option value="UND">UND (Unidad)</option>
                    <option value="KG">KG (Kilogramo)</option>
                    <option value="GR">GR (Gramo)</option>
                    <option value="PQTE">PQTE (Paquete)</option>
                    <option value="LTS">LTS (Litro)</option>
                    <option value="LATA">LATA (Lata)</option>
                    <option value="BOT">BOT (Botella)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código de Barras / SKU</label>
                  <input
                    type="text"
                    placeholder="Ej: 7591011000999"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:border-[#1e4b85]"
                  />
                </div>
              </div>

              {/* Weighted Checkbox */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-700" />
                  <div>
                    <span className="font-bold text-xs text-blue-950">Venta por Peso (Balanza / Decimales)</span>
                    <p className="text-[11px] text-blue-700">Habilita campo editable libre de cantidad (Kg/g en el carrito)</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newIsWeighted}
                  onChange={(e) => setNewIsWeighted(e.target.checked)}
                  className="w-4 h-4 text-[#1e4b85] rounded cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs pos-btn flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Guardar y Añadir al Carrito</span>
                </button>
              </div>
            </form>
          ) : (
            /* Products Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map((prod) => {
                const priceBs = prod.priceUsd * config.exchangeRate;
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod)}
                    className="p-3 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1e4b85] rounded-xl cursor-pointer transition-all duration-150 flex flex-col justify-between shadow-xs hover:shadow-md group pos-btn"
                  >
                    <div>
                      {/* Barcode & Category Badges */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                          {prod.barcode}
                        </span>
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {prod.category}
                        </span>
                      </div>

                      {/* Product Details */}
                      <div>
                        <div className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-[#1e4b85] flex items-center gap-1.5">
                          <span>{prod.name}</span>
                          {prod.isWeighted && (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                              Balanza
                            </span>
                          )}
                        </div>
                        {prod.presentation && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{prod.presentation}</div>
                        )}
                      </div>
                    </div>

                    {/* Price & Action Row */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-base font-black text-slate-900 font-mono">
                          ${prod.priceUsd.toFixed(2)}
                          {prod.isWeighted && <span className="text-xs font-normal text-slate-500">/Kg</span>}
                        </div>
                        <div className="text-[10px] font-semibold text-blue-700">
                          Bs. {priceBs.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onOpenKardex && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenKardex(prod);
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-300 rounded-lg shadow-2xs pos-btn cursor-pointer"
                            title="Ver Ficha de Kardex del Producto"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProduct(prod);
                          }}
                          className={`p-1.5 text-white rounded-lg shadow-xs pos-btn cursor-pointer ${prod.isWeighted ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#1e4b85] hover:bg-[#163f73]'}`}
                          title={prod.isWeighted ? 'Pesar / Ingresar Cantidad (Kg)' : 'Añadir 1 Unidad'}
                        >
                          {prod.isWeighted ? <Scale className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>{filteredProducts.length} productos disponibles</span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs pos-btn"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>

      {/* WEIGHT ENTRY POPUP MODAL */}
      {weightModalProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-300 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-amber-700">
                <Scale className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">Ingreso de Peso (Balanza)</h3>
              </div>
              <button
                onClick={() => setWeightModalProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="font-bold text-slate-900 text-base">{weightModalProduct.name}</p>
              <p className="text-xs text-slate-500">Precio: ${weightModalProduct.priceUsd.toFixed(2)} / Kg (Bs. {(weightModalProduct.priceUsd * config.exchangeRate).toFixed(2)})</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Peso / Cantidad en Kilogramos (Kg):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={selectedWeight}
                  onChange={(e) => setSelectedWeight(e.target.value)}
                  className="w-full px-4 py-2.5 text-2xl font-black font-mono text-center border-2 border-amber-500 rounded-lg focus:outline-hidden bg-amber-50/40"
                  autoFocus
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  Kg
                </span>
              </div>
            </div>

            {/* Quick Weight Presets */}
            <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
              {['0.250', '0.500', '0.750', '1.000', '1.500', '2.000', '2.500', '3.000'].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeight(w)}
                  className="py-1.5 px-1 bg-slate-100 hover:bg-amber-100 border border-slate-300 text-slate-800 rounded text-center pos-btn"
                >
                  {w} Kg
                </button>
              ))}
            </div>

            {/* Total Calculated for this weight */}
            {selectedWeight && !isNaN(parseFloat(selectedWeight)) && (
              <div className="p-2.5 bg-slate-50 rounded-lg border flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Subtotal Calculado:</span>
                <span className="font-black text-slate-900 text-base font-mono">
                  ${(parseFloat(selectedWeight) * weightModalProduct.priceUsd).toFixed(2)} USD
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setWeightModalProduct(null)}
                className="flex-1 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWeight}
                className="flex-1 py-2 px-3 bg-[#1e4b85] hover:bg-[#163f73] text-white font-bold rounded-lg text-xs pos-btn"
              >
                Añadir al Carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
