import React, { useState } from 'react';
import { Product, KardexMovement, PosConfig } from '../types/pos';
import { sound } from '../utils/sound';
import {
  X,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Printer,
  Calendar,
  Layers,
  Building2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Package,
  DollarSign
} from 'lucide-react';

interface KardexModalProps {
  product: Product;
  config: PosConfig;
  isOpen: boolean;
  onClose: () => void;
  kardexMovements: KardexMovement[];
  onAddKardexMovement: (movement: KardexMovement, updatedProductStock: number) => void;
}

export const KardexModal: React.FC<KardexModalProps> = ({
  product,
  config,
  isOpen,
  onClose,
  kardexMovements,
  onAddKardexMovement,
}) => {
  const [filterType, setFilterType] = useState<string>('TODOS');
  const [showAddMovementForm, setShowAddMovementForm] = useState(false);

  // New movement form fields
  const [movType, setMovType] = useState<'ENTRADA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'MERMA' | 'DEVOLUCION'>('ENTRADA');
  const [movRef, setMovRef] = useState('');
  const [movQty, setMovQty] = useState('');
  const [movCostUsd, setMovCostUsd] = useState(
    product.baseCostUsd ? product.baseCostUsd.toString() : (product.priceUsd * 0.75).toFixed(2)
  );
  const [movResponsible, setMovResponsible] = useState(config.cashierName || 'Administrador');
  const [movNotes, setMovNotes] = useState('');

  if (!isOpen) return null;

  const exchangeRate = config?.exchangeRate || 42.00;

  // Filter movements for this product
  const productMovements = (kardexMovements || []).filter((m) => m.productId === product.id);

  // If no movements exist for this product yet, generate initial sample ledger
  const effectiveMovements: KardexMovement[] = productMovements.length > 0 ? productMovements : [
    {
      id: 'kardex-init-' + product.id,
      productId: product.id,
      timestamp: '01/10/2026, 08:00 AM',
      type: 'ENTRADA',
      reference: 'Inventario Inicial Apertura',
      quantity: product.stock + 15,
      previousStock: 0,
      resultingStock: product.stock + 15,
      unitCostUsd: product.baseCostUsd || (product.priceUsd * 0.75),
      totalCostUsd: (product.baseCostUsd || (product.priceUsd * 0.75)) * (product.stock + 15),
      responsible: 'Sistema / Auditoría',
      notes: 'Carga inicial de inventario',
    },
    {
      id: 'kardex-sale1-' + product.id,
      productId: product.id,
      timestamp: '05/10/2026, 02:30 PM',
      type: 'VENTA',
      reference: 'Factura POS #1008',
      quantity: 10,
      previousStock: product.stock + 15,
      resultingStock: product.stock + 5,
      unitCostUsd: product.baseCostUsd || (product.priceUsd * 0.75),
      totalCostUsd: (product.baseCostUsd || (product.priceUsd * 0.75)) * 10,
      responsible: config.cashierName || 'Caja 1',
      notes: 'Venta despachada por punto de venta',
    },
    {
      id: 'kardex-sale2-' + product.id,
      productId: product.id,
      timestamp: '07/10/2026, 10:15 AM',
      type: 'VENTA',
      reference: 'Factura POS #1024',
      quantity: 5,
      previousStock: product.stock + 5,
      resultingStock: product.stock,
      unitCostUsd: product.baseCostUsd || (product.priceUsd * 0.75),
      totalCostUsd: (product.baseCostUsd || (product.priceUsd * 0.75)) * 5,
      responsible: config.cashierName || 'Caja 1',
      notes: 'Venta registrada en turno actual',
    }
  ];

  const filteredMovements = effectiveMovements.filter((m) => {
    if (filterType === 'TODOS') return true;
    if (filterType === 'ENTRADAS') return m.type === 'ENTRADA' || m.type === 'AJUSTE_POSITIVO' || m.type === 'DEVOLUCION';
    if (filterType === 'SALIDAS') return m.type === 'VENTA' || m.type === 'AJUSTE_NEGATIVO' || m.type === 'MERMA';
    return m.type === filterType;
  });

  // Calculate totals
  const totalEntries = effectiveMovements
    .filter((m) => m.type === 'ENTRADA' || m.type === 'AJUSTE_POSITIVO' || m.type === 'DEVOLUCION')
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalExits = effectiveMovements
    .filter((m) => m.type === 'VENTA' || m.type === 'AJUSTE_NEGATIVO' || m.type === 'MERMA')
    .reduce((sum, m) => sum + m.quantity, 0);

  const unitCostEffective = product.baseCostUsd || (product.priceUsd * 0.75);
  const totalValuationUsd = product.stock * unitCostEffective;
  const totalValuationBs = totalValuationUsd * exchangeRate;

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseFloat(movQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      sound.playError();
      return;
    }

    const costNum = parseFloat(movCostUsd) || unitCostEffective;
    const isIncrement = movType === 'ENTRADA' || movType === 'AJUSTE_POSITIVO' || movType === 'DEVOLUCION';
    const previousStock = product.stock;
    const newStock = isIncrement ? previousStock + qtyNum : Math.max(0, previousStock - qtyNum);

    const now = new Date();
    const formattedTimestamp = now.toLocaleString('es-VE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const newMov: KardexMovement = {
      id: 'kardex-' + Date.now(),
      productId: product.id,
      timestamp: formattedTimestamp,
      type: movType,
      reference: movRef.trim() || (isIncrement ? 'Recepción de Mercancía' : 'Ajuste de Salida'),
      quantity: qtyNum,
      previousStock,
      resultingStock: newStock,
      unitCostUsd: costNum,
      totalCostUsd: costNum * qtyNum,
      responsible: movResponsible.trim() || config.cashierName || 'Cajero',
      notes: movNotes.trim() || undefined,
    };

    sound.playSuccess();
    onAddKardexMovement(newMov, newStock);
    setShowAddMovementForm(false);
    setMovQty('');
    setMovRef('');
    setMovNotes('');
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[95vh] border border-slate-300">
        
        {/* Header */}
        <div className="bg-[#1b4e8c] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg tracking-tight">FICHA DE KARDEX DE INVENTARIO</h2>
                <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded text-blue-100 font-bold">
                  {product.barcode}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Producto: <strong className="text-white">{product.name}</strong> • Categoría: {product.category} • U.M.: {product.unitOfMeasure}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                window.print();
              }}
              className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-1.5 text-xs font-bold pos-btn cursor-pointer"
              title="Imprimir Ficha de Kardex"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir Ficha</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Top KPI Cards (Summary of Stocks & Valuation) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
          
          {/* Card 1: Stock Actual */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Stock Actual</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {product.stock}{' '}
              <span className="text-xs font-semibold text-slate-500 font-sans">{product.unitOfMeasure}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Mínimo: {product.stockMin || 10} {product.unitOfMeasure}
            </div>
          </div>

          {/* Card 2: Total Entradas */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Total Entradas</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
              +{totalEntries}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Compras y Ajustes (+)</div>
          </div>

          {/* Card 3: Total Salidas */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Total Salidas</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-800 font-mono mt-0.5">
              -{totalExits}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Ventas POS & Mermas</div>
          </div>

          {/* Card 4: Costo de Reposición */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Costo Unitario</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              ${unitCostEffective.toFixed(2)}
            </div>
            <div className="text-[10px] text-blue-700 font-mono">
              Bs. {(unitCostEffective * exchangeRate).toFixed(2)}
            </div>
          </div>

          {/* Card 5: Valuación Total */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Valuación Stock</span>
            <div className="text-2xl font-black text-indigo-900 font-mono mt-0.5">
              ${totalValuationUsd.toFixed(2)}
            </div>
            <div className="text-[10px] text-indigo-600 font-mono">
              Bs. {totalValuationBs.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          {/* Movement Type Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
            {['TODOS', 'ENTRADAS', 'SALIDAS', 'VENTA', 'AJUSTE_POSITIVO', 'MERMA'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  sound.playClick();
                  setFilterType(tab);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  filterType === tab
                    ? 'bg-[#1b4e8c] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab === 'TODOS'
                  ? 'Todos los Movimientos'
                  : tab === 'ENTRADAS'
                  ? 'Entradas (+)'
                  : tab === 'SALIDAS'
                  ? 'Salidas (-)'
                  : tab === 'VENTA'
                  ? 'Ventas POS'
                  : tab === 'AJUSTE_POSITIVO'
                  ? 'Ajustes (+)'
                  : 'Mermas'}
              </button>
            ))}
          </div>

          {/* Action Button: Add Movement */}
          <button
            onClick={() => {
              sound.playClick();
              setShowAddMovementForm(!showAddMovementForm);
            }}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-2xs pos-btn cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddMovementForm ? 'Cerrar Formulario' : '+ Registrar Movimiento Manual'}</span>
          </button>
        </div>

        {/* Form to Register Manual Kardex Movement */}
        {showAddMovementForm && (
          <form onSubmit={handleSaveMovement} className="p-4 bg-emerald-50/60 border-b border-emerald-200 animate-fade-in shrink-0 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-emerald-200">
              <span className="font-bold text-xs text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-emerald-700" />
                <span>Nuevo Movimiento de Kardex (Afecta Stock en Tiempo Real)</span>
              </span>
              <span className="text-[11px] text-emerald-800">
                Stock actual: <strong>{product.stock} {product.unitOfMeasure}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Tipo de Movimiento *</label>
                <select
                  value={movType}
                  onChange={(e) => setMovType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ENTRADA">Entrada / Compra a Proveedor (+)</option>
                  <option value="AJUSTE_POSITIVO">Ajuste Positivo (+)</option>
                  <option value="DEVOLUCION">Devolución de Cliente (+)</option>
                  <option value="AJUSTE_NEGATIVO">Ajuste Negativo (-)</option>
                  <option value="MERMA">Merma / Pérdida / Daño (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Doc. Referencia / Factura *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Factura #5521, OC-88, Conteo"
                  value={movRef}
                  onChange={(e) => setMovRef(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Cantidad ({product.unitOfMeasure}) *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. 25 o 0.500"
                  value={movQty}
                  onChange={(e) => setMovQty(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border-2 border-emerald-400 rounded-lg bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Costo Unitario USD ($)</label>
                <input
                  type="text"
                  value={movCostUsd}
                  onChange={(e) => setMovCostUsd(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Responsable</label>
                <input
                  type="text"
                  value={movResponsible}
                  onChange={(e) => setMovResponsible(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">Notas / Observaciones</label>
                <input
                  type="text"
                  placeholder="Detalles sobre el lote, proveedor o motivo del ajuste..."
                  value={movNotes}
                  onChange={(e) => setMovNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddMovementForm(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm pos-btn cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aplicar y Actualizar Stock</span>
              </button>
            </div>
          </form>
        )}

        {/* Kardex Ledger Table */}
        <div className="p-4 overflow-y-auto flex-1 max-h-[60vh]">
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#edf2f8] border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">FECHA / HORA</th>
                  <th className="px-3.5 py-2.5">TIPO</th>
                  <th className="px-3.5 py-2.5">DOCUMENTO / REFERENCIA</th>
                  <th className="px-3.5 py-2.5">RESPONSABLE</th>
                  <th className="px-3.5 py-2.5 text-right">COSTO U. ($)</th>
                  <th className="px-3.5 py-2.5 text-center text-emerald-800">ENTRADA (+)</th>
                  <th className="px-3.5 py-2.5 text-center text-blue-800">SALIDA (-)</th>
                  <th className="px-3.5 py-2.5 text-center font-bold">SALDO</th>
                  <th className="px-3.5 py-2.5 text-right">VALOR TOTAL ($ / Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <span className="font-bold text-sm block text-slate-600">No hay movimientos registrados para este filtro</span>
                      <span className="text-xs">Usa el botón "+ Registrar Movimiento Manual" para registrar compras o ajustes</span>
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => {
                    const isEntry = mov.type === 'ENTRADA' || mov.type === 'AJUSTE_POSITIVO' || mov.type === 'DEVOLUCION';
                    const isExit = mov.type === 'VENTA' || mov.type === 'AJUSTE_NEGATIVO' || mov.type === 'MERMA';
                    const totalValuationMovUsd = mov.resultingStock * mov.unitCostUsd;
                    const totalValuationMovBs = totalValuationMovUsd * exchangeRate;

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                        {/* 1. Fecha */}
                        <td className="px-3.5 py-2.5 font-mono text-slate-600 font-medium whitespace-nowrap">
                          {mov.timestamp}
                        </td>

                        {/* 2. Tipo */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono tracking-wide ${
                              mov.type === 'ENTRADA'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : mov.type === 'VENTA'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : mov.type === 'AJUSTE_POSITIVO'
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : mov.type === 'MERMA'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {mov.type}
                          </span>
                        </td>

                        {/* 3. Documento / Referencia */}
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-slate-900">{mov.reference}</div>
                          {mov.notes && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">{mov.notes}</div>
                          )}
                        </td>

                        {/* 4. Responsable */}
                        <td className="px-3.5 py-2.5 text-slate-600 font-medium">
                          {mov.responsible}
                        </td>

                        {/* 5. Costo Unitario */}
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-700">
                          ${mov.unitCostUsd.toFixed(2)}
                        </td>

                        {/* 6. Entrada (+) */}
                        <td className="px-3.5 py-2.5 text-center font-mono font-black text-emerald-700">
                          {isEntry ? `+${mov.quantity}` : '-'}
                        </td>

                        {/* 7. Salida (-) */}
                        <td className="px-3.5 py-2.5 text-center font-mono font-black text-blue-700">
                          {isExit ? `-${mov.quantity}` : '-'}
                        </td>

                        {/* 8. Saldo Resultante */}
                        <td className="px-3.5 py-2.5 text-center font-mono font-black text-slate-900 bg-slate-50">
                          {mov.resultingStock} {product.unitOfMeasure}
                        </td>

                        {/* 9. Valor Total Saldo */}
                        <td className="px-3.5 py-2.5 text-right font-mono">
                          <div className="font-bold text-slate-900 text-xs">${totalValuationMovUsd.toFixed(2)}</div>
                          <div className="text-[10px] font-semibold text-blue-800">Bs. {totalValuationMovBs.toFixed(2)}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600 shrink-0">
          <span>
            Mostrando <strong>{filteredMovements.length}</strong> movimientos registrados en Kardex
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg pos-btn cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
