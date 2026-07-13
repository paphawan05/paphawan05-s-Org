/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Member, Promotion, Employee } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod1',
    barcode: '8850123456781',
    name: 'แซนด์วิชโบราณ (น้ำสลัดโบราณ + หมูหยอง + โบโลน่า)',
    category: 'คลาสสิก',
    cost: 15,
    retailPrice: 35,
    wholesalePrice: 28,
    wholesaleMinQty: 5,
    stock: 25,
    minStock: 5
  },
  {
    id: 'prod2',
    barcode: '8850123456782',
    name: 'แซนด์วิชทูน่าคอร์นมายองเนส',
    category: 'พรีเมียม',
    cost: 22,
    retailPrice: 49,
    wholesalePrice: 40,
    wholesaleMinQty: 5,
    stock: 18,
    minStock: 5
  },
  {
    id: 'prod3',
    barcode: '8850123456783',
    name: 'แซนด์วิชแฮมชีส ดับเบิ้ลเบคอน',
    category: 'พรีเมียม',
    cost: 25,
    retailPrice: 59,
    wholesalePrice: 48,
    wholesaleMinQty: 5,
    stock: 4, // Trigger low stock alert!
    minStock: 5
  },
  {
    id: 'prod4',
    barcode: '8850123456784',
    name: 'แซนด์วิชอกไก่ไข่ต้มคลีน (โฮลวีท)',
    category: 'สุขภาพ',
    cost: 20,
    retailPrice: 49,
    wholesalePrice: 39,
    wholesaleMinQty: 5,
    stock: 12,
    minStock: 5
  },
  {
    id: 'prod5',
    barcode: '8850123456785',
    name: 'แซนด์วิชปูอัดไข่กุ้ง มายองเนสวาซาบิ',
    category: 'พรีเมียม',
    cost: 22,
    retailPrice: 49,
    wholesalePrice: 40,
    wholesaleMinQty: 5,
    stock: 15,
    minStock: 5
  },
  {
    id: 'prod6',
    barcode: '8850123456786',
    name: 'แซนด์วิชสตรอเบอร์รี่วิปครีมสด',
    category: 'หวาน',
    cost: 18,
    retailPrice: 39,
    wholesalePrice: 32,
    wholesaleMinQty: 5,
    stock: 8,
    minStock: 5
  }
];

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem1',
    name: 'สมชาย รักดี',
    phone: '0812345678',
    email: 'somchai@gmail.com',
    points: 120,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mem2',
    name: 'สมศรี รักเรียน',
    phone: '0898765432',
    email: 'somsri@gmail.com',
    points: 45,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mem3',
    name: 'วันดี มีสุข',
    phone: '0865432109',
    email: 'wandee@gmail.com',
    points: 350,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: 'promo1',
    name: 'โปรเปิดร้าน! ซื้อ 5 แถม 1 (แซนด์วิชโบราณ)',
    type: 'buy_x_get_y',
    buyQty: 5,
    freeQty: 1,
    discountPercent: 0,
    thresholdAmount: 0,
    freebieName: 'แซนด์วิชโบราณ 1 กล่อง',
    applicableProductIds: ['prod1'],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    active: true
  },
  {
    id: 'promo2',
    name: 'โปรโมชั่นพิเศษ ซื้อครบ 300 บาท แถมฟรี แซนด์วิชหวาน 1 กล่อง',
    type: 'freebie_threshold',
    buyQty: 0,
    freeQty: 0,
    discountPercent: 0,
    thresholdAmount: 300,
    freebieName: 'แซนด์วิชสตรอเบอร์รี่วิปครีมสด 1 กล่อง',
    applicableProductIds: [],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    active: true
  }
];
