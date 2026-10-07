import React, { useState } from 'react';
import { Customer } from '../types/pos';
import { sound } from '../utils/sound';
import {
  X,
  UserPlus,
  Building2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle2,
  Save
} from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCustomer: (customer: Customer) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSaveCustomer,
}) => {
  const [docType, setDocType] = useState<'V' | 'J' | 'E' | 'G'>('V');
  const [docNumber, setDocNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimitUsd, setCreditLimitUsd] = useState('200.00');
  const [creditDays, setCreditDays] = useState(15);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !docNumber.trim()) {
      sound.playError();
      return;
    }

    const fullTaxId = `${docType}-${docNumber.trim()}`;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      taxId: fullTaxId,
      phone: phone.trim() || 'N/A',
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      creditLimitUsd: parseFloat(creditLimitUsd) || 0,
      currentBalanceUsd: 0,
      creditDays: Number(creditDays) || 15,
      createdAt: new Date().toLocaleDateString('es-VE'),
      notes: notes.trim() || undefined,
    };

    onSaveCustomer(newCust);
    sound.playSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#1b4e8c] text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Registrar Nuevo Cliente</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Alta de cliente para facturación y ventas a crédito
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 bg-slate-50 flex-1 text-xs">
          {/* Document & Name */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo Doc.:</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 font-bold border border-slate-300 rounded-lg bg-white focus:outline-hidden"
              >
                <option value="V">V- (Venezolano)</option>
                <option value="J">J- (Jurídico / RIF)</option>
                <option value="E">E- (Extranjero)</option>
                <option value="G">G- (Gubernamental)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Cédula o RIF:</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="12345678 ó 40192837-1"
                className="w-full px-3 py-1.5 font-mono font-bold border border-slate-300 rounded-lg bg-white focus:border-[#1b4e8c] focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nombre Completo o Razón Social:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Inversiones El Trigal C.A. / María González"
              className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-[#1b4e8c] focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Teléfono:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+58 (414) 000-0000"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Correo Electrónico (Opcional):</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@correo.com"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Dirección Fiscal / Entrega:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Av. Las Delicias, Local #4"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden"
            />
          </div>

          {/* Credit Terms */}
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2">
            <span className="font-bold text-blue-900 block uppercase tracking-wide">
              Condiciones de Venta a Crédito:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Límite de Crédito (USD):</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={creditLimitUsd}
                    onChange={(e) => setCreditLimitUsd(e.target.value)}
                    placeholder="200.00"
                    className="w-full pl-6 pr-2.5 py-1.5 font-bold font-mono border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Plazo de Pago (Días):</label>
                <select
                  value={creditDays}
                  onChange={(e) => setCreditDays(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 font-bold border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                >
                  <option value={7}>7 Días (Semanal)</option>
                  <option value={15}>15 Días (Quincenal)</option>
                  <option value={30}>30 Días (Mensual)</option>
                  <option value={45}>45 Días</option>
                  <option value={60}>60 Días</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notas / Observaciones:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre solvencia, contacto comercial..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#1b4e8c] hover:bg-[#153e6d] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 pos-btn cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cliente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
