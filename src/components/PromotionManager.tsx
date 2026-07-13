/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Promotion, Product } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Tag, 
  Gift, 
  Calendar,
  Layers
} from 'lucide-react';

interface PromotionManagerProps {
  promotions: Promotion[];
  products: Product[];
}

export default function PromotionManager({ promotions, products }: PromotionManagerProps) {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'buy_x_get_y' | 'discount_percentage' | 'freebie_threshold'>('buy_x_get_y');
  const [buyQty, setBuyQty] = useState<number>(5);
  const [freeQty, setFreeQty] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(50);
  const [thresholdAmount, setThresholdAmount] = useState<number>(300);
  const [freebieName, setFreebieName] = useState('');
  const [applicableProductIds, setApplicableProductIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [active, setActive] = useState(true);

  const openAddModal = () => {
    setEditingPromotion(null);
    setName('');
    setType('buy_x_get_y');
    setBuyQty(5);
    setFreeQty(1);
    setDiscountPercent(0);
    setThresholdAmount(0);
    setFreebieName('');
    setApplicableProductIds([]);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('2026-12-31');
    setActive(true);
    setModalOpen(true);
  };

  const openEditModal = (p: Promotion) => {
    setEditingPromotion(p);
    setName(p.name);
    setType(p.type);
    setBuyQty(p.buyQty);
    setFreeQty(p.freeQty);
    setDiscountPercent(p.discountPercent);
    setThresholdAmount(p.thresholdAmount);
    setFreebieName(p.freebieName);
    setApplicableProductIds(p.applicableProductIds || []);
    setStartDate(p.startDate);
    setEndDate(p.endDate);
    setActive(p.active);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      alert('กรุณากรอกหัวข้อ และกำหนดวันจัดโปรโมชั่นให้ถูกต้อง');
      return;
    }

    try {
      const promoData = {
        name: name.trim(),
        type,
        buyQty: type === 'buy_x_get_y' ? Number(buyQty) || 5 : 0,
        freeQty: type === 'buy_x_get_y' ? Number(freeQty) || 1 : 0,
        discountPercent: type === 'discount_percentage' ? Number(discountPercent) || 0 : 0,
        thresholdAmount: type === 'freebie_threshold' ? Number(thresholdAmount) || 0 : 0,
        freebieName: type === 'freebie_threshold' ? freebieName.trim() : '',
        applicableProductIds,
        startDate,
        endDate,
        active
      };

      if (editingPromotion) {
        await updateDoc(doc(db, 'promotions', editingPromotion.id), promoData);
      } else {
        await addDoc(collection(db, 'promotions'), promoData);
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกโปรโมชั่น: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจที่จะลบโปรโมชั่นนี้ใช่หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'promotions', id));
    } catch (err: any) {
      console.error(err);
      alert('ลบโปรโมชั่นล้มเหลว: ' + err.message);
    }
  };

  const toggleActive = async (p: Promotion) => {
    try {
      await updateDoc(doc(db, 'promotions', p.id), {
        active: !p.active
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleProductSelection = (productId: string) => {
    if (applicableProductIds.includes(productId)) {
      setApplicableProductIds(prev => prev.filter(id => id !== productId));
    } else {
      setApplicableProductIds(prev => [...prev, productId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">จัดการโปรโมชั่นและการตลาด</h1>
          <p className="text-xs text-slate-500">สร้างแคมเปญกระตุ้นยอดขาย ซื้อ 5 แถม 1, ส่วนลดสินค้า หรือมอบของสมนาคุณเมื่อช้อปครบยอด</p>
        </div>

        <button
          id="open-add-promotion-modal-btn"
          onClick={openAddModal}
          className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold py-2 px-3.5 rounded-xl transition-all shadow-xs shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>สร้างแคมเปญโปรโมชั่น</span>
        </button>
      </div>

      {/* Promotions List Grid */}
      {promotions.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white border border-slate-100 rounded-2xl">
          🎁 ยังไม่มีการสร้างแคมเปญโปรโมชั่นในขณะนี้ เริ่มสร้างเพื่อดึงดูดลูกค้าและเพิ่มยอดขาย
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {promotions.map((p) => (
            <div 
              key={p.id} 
              className={`bg-white rounded-2xl border ${p.active ? 'border-amber-100/70 shadow-sm' : 'border-slate-100 opacity-60'} overflow-hidden flex flex-col justify-between`}
            >
              <div className="p-5 space-y-3.5 text-xs">
                {/* Promo Badge Type */}
                <div className="flex justify-between items-center">
                  <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[9px] ${
                    p.type === 'buy_x_get_y' ? 'bg-amber-50 text-amber-700' :
                    p.type === 'discount_percentage' ? 'bg-red-50 text-red-600' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {p.type === 'buy_x_get_y' ? 'ซื้อ X แถม Y' :
                     p.type === 'discount_percentage' ? 'ลดเปอร์เซ็นต์' :
                     'แถมเมื่อยอดครบ'}
                  </span>

                  {/* Toggle Active Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={p.active} 
                      onChange={() => toggleActive(p)} 
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-amber-500"></div>
                    <span className="ml-1.5 text-[10px] text-slate-500 font-bold">{p.active ? 'เปิดอยู่' : 'ปิด'}</span>
                  </label>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-1">{p.name}</h3>
                  <div className="text-slate-500 font-semibold mt-1 space-y-0.5 text-[10px]">
                    {p.type === 'buy_x_get_y' && (
                      <p className="flex items-center text-amber-600">
                        <Gift className="h-3.5 w-3.5 mr-1" />
                        <span>ซื้อครบ {p.buyQty} ชิ้น รับแถมฟรี {p.freeQty} ชิ้น</span>
                      </p>
                    )}
                    {p.type === 'freebie_threshold' && (
                      <p className="flex items-center text-blue-600">
                        <Gift className="h-3.5 w-3.5 mr-1" />
                        <span>ช้อปครบ {p.thresholdAmount} ฿ รับฟรี "{p.freebieName}"</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Applicable Products */}
                <div className="border-t border-slate-50 pt-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center mb-1">
                    <Layers className="h-3 w-3 mr-1" />
                    <span>สินค้าที่เข้าร่วม</span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-600">
                    {p.applicableProductIds.length === 0 ? 'แซนด์วิชทุกหมวดหมู่/ทุกรายการ ✅' : `เข้าร่วมเฉพาะบางรายการ (${p.applicableProductIds.length} ชิ้น)`}
                  </p>
                </div>

                {/* Timeframe */}
                <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[10px] font-bold">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{p.startDate} ถึง {p.endDate}</span>
                </div>
              </div>

              {/* Card actions footer */}
              <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-50 flex justify-end space-x-1">
                <button
                  id={`edit-promotion-btn-${p.id}`}
                  onClick={() => openEditModal(p)}
                  className="px-2.5 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                >
                  แก้ไขข้อมูล
                </button>
                <button
                  id={`delete-promotion-btn-${p.id}`}
                  onClick={() => handleDelete(p.id)}
                  className="px-2.5 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >
                  ลบออก
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Promotion Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center shrink-0">
              <span className="font-bold text-slate-800 text-sm">{editingPromotion ? 'แก้ไขโปรโมชั่น' : 'สร้างแคมเปญการตลาดใหม่'}</span>
              <button 
                id="close-add-promotion-modal-btn"
                onClick={() => setModalOpen(false)} 
                className="p-1 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs font-semibold overflow-y-auto">
              {/* Promo Campaign Title */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">หัวข้อแคมเปญโปรโมชั่น *</label>
                <input
                  id="promo-form-name"
                  type="text"
                  required
                  placeholder="เช่น โปรเปิดใจซื้อ 5 แถม 1 หรือช้อปสะใจครบ 300 ฟรี!"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                />
              </div>

              {/* Campaign Type Selector */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">รูปแบบโปรโมชั่น *</label>
                <select
                  id="promo-form-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs bg-white font-semibold"
                >
                  <option value="buy_x_get_y">ซื้อ X แถม Y (เช่น ซื้อแซนด์วิช 5 ชิ้น แถม 1)</option>
                  <option value="freebie_threshold">ของแถมเมื่อช้อปครบตามยอดสะสม (เช่น ครบ 300 แถมฟรีแซนด์วิชหวาน)</option>
                </select>
              </div>

              {/* Conditional Inputs based on Type */}
              {type === 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <div>
                    <label className="text-[10px] text-amber-800 font-bold block mb-1">ซื้อจำนวนขั้นต่ำ (ชิ้น) *</label>
                    <input
                      id="promo-form-buy-qty"
                      type="number"
                      min="1"
                      value={buyQty}
                      onChange={(e) => setBuyQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-800 font-bold block mb-1">จำนวนที่แถมฟรี (ชิ้น) *</label>
                    <input
                      id="promo-form-free-qty"
                      type="number"
                      min="1"
                      value={freeQty}
                      onChange={(e) => setFreeQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {type === 'freebie_threshold' && (
                <div className="space-y-3 p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                  <div>
                    <label className="text-[10px] text-blue-900 font-bold block mb-1">ยอดช้อปสะสมขั้นต่ำ (บาท) *</label>
                    <input
                      id="promo-form-threshold"
                      type="number"
                      min="1"
                      placeholder="เช่น 300"
                      value={thresholdAmount}
                      onChange={(e) => setThresholdAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-blue-900 font-bold block mb-1">ของรางวัลที่จะได้รับฟรี *</label>
                    <input
                      id="promo-form-freebie-name"
                      type="text"
                      required
                      placeholder="เช่น แซนด์วิชสตรอเบอร์รี่วิปครีม 1 กล่อง..."
                      value={freebieName}
                      onChange={(e) => setFreebieName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Timeframe picker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">วันที่เริ่มต้นโปร *</label>
                  <input
                    id="promo-form-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">วันที่สิ้นสุดโปร *</label>
                  <input
                    id="promo-form-end-date"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Product Applicability (multi-select) */}
              {type === 'buy_x_get_y' && (
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">เลือกสินค้าแซนด์วิชที่เข้าร่วมโปรแกรม (ไม่เลือก = แซนด์วิชทั้งหมด)</label>
                  <div className="border border-slate-200 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1 bg-slate-50">
                    {products.map(p => (
                      <label key={p.id} className="flex items-center space-x-2 p-1 rounded hover:bg-white cursor-pointer transition-colors text-[11px]">
                        <input
                          type="checkbox"
                          checked={applicableProductIds.includes(p.id)}
                          onChange={() => handleProductSelection(p.id)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="truncate">{p.name} ({p.retailPrice} ฿)</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Status active */}
              <div className="flex items-center space-x-2">
                <input
                  id="promo-form-active"
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label className="text-slate-700 font-bold cursor-pointer">เปิดการใช้งานทันทีหลังบันทึก</label>
              </div>

              {/* Actions */}
              <div className="flex space-x-3.5 pt-2 shrink-0">
                <button
                  id="promo-form-cancel"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  id="promo-form-submit"
                  type="submit"
                  className="w-2/3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition-colors shadow-xs"
                >
                  บันทึกแคมเปญ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
