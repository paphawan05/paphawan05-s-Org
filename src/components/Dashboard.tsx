/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, Transaction, Shift } from '../types';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  AlertTriangle, 
  Download, 
  Calendar,
  Users,
  Award
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
  shifts: Shift[];
  activeShift: Shift | null;
}

const COLORS = ['#F97316', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard({ products, transactions, shifts, activeShift }: DashboardProps) {
  const [timeFilter, setTimeFilter] = useState<'today' | 'month' | 'all'>('month');

  // Filter transactions based on selected time frame
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

    return transactions.filter(t => {
      if (!t.timestamp) return false;
      const date = t.timestamp.seconds 
        ? new Date(t.timestamp.seconds * 1000) 
        : new Date(t.timestamp);
      const dateStr = date.toLocaleDateString('en-CA');

      if (timeFilter === 'today') {
        return dateStr === todayStr;
      } else if (timeFilter === 'month') {
        return dateStr.startsWith(currentMonthStr);
      }
      return true;
    });
  }, [transactions, timeFilter]);

  // General KPIs calculation
  const stats = useMemo(() => {
    let salesTotal = 0;
    let costTotal = 0;
    let transCount = filteredTransactions.length;

    filteredTransactions.forEach(t => {
      salesTotal += t.total;
      t.items.forEach(item => {
        costTotal += (item.cost || 0) * item.quantity;
      });
    });

    const netProfit = salesTotal - costTotal;
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

    return {
      salesTotal,
      netProfit,
      transCount,
      lowStockCount
    };
  }, [filteredTransactions, products]);

  // Real-time sales chart data (grouped by date)
  const salesChartData = useMemo(() => {
    const groups: { [key: string]: { date: string; sales: number; profit: number } } = {};
    
    // Fill the last 15 days or current month days
    const now = new Date();
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const label = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      groups[dateStr] = { date: label, sales: 0, profit: 0 };
    }

    transactions.forEach(t => {
      if (!t.timestamp) return;
      const date = t.timestamp.seconds 
        ? new Date(t.timestamp.seconds * 1000) 
        : new Date(t.timestamp);
      const dateStr = date.toLocaleDateString('en-CA');
      
      if (groups[dateStr]) {
        groups[dateStr].sales += t.total;
        let transCost = 0;
        t.items.forEach(item => {
          transCost += (item.cost || 0) * item.quantity;
        });
        groups[dateStr].profit += (t.total - transCost);
      }
    });

    return Object.values(groups);
  }, [transactions]);

  // Best selling products chart data (Top 5)
  const bestSellers = useMemo(() => {
    const counts: { [key: string]: { name: string; quantity: number; totalSales: number } } = {};
    
    transactions.forEach(t => {
      t.items.forEach(item => {
        if (!counts[item.productId]) {
          counts[item.productId] = { name: item.name, quantity: 0, totalSales: 0 };
        }
        counts[item.productId].quantity += item.quantity;
        counts[item.productId].totalSales += item.total;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [transactions]);

  // Categories distribution chart data
  const categoryData = useMemo(() => {
    const cats: { [key: string]: number } = {};
    products.forEach(p => {
      cats[p.category] = (cats[p.category] || 0) + p.stock;
    });

    return Object.entries(cats).map(([name, stock]) => ({ name, value: stock }));
  }, [products]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Export Sales Report to Excel
  const exportToExcel = () => {
    if (transactions.length === 0) {
      alert('ไม่มีข้อมูลยอดขายสำหรับการส่งออก');
      return;
    }

    // Build worksheet for sales
    const salesRows = transactions.map(t => {
      const date = t.timestamp?.seconds 
        ? new Date(t.timestamp.seconds * 1000) 
        : new Date(t.timestamp || Date.now());
      
      let itemSummary = t.items.map(item => `${item.name} (${item.quantity} ชิ้น)`).join(', ');
      let totalCost = t.items.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0);
      let profit = t.total - totalCost;

      return {
        'เลขที่บิล (Invoice No.)': t.invoiceNo,
        'วันที่ (Date)': date.toLocaleDateString('th-TH'),
        'เวลา (Time)': date.toLocaleTimeString('th-TH'),
        'รายการสินค้า (Items)': itemSummary,
        'ยอดรวมบิล (Subtotal)': t.subtotal,
        'ส่วนลดบิล (Discount)': t.discount,
        'ส่วนลดสมาชิก (Points Discount)': t.pointsDiscount,
        'ยอดสุทธิ (Total)': t.total,
        'ต้นทุนรวม (Cost)': totalCost,
        'กำไรสุทธิ (Profit)': profit,
        'วิธีชำระเงิน (Method)': t.paymentMethod === 'cash' ? 'เงินสด' : 'โอนจ่าย (PromptPay)',
        'ชื่อพนักงานขาย (Seller)': t.sellerName,
        'ชื่อสมาชิก (Member)': t.memberName || 'ทั่วไป'
      };
    });

    const wsSales = XLSX.utils.json_to_sheet(salesRows);
    
    // Build worksheet for product inventory status
    const productRows = products.map(p => ({
      'รหัสบาร์โค้ด': p.barcode,
      'ชื่อสินค้า': p.name,
      'หมวดหมู่': p.category,
      'ราคาทุน': p.cost,
      'ราคาปลีก': p.retailPrice,
      'ราคาส่ง': p.wholesalePrice,
      'จำนวนขายส่งขั้นต่ำ (ชิ้น)': p.wholesaleMinQty,
      'คงเหลือในสต๊อก': p.stock,
      'สต๊อกแจ้งเตือนขั้นต่ำ': p.minStock,
      'สถานะสต๊อก': p.stock <= p.minStock ? 'ใกล้หมด ⚠️' : 'ปกติ ✅'
    }));
    const wsInventory = XLSX.utils.json_to_sheet(productRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSales, "รายงานยอดขาย");
    XLSX.utils.book_append_sheet(wb, wsInventory, "สถานะสต๊อกสินค้า");
    
    XLSX.writeFile(wb, `Sandwich_Box_POS_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Upper Dashboard Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">แดชบอร์ดภาพรวม</h1>
          <p className="text-xs text-slate-500">ข้อมูลรายงานและการวิเคราะห์ผลแบบเรียลไทม์</p>
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="bg-white p-1 rounded-xl border border-slate-200 flex space-x-1 text-xs">
            <button
              id="filter-today-btn"
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${timeFilter === 'today' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              วันนี้
            </button>
            <button
              id="filter-month-btn"
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${timeFilter === 'month' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              เดือนนี้
            </button>
            <button
              id="filter-all-btn"
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${timeFilter === 'all' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              ทั้งหมด
            </button>
          </div>

          <button
            id="export-dashboard-btn"
            onClick={exportToExcel}
            className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">ยอดขายรวม ({timeFilter === 'today' ? 'วันนี้' : timeFilter === 'month' ? 'เดือนนี้' : 'ทั้งหมด'})</span>
            <div className="text-2xl font-bold text-slate-800">
              {stats.salesTotal.toLocaleString()} ฿
            </div>
            <p className="text-[10px] text-emerald-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              <span>อัปเดตเรียลไทม์จากระบบขาย</span>
            </p>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-500 rounded-2xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">กำไรสุทธิ</span>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {stats.netProfit.toLocaleString()} ฿
            </div>
            <p className="text-[10px] text-slate-400">หักต้นทุนรวมเรียบร้อยแล้ว</p>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Transaction Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">จำนวนบิลที่ขาย</span>
            <div className="text-2xl font-bold text-slate-800">
              {stats.transCount} บิล
            </div>
            <p className="text-[10px] text-slate-400">บิลที่ชำระเงินเรียบร้อยแล้ว</p>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">สินค้าสต๊อกใกล้หมด</span>
            <div className={`text-2xl font-bold ${stats.lowStockCount > 0 ? 'text-amber-500' : 'text-slate-800'}`}>
              {stats.lowStockCount} รายการ
            </div>
            <p className="text-[10px] text-slate-400">ควรจัดเตรียมและเพิ่มสินค้า</p>
          </div>
          <div className={`p-3.5 rounded-2xl ${stats.lowStockCount > 0 ? 'bg-amber-50 text-amber-500 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Shifts Status and Real-time Status banner */}
      <div className="bg-slate-800 text-white p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-700/80 rounded-xl">
            <Calendar className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xs text-slate-300">สถานะกะการทำงานปัจจุบัน</div>
            <div className="text-sm font-semibold">
              {activeShift ? `กะใช้งานอยู่: ${activeShift.employeeName} (เปิดกะเงินสด: ${activeShift.openingCash} ฿)` : '🔴 ยังไม่มีการเปิดกะพนักงานกรุณาเปิดกะก่อนเริ่มขาย'}
            </div>
          </div>
        </div>
        <div className="text-xs px-3 py-1.5 bg-slate-700 rounded-xl font-mono text-emerald-400 flex items-center space-x-1.5 self-stretch md:self-auto justify-center">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>● เชื่อมต่อ FIRESTORE แบบเรียลไทม์</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realtime sales trend graph */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">กราฟยอดขายสุทธิ & กำไร (ย้อนหลัง 15 วัน)</h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">อัปเดตออโต้</span>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#F1F5F9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Area type="monotone" name="ยอดขาย" dataKey="sales" stroke="#F97316" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" name="กำไร" dataKey="profit" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best sellers bar chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">5 อันดับ แซนด์วิชขายดีที่สุด (กล่อง)</h3>
          
          {bestSellers.length === 0 ? (
            <div className="h-80 flex flex-col justify-center items-center text-slate-400 text-xs">
              <span>ยังไม่มีข้อมูลการขายสินค้า</span>
              <p className="text-[10px] text-slate-400 mt-1">ทดลองทำการขายสินค้าเพื่อดูกราฟยอดขาย</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bestSellers} layout="vertical" margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={9} width={90} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#F1F5F9' }} />
                  <Bar dataKey="quantity" name="จำนวนที่ขายได้" radius={[0, 4, 4, 0]}>
                    {bestSellers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Inventory & Low stock table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-sm">เตือนสินค้าสต๊อกใกล้หมดหรือหมดแล้ว</h3>
            </div>
            <span className="text-xs text-slate-400">เหลือสินค้าน้อยกว่าจุดแจ้งเตือนขั้นต่ำ</span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              ✨ ยอดเยี่ยม! มีสต๊อกแซนด์วิชทุกรายการครบถ้วน ไม่มีสต๊อกต่ำกว่าเกณฑ์
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-4 py-2.5 text-left font-semibold rounded-l-lg">รหัสบาร์โค้ด</th>
                    <th className="px-4 py-2.5 text-left font-semibold">ชื่อแซนด์วิช</th>
                    <th className="px-4 py-2.5 text-center font-semibold">จุดเตือน</th>
                    <th className="px-4 py-2.5 text-center font-semibold">สต๊อกคงเหลือ</th>
                    <th className="px-4 py-2.5 text-center font-semibold rounded-r-lg">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lowStockProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-slate-500">{p.barcode}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-500">{p.minStock}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-500 bg-red-50/50">{p.stock} กล่อง</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                          {p.stock === 0 ? 'หมดสต๊อก ❌' : 'สต๊อกใกล้หมด ⚠️'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie Chart of Category Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm mb-4">สัดส่วนสต๊อกแยกตามหมวดหมู่</h3>
          <div className="flex-1 h-56 w-full relative">
            {categoryData.length === 0 ? (
              <div className="h-full flex justify-center items-center text-slate-400 text-xs">
                ไม่มีหมวดหมู่สินค้า
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} กล่อง`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] mt-2 border-t border-slate-50 pt-2">
            {categoryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate text-slate-600 font-semibold">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
