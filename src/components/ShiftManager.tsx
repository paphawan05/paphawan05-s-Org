/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Shift, Transaction } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Play, 
  Square, 
  DollarSign, 
  Clock, 
  User, 
  CheckCircle, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

interface ShiftManagerProps {
  shifts: Shift[];
  activeShift: Shift | null;
  transactions: Transaction[];
  currentUser: { uid: string; displayName: string; email: string } | null;
  onOpenShift: (openingCash: number) => Promise<void>;
  onCloseShift: (closingCash: number) => Promise<void>;
}

export default function ShiftManager({ 
  shifts, 
  activeShift, 
  transactions, 
  currentUser,
  onOpenShift,
  onCloseShift 
}: ShiftManagerProps) {
  // Opening shift state
  const [openingCash, setOpeningCash] = useState<number>(1000); // default starting cash 1000 Baht
  const [openingLoading, setOpeningLoading] = useState(false);

  // Closing shift state
  const [closingCash, setClosingCash] = useState<number>(0);
  const [closingLoading, setClosingLoading] = useState(false);

  // Calculate current sales in active shift
  const activeShiftTransactions = useMemo(() => {
    if (!activeShift) return [];
    return transactions.filter(t => t.shiftId === activeShift.id);
  }, [transactions, activeShift]);

  const activeShiftSalesTotal = useMemo(() => {
    return activeShiftTransactions.reduce((sum, t) => sum + t.total, 0);
  }, [activeShiftTransactions]);

  const expectedCashTotal = useMemo(() => {
    if (!activeShift) return 0;
    // Expected cash = opening cash + sales total (from cash payments ONLY, promptpay does not accumulate physical cash)
    const cashSales = activeShiftTransactions
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.total, 0);
    return activeShift.openingCash + cashSales;
  }, [activeShift, activeShiftTransactions]);

  // Set closing cash matching expected by default on button click
  const fillExpectedCash = () => {
    setClosingCash(expectedCashTotal);
  };

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (openingCash < 0) {
      alert('จำนวนเงินเปิดกะห้ามต่ำกว่า 0 บาท');
      return;
    }
    setOpeningLoading(true);
    try {
      await onOpenShift(openingCash);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเปิดกะ: ' + err.message);
    } finally {
      setOpeningLoading(false);
    }
  };

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (closingCash < 0) {
      alert('จำนวนเงินนับปลายกะห้ามต่ำกว่า 0 บาท');
      return;
    }
    if (!confirm('คุณแน่ใจหรือไม่ที่จะทำการปิดกะนี้และส่งบันทึกตรวจสอบบัญชีประจำวัน?')) return;
    setClosingLoading(true);
    try {
      await onCloseShift(closingCash);
      setClosingCash(0);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการปิดกะ: ' + err.message);
    } finally {
      setClosingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">จัดการกะการทำงาน (Work Shifts)</h1>
        <p className="text-xs text-slate-500">เปิด-ปิดกะพนักงาน ตรวจสอบเงินสดเริ่มต้น/สิ้นสุด ตรวจสอบยอดดิฟบัญชีหน้าร้านอัตโนมัติ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active shift controls */}
        <div className="lg:col-span-5 space-y-6">
          {activeShift ? (
            /* Current Open Shift Card */
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
              <div className="bg-emerald-600 px-5 py-4 text-white flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Play className="h-5 w-5 animate-pulse" />
                  <span className="font-extrabold text-sm">กำลังเปิดกะทำงาน (Active Shift)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[9px] uppercase">เปิดใช้งาน</span>
              </div>

              <div className="p-5 space-y-4 text-xs font-semibold text-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">พนักงานผู้เปิดกะ</span>
                    <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                      <User className="h-4 w-4 text-emerald-600" />
                      <span>{activeShift.employeeName}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">เวลาเปิดกะ</span>
                    <div className="flex items-center space-x-1.5 text-slate-800 font-mono">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      <span>{new Date(activeShift.startTime).toLocaleTimeString('th-TH')}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-4 space-y-2.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500">💵 เงินสดเริ่มต้นเปิดกะ (Opening Cash):</span>
                    <span className="font-extrabold text-slate-800 font-mono">{activeShift.openingCash.toLocaleString()} ฿</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500">🛒 ยอดขายสะสมในกะนี้ (Shift Sales):</span>
                    <span className="font-extrabold text-emerald-600 font-mono">{activeShiftSalesTotal.toLocaleString()} ฿</span>
                  </div>
                  <div className="flex justify-between items-baseline bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                    <span className="text-slate-800 font-bold">💰 เงินสดที่ต้องมีในลิ้นชัก (Expected Cash):</span>
                    <span className="font-extrabold text-amber-500 font-mono text-sm">{expectedCashTotal.toLocaleString()} ฿</span>
                  </div>
                </div>

                {/* Closing Shift Form */}
                <form onSubmit={handleEndShift} className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-500 font-bold block">นับเงินสดปลายกะ (นับจริงในลิ้นชัก) *</label>
                    <button
                      id="fill-expected-cash-btn"
                      type="button"
                      onClick={fillExpectedCash}
                      className="text-[10px] text-amber-600 hover:underline font-bold"
                    >
                      ใส่ค่าที่ควรจะเป็น
                    </button>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">฿</span>
                    <input
                      id="closing-cash-input"
                      type="number"
                      required
                      min="0"
                      placeholder="กรอกจำนวนเงินสดที่นับจริง..."
                      value={closingCash || ''}
                      onChange={(e) => setClosingCash(Math.max(0, Number(e.target.value)))}
                      className="pl-7 pr-3 py-2 w-full border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-bold font-mono text-slate-800"
                    />
                  </div>

                  {closingCash > 0 && (
                    <div className="p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 border bg-slate-50 border-slate-100">
                      {closingCash - expectedCashTotal === 0 ? (
                        <div className="text-emerald-600 flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span>ยอดถูกต้อง ไม่มียอดดิฟพนักงานดีมาก! ✅</span>
                        </div>
                      ) : closingCash - expectedCashTotal > 0 ? (
                        <div className="text-blue-600 flex items-center space-x-1">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          <span>ยอดเกินในลิ้นชัก: +{(closingCash - expectedCashTotal).toLocaleString()} ฿</span>
                        </div>
                      ) : (
                        <div className="text-red-500 flex items-center space-x-1">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          <span>ยอดเงินสดหาย (ดิฟขาด): {(closingCash - expectedCashTotal).toLocaleString()} ฿ ⚠️</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    id="end-shift-btn"
                    type="submit"
                    disabled={closingLoading}
                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <Square className="h-4 w-4" />
                    <span>{closingLoading ? 'กำลังส่งข้อมูลปิดกะ...' : 'ปิดกะการทำงาน & ส่งสรุปตรวจสอบ'}</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Open Shift Panel */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="bg-slate-800 px-5 py-4 text-white flex justify-between items-center">
                <span className="font-extrabold text-sm">ยังไม่มีกะพนักงานเปิดอยู่</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-bold text-[9px] uppercase">ปิดใช้งาน</span>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-4 bg-amber-50 rounded-xl text-amber-800 border border-amber-100 text-xs leading-relaxed font-semibold flex space-x-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                  <span>กรุณาตั้งเงินทอนเปิดกะเริ่มต้นสำหรับวันใหม่ เพื่อความถูกต้องในการทำบัญชีและควบคุมลิ้นชักเก็บเงิน</span>
                </div>

                <form onSubmit={handleStartShift} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">เงินสดทอนเริ่มต้น (เปิดกะ) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold">฿</span>
                      <input
                        id="opening-cash-input"
                        type="number"
                        required
                        min="0"
                        value={openingCash}
                        onChange={(e) => setOpeningCash(Math.max(0, Number(e.target.value)))}
                        className="pl-7 pr-3 py-2 w-full border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-bold font-mono"
                      />
                    </div>
                  </div>

                  <button
                    id="start-shift-btn"
                    type="submit"
                    disabled={openingLoading}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <Play className="h-4.5 w-4.5" />
                    <span>{openingLoading ? 'กำลังสร้างกะทำงาน...' : 'เริ่มเปิดกะทำงานขายสินค้า'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Shift log history */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5">
              <FileSpreadsheet className="h-5 w-5 text-amber-500" />
              <span>ประวัติและรายงานการทำงานกะ</span>
            </h3>

            {shifts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                ไม่มีประวัติกะการทำงานในระบบ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-left font-bold">
                      <th className="px-4 py-2.5 rounded-l-lg">พนักงาน</th>
                      <th className="px-4 py-2.5">เวลาเริ่ม - สิ้นสุด</th>
                      <th className="px-4 py-2.5 text-right">เปิดกะ (฿)</th>
                      <th className="px-4 py-2.5 text-right">ยอดขาย (฿)</th>
                      <th className="px-4 py-2.5 text-right">ปิดจริง (฿)</th>
                      <th className="px-4 py-2.5 text-center">ยอดดิฟ (฿)</th>
                      <th className="px-4 py-2.5 text-center rounded-r-lg">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px]">
                    {shifts.map((s) => {
                      const diff = s.difference || 0;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{s.employeeName}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-400 leading-snug">
                            <div>เริ่ม: {new Date(s.startTime).toLocaleString('th-TH')}</div>
                            {s.endTime && <div>จบ: {new Date(s.endTime).toLocaleString('th-TH')}</div>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-600 font-mono">{s.openingCash.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-600 font-mono">{s.salesTotal.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700 font-mono">
                            {s.closingCash !== null ? s.closingCash.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-bold font-mono">
                            {s.status === 'open' ? (
                              <span className="text-slate-400 font-normal">-</span>
                            ) : diff === 0 ? (
                              <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">±0</span>
                            ) : diff > 0 ? (
                              <span className="text-blue-600">+{diff}</span>
                            ) : (
                              <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md">{diff}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${s.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                              {s.status === 'open' ? 'กำลังเปิด' : 'ปิดกะแล้ว'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
