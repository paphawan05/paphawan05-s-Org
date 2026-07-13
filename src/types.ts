/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  cost: number;
  retailPrice: number;
  wholesalePrice: number;
  wholesaleMinQty: number;
  stock: number;
  minStock: number;
  imageUrl?: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  createdAt: string;
}

export interface TransactionItem {
  productId: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  total: number;
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number; // general discount
  pointsUsed: number;
  pointsDiscount: number;
  total: number;
  paymentMethod: 'cash' | 'promptpay';
  cashReceived: number;
  change: number;
  memberId: string | null;
  memberName: string | null;
  pointsEarned: number;
  sellerId: string;
  sellerName: string;
  shiftId: string | null;
  timestamp: any; // firestore timestamp
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  salesTotal: number;
  status: 'open' | 'closed';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  posOnly: boolean;
  viewReports: boolean;
  manageProducts: boolean;
  manageSettings: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  type: 'buy_x_get_y' | 'discount_percentage' | 'freebie_threshold';
  buyQty: number;
  freeQty: number;
  discountPercent: number;
  thresholdAmount: number;
  freebieName: string;
  applicableProductIds: string[]; // empty means all products
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface BackupData {
  products: Product[];
  members: Member[];
  transactions: Transaction[];
  shifts: Shift[];
  promotions: Promotion[];
  employees: Employee[];
  backupTime: string;
}
