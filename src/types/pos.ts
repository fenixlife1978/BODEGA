export interface ProductPresentation {
  id: string;
  name: string; // e.g. "Caja 12 uds", "Unidad individual", "Bolsa 500g"
  unitOfMeasure: string; // "CAJA" | "PQTE" | "UND" | "KG" | "GMS" | "LTS" | "ML"
  contentAmount: number; // e.g. 12, 1, 500, 1000
  contentUnit: string; // "uds", "g", "ml", "kg", "lts"
  priceUsd: number; // individual price for this presentation
  barcode?: string;
}

export interface ProductSupplier {
  id: string;
  name: string; // e.g. "Distribuidora Polar C.A.", "Comercializadora El Sol"
  costPriceUsd: number; // cost offered by this supplier in USD
  contactInfo?: string; // phone or notes
  isPrimary?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string; // optional description
  presentation?: string; // e.g. "(3 uds)", "(1 ud)", "1 Kg"
  unitOfMeasure: string; // "UND" | "KG" | "LTS" | "PQTE" | "CAJA" | "LATA" | "BOT"
  contentNominal?: number; // e.g. 1000 (g/ml), 3 (uds), 1 (kg)
  contentUnit?: string; // "g", "ml", "uds", "kg", "lts"
  priceUsd: number; // Final selling price in USD
  barcode: string;
  category: string;
  stock: number;
  stockMin?: number; // Minimum stock alert threshold
  imageUrl: string;
  hasTax: boolean; // default true (16% IVA)
  unitPriceNote?: string;
  
  // Costing & Pricing Engine fields
  baseCostUsd?: number; // Direct cost or derived from max supplier price
  profitMarginPercent?: number; // e.g. 30%
  additionalExpensesPercent?: number; // Fletes, impuestos municipales, logística (e.g. 5%)
  pricingEngine?: 'markup_cost' | 'markup_sales' | 'gap_auto' | 'fixed_price';
  suppliers?: ProductSupplier[]; // Associated suppliers with individual costs

  // Fractional & Multi-presentation rules
  allowsSmallerUnit?: boolean; // If package/caja, allows selling individual units
  unitPriceUsd?: number; // Specific price for individual single unit

  allowsGrams?: boolean; // If unit is KG, allows selling by grams or composite kg+g
  allowsMlFraction?: boolean; // If unit is LTS, allows selling by ml or by Bs. budget
  
  presentations?: ProductPresentation[]; // list of additional presentations with individual prices
  isWeighted?: boolean;
  weightUnit?: string;
}

export interface CartItem {
  product: Product;
  selectedPresentationId?: string;
  presentationName?: string;
  selectedPresentationName?: string;
  unitOfMeasure?: string;
  quantity: number; // Decimal (e.g. 0.450) or integer
  quantityInputStr?: string; // String for free-form text input editing
  fractionMode?: 'direct' | 'grams' | 'ml' | 'bs_budget';
  amountBsBudget?: number; // When customer says "Dame 50 Bs de aceite"
  customPriceUsd?: number;
  overrideTotal?: number;
}

export interface PaymentBreakdown {
  cashUsd: number;
  cashBs: number;
  cardBs: number;
  cardUsd: number;
  pagoMovilBs: number;
  pagoMovilRef?: string;
  pagoMovilBank?: string;
}

export interface SaleRecord {
  id: string;
  receiptNumber: string;
  timestamp: string;
  items: CartItem[];
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  subtotalBs: number;
  taxBs: number;
  totalBs: number;
  exchangeRate: number;
  cashier: string;
  cashRegister: string;
  payments: PaymentBreakdown;
  changeGivenUsd: number;
  changeGivenBs: number;
  status: 'COMPLETADA' | 'ANULADA';
  isCreditSale?: boolean;
  customerId?: string;
  customerName?: string;
  customerTaxId?: string;
}

export interface Customer {
  id: string;
  name: string;
  taxId: string; // V-12345678, J-12345678-0
  phone: string;
  email?: string;
  address?: string;
  creditLimitUsd: number;
  currentBalanceUsd: number; // outstanding balance
  creditDays: number; // e.g. 15 or 30 days
  createdAt: string;
  notes?: string;
}

export interface CreditPaymentRecord {
  id: string;
  customerId: string;
  timestamp: string;
  amountUsd: number;
  amountBs: number;
  exchangeRate: number;
  paymentMethod: 'EFECTIVO_USD' | 'EFECTIVO_BS' | 'PAGO_MOVIL' | 'PUNTO_VENTA' | 'TRANSFERENCIA';
  reference: string;
  notes?: string;
  receivedBy: string;
}

export interface ReturnRecord {
  id: string;
  saleId: string;
  receiptNumber: string;
  timestamp: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPriceUsd: number;
    totalUsd: number;
  }[];
  totalRefundUsd: number;
  totalRefundBs: number;
  refundMethod: 'EFECTIVO_USD' | 'EFECTIVO_BS' | 'NOTA_CREDITO';
  reason: string;
  authorizedBy: string;
}

export interface KardexMovement {
  id: string;
  productId: string;
  timestamp: string;
  type: 'ENTRADA' | 'VENTA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'MERMA' | 'DEVOLUCION';
  reference: string; // e.g. "Ticket #1001", "OC-8821 Polar", "Ajuste de Auditoría", "Recepción Inicial"
  quantity: number; // positive for entries, positive for sales amount
  previousStock: number;
  resultingStock: number;
  unitCostUsd: number;
  totalCostUsd: number;
  responsible: string;
  notes?: string;
}

export interface PosConfig {
  storeName: string;
  registerName: string;
  exchangeRate: number; // Bs per USD
  ivaRate: number; // 0.16
  taxId: string; // RIF: J-12345678-9
  address: string;
  phone: string;
  cashierName: string;
  soundEnabled: boolean;
  autoPrint: boolean;
  paperSize: '80mm' | '58mm';
  printHeaderMessage?: string;
  printFooterMessage?: string;
  printShowTax?: boolean;
  printShowExchangeRate?: boolean;
  printShowBarcode?: boolean;
  printCopies?: number;
}
