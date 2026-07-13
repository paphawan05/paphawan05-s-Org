/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Transaction } from '../types';
import { Printer, X, CheckCircle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export default function ReceiptModal({ transaction, onClose }: ReceiptModalProps) {
  const [printing, setPrinting] = useState(false);
  const [showPromptPayQR, setShowPromptPayQR] = useState(false);

  useEffect(() => {
    if (transaction && transaction.paymentMethod === 'promptpay') {
      setShowPromptPayQR(true);
    } else {
      setShowPromptPayQR(false);
    }
  }, [transaction]);

  if (!transaction) return null;

  const handlePrint = () => {
    setPrinting(true);
    // Simulate thermal printer sound and timing
    setTimeout(() => {
      setPrinting(false);
      alert('พิมพ์ใบเสร็จสำเร็จ! (ลิ้นชักเก็บเงินเด้งเปิดอัตโนมัติ 🔊)');
    }, 1500);
  };

  const formattedDate = transaction.timestamp?.seconds
    ? new Date(transaction.timestamp.seconds * 1000).toLocaleString('th-TH')
    : new Date().toLocaleString('th-TH');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <span className="font-semibold text-slate-800 text-sm">ใบเสร็จรับเงิน / ยืนยันการสั่งซื้อ</span>
          <button 
            id="close-receipt-modal-btn"
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto bg-slate-100/50 flex flex-col items-center">
          {showPromptPayQR ? (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 mb-4 flex flex-col items-center text-center w-full max-w-xs"
            >
              <div className="flex items-center space-x-1.5 text-blue-600 mb-2">
                <Smartphone className="h-5 w-5 animate-pulse" />
                <span className="font-bold text-xs">PromptPay QR Code</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">สแกนชำระเงินตามจำนวนยอดบิลด้านล่าง</p>
              
              {/* Fake PromptPay QR Code Creator using static SVG image */}
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://promptpay.io/0812345678/${transaction.total}`}
                  alt="PromptPay QR Code"
                  className="w-40 h-40 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-800">
                ยอดโอน: <span className="text-emerald-600 font-bold">{transaction.total.toLocaleString()} ฿</span>
              </div>
              <button
                id="confirm-payment-btn"
                onClick={() => setShowPromptPayQR(false)}
                className="mt-3 w-full py-1.5 bg-emerald-600 text-white font-semibold rounded-lg text-xs hover:bg-emerald-700 transition-colors"
              >
                ยืนยันการรับชำระเงินโอน
              </button>
            </motion.div>
          ) : (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-center space-x-2 text-xs font-semibold mb-4 w-full">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>ชำระเงินสำเร็จ ลิ้นชักเปิดแล้ว 🔒</span>
            </div>
          )}

          {/* Thermal Receipt Paper representation */}
          <div className="bg-white w-full shadow-lg border border-dashed border-slate-200 rounded-lg px-4 py-6 font-mono text-xs text-slate-700 max-w-[280px]">
            <div className="text-center mb-4">
              <h3 className="font-bold text-sm text-slate-900">SANDWICH BOX</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">อร่อย เต็มกล่อง สดใหม่ทุกวัน</p>
              <p className="text-[9px] text-slate-400 mt-1">โทร: 081-234-5678</p>
            </div>

            <div className="border-t border-dashed border-slate-200 py-2 text-[10px] text-slate-500 space-y-0.5">
              <div className="flex justify-between">
                <span>บิลเลขที่:</span>
                <span className="font-semibold text-slate-800">{transaction.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span>วันที่:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>แคชเชียร์:</span>
                <span>{transaction.sellerName}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 py-2">
              <div className="flex justify-between font-semibold text-[10px] mb-1">
                <span>รายการสินค้า</span>
                <span>รวม</span>
              </div>
              <div className="space-y-1 text-[10px]">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between leading-tight">
                    <div className="max-w-[160px]">
                      <div>{item.name}</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {item.quantity} x {item.price} ฿
                      </div>
                    </div>
                    <span className="font-semibold">{(item.total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 py-2 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span>มูลค่าสินค้า:</span>
                <span>{transaction.subtotal.toLocaleString()} ฿</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>ส่วนลดบิล:</span>
                  <span>-{transaction.discount.toLocaleString()} ฿</span>
                </div>
              )}
              {transaction.pointsDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>ลดจากแต้มสะสม:</span>
                  <span>-{transaction.pointsDiscount.toLocaleString()} ฿</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-sm border-t border-slate-100 pt-1.5 mt-1">
                <span>ยอดรวมสุทธิ:</span>
                <span>{transaction.total.toLocaleString()} ฿</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 py-2 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>วิธีชำระเงิน:</span>
                <span className="font-semibold">
                  {transaction.paymentMethod === 'cash' ? 'เงินสด' : 'โอนจ่าย (PromptPay)'}
                </span>
              </div>
              {transaction.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>รับเงินสด:</span>
                    <span>{transaction.cashReceived.toLocaleString()} ฿</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>เงินทอน:</span>
                    <span>{transaction.change.toLocaleString()} ฿</span>
                  </div>
                </>
              )}
            </div>

            {transaction.memberName && (
              <div className="border-t border-dashed border-slate-200 pt-2 text-[9px] text-slate-500 space-y-0.5">
                <div className="font-semibold text-slate-700">ข้อมูลสมาชิก: {transaction.memberName}</div>
                <div className="flex justify-between">
                  <span>แต้มที่ได้รับครั้งนี้:</span>
                  <span className="text-emerald-600">+{transaction.pointsEarned} แต้ม</span>
                </div>
                {transaction.pointsUsed > 0 && (
                  <div className="flex justify-between">
                    <span>แต้มที่ใช้แลกครั้งนี้:</span>
                    <span className="text-red-500">-{transaction.pointsUsed} แต้ม</span>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-dashed border-slate-200 mt-4 pt-3 text-center text-[9px] text-slate-400 leading-normal">
              <p>ขอบคุณที่อุดหนุนค่ะ</p>
              <p>*** อร่อยสดใหม่ทุกวัน ***</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-4 py-4 border-t border-slate-100 grid grid-cols-2 gap-3">
          <button
            id="print-receipt-btn"
            onClick={handlePrint}
            disabled={printing}
            className="flex items-center justify-center py-2.5 px-4 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors shadow-xs shadow-amber-500/10 disabled:bg-slate-300"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            {printing ? 'กำลังพิมพ์...' : 'พิมพ์ใบเสร็จ (80mm)'}
          </button>
          <button
            id="close-receipt-btn"
            onClick={onClose}
            className="flex items-center justify-center py-2.5 px-4 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300 transition-colors"
          >
            เสร็จสิ้น (ปิดหน้าต่าง)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
