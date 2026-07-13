/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Member, Promotion, Transaction, TransactionItem, Shift } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { 
  Search, 
  UserPlus, 
  User, 
  Trash2, 
  Tag, 
  ShoppingBag, 
  Barcode, 
  Coins, 
  BadgePercent, 
  Smartphone, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface POSProps {
  products: Product[];
  members: Member[];
  promotions: Promotion[];
  activeShift: Shift | null;
  currentUser: { uid: string; displayName: string } | null;
  onOpenShiftRequired: () => void;
  onTransactionComplete: (transaction: Transaction) => void;
}

export default function POS({ 
  products, 
  members, 
  promotions, 
  activeShift, 
  currentUser, 
  onOpenShiftRequired,
  onTransactionComplete
}: POSProps) {
  // Cart state
  const [cart, setCart] = useState<TransactionItem[]>([]);
  
  // Searching products
  const [productQuery, setProductQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | string>('all');
  
  // Barcode entry
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Member selection
  const [memberPhone, setMemberPhone] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearchError, setMemberSearchError] = useState('');

  // Discounts
  const [billDiscount, setBillDiscount] = useState<number>(0); // manual baht discount
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);

  // UI Categories
  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return ['all', ...Array.from(list)];
  }, [products]);

  // Focus barcode input on mount
  useEffect(() => {
    if (barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchQuery = p.name.toLowerCase().includes(productQuery.toLowerCase()) || 
                         p.barcode.includes(productQuery);
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchQuery && matchCat;
    });
  }, [products, productQuery, selectedCategory]);

  // Handle Barcode enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    const product = products.find(p => p.barcode === barcodeInput.trim());
    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      alert(`ไม่พบสินค้าที่มีบาร์โค้ด: ${barcodeInput}`);
    }
  };

  // Add Product to Cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`สินค้า ${product.name} หมดสต๊อกแล้ว!`);
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.productId === product.id);
      
      if (existingIndex > -1) {
        const item = prevCart[existingIndex];
        const newQty = item.quantity + 1;
        if (newQty > product.stock) {
          alert(`ไม่สามารถขายเกินจำนวนสต๊อกที่มีได้ (${product.stock} กล่อง)`);
          return prevCart;
        }

        // Calculate retail vs wholesale pricing based on quantity
        const isWholesale = newQty >= product.wholesaleMinQty;
        const currentPrice = isWholesale ? product.wholesalePrice : product.retailPrice;

        const updated = [...prevCart];
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          price: currentPrice,
          total: newQty * currentPrice
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            productId: product.id,
            name: product.name,
            price: product.retailPrice,
            cost: product.cost,
            quantity: 1,
            total: product.retailPrice
          }
        ];
      }
    });
  };

  // Update Item Qty in Cart
  const updateCartQty = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > product.stock) {
            alert(`ไม่สามารถขายเกินจำนวนสต๊อกที่มีได้ (${product.stock} กล่อง)`);
            return item;
          }

          const isWholesale = newQty >= product.wholesaleMinQty;
          const currentPrice = isWholesale ? product.wholesalePrice : product.retailPrice;

          return {
            ...item,
            quantity: newQty,
            price: currentPrice,
            total: newQty * currentPrice
          };
        }
        return item;
      }).filter(Boolean) as TransactionItem[];
    });
  };

  // Delete Item from Cart
  const deleteFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  // Clear POS board
  const resetPOS = () => {
    setCart([]);
    setSelectedMember(null);
    setMemberPhone('');
    setBillDiscount(0);
    setUsePoints(false);
    setPointsToRedeem(0);
    setCashReceived(0);
  };

  // Member Search
  const searchMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberSearchError('');
    if (!memberPhone.trim()) return;

    const found = members.find(m => m.phone === memberPhone.trim());
    if (found) {
      setSelectedMember(found);
      setMemberPhone('');
    } else {
      setMemberSearchError('ไม่พบข้อมูลสมาชิกเบอร์โทรนี้');
    }
  };

  // Points redemption calculation: 10 points = 10 THB Discount
  const pointsDiscountValue = useMemo(() => {
    if (!usePoints || !selectedMember) return 0;
    // Limit point redemption up to member points or 100% of bill subtotal
    const sub = cart.reduce((sum, item) => sum + item.total, 0);
    const maxDiscountAllowed = Math.max(0, sub - billDiscount);
    const pointsPossible = Math.min(selectedMember.points, maxDiscountAllowed);
    return pointsPossible;
  }, [usePoints, selectedMember, cart, billDiscount]);

  // Promotions engine trigger
  const promotionSummary = useMemo(() => {
    let sub = cart.reduce((sum, item) => sum + item.total, 0);
    let alerts: string[] = [];
    let extraDiscounts = 0;

    promotions.forEach(promo => {
      if (!promo.active) return;
      
      // Buy X Get Y promotion
      if (promo.type === 'buy_x_get_y') {
        cart.forEach(item => {
          if (promo.applicableProductIds.length === 0 || promo.applicableProductIds.includes(item.productId)) {
            const applicableMultiplier = Math.floor(item.quantity / promo.buyQty);
            if (applicableMultiplier > 0) {
              const freebiesToAward = applicableMultiplier * promo.freeQty;
              alerts.push(`🎉 โปรโมชั่น ${promo.name}: ได้รับสิทธิ์แถมฟรี ${freebiesToAward} กล่อง!`);
            }
          }
        });
      }

      // Freebie threshold promotion
      if (promo.type === 'freebie_threshold' && sub >= promo.thresholdAmount) {
        alerts.push(`🎁 ครบยอดเปิดบิล: ช้อปครบ ${promo.thresholdAmount} ฿ รับฟรี "${promo.freebieName}"`);
      }
    });

    return { alerts };
  }, [cart, promotions]);

  // Totals calculations
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const finalDiscount = Math.min(subtotal, Number(billDiscount) || 0);
    const pointsDiscount = Math.min(subtotal - finalDiscount, pointsDiscountValue);
    const total = Math.max(0, subtotal - finalDiscount - pointsDiscount);
    
    // Member points earned: 10 THB = 1 point
    const pointsEarned = selectedMember ? Math.floor(total / 10) : 0;

    return {
      subtotal,
      discount: finalDiscount,
      pointsDiscount,
      total,
      pointsEarned
    };
  }, [cart, billDiscount, pointsDiscountValue, selectedMember]);

  // Quick Cash button
  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  const changeDue = useMemo(() => {
    return Math.max(0, cashReceived - totals.total);
  }, [cashReceived, totals.total]);

  // Submit checkout to Firebase Firestore
  const handleCheckout = async () => {
    if (!activeShift) {
      onOpenShiftRequired();
      return;
    }
    if (cart.length === 0) {
      alert('กรุณาเลือกสินค้าลงตะกร้าก่อนทำรายการชำระเงิน');
      return;
    }
    if (paymentMethod === 'cash' && cashReceived < totals.total) {
      alert('จำนวนเงินสดที่รับมาไม่เพียงพอ');
      return;
    }

    try {
      const invoiceNo = 'INV-' + Date.now().toString().slice(-8);
      const transactionData: Omit<Transaction, 'id'> = {
        invoiceNo,
        items: cart,
        subtotal: totals.subtotal,
        discount: totals.discount,
        pointsUsed: usePoints ? totals.pointsDiscount : 0,
        pointsDiscount: totals.pointsDiscount,
        total: totals.total,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceived : totals.total,
        change: paymentMethod === 'cash' ? changeDue : 0,
        memberId: selectedMember ? selectedMember.id : null,
        memberName: selectedMember ? selectedMember.name : null,
        pointsEarned: totals.pointsEarned,
        sellerId: currentUser?.uid || 'anonymous',
        sellerName: currentUser?.displayName || 'พนักงานหน้าร้าน',
        shiftId: activeShift.id,
        timestamp: new Date() // Firestore automatically serializes native Date
      };

      // 1. Save Transaction to Firestore
      const txRef = await addDoc(collection(db, 'transactions'), transactionData);

      // 2. Update stock for products and points for member in a Batch transaction for total data safety
      const batch = writeBatch(db);

      // Deduct stock
      cart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const prodDocRef = doc(db, 'products', product.id);
          batch.update(prodDocRef, {
            stock: Math.max(0, product.stock - item.quantity)
          });
        }
      });

      // Update Member points
      if (selectedMember) {
        const memberDocRef = doc(db, 'members', selectedMember.id);
        const nextPoints = Math.max(0, selectedMember.points - (usePoints ? totals.pointsDiscount : 0) + totals.pointsEarned);
        batch.update(memberDocRef, {
          points: nextPoints
        });
      }

      // Update shift sales statistics
      const shiftDocRef = doc(db, 'shifts', activeShift.id);
      batch.update(shiftDocRef, {
        salesTotal: (activeShift.salesTotal || 0) + totals.total
      });

      await batch.commit();

      // Trigger callback with added transaction for visual receipt printing
      onTransactionComplete({
        id: txRef.id,
        ...transactionData
      });

      // Reset
      resetPOS();

    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกรายการขาย: ' + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-130px)]">
      
      {/* LEFT: Products selection column (7 cols) */}
      <div className="lg:col-span-7 flex flex-col space-y-4 h-full overflow-hidden">
        
        {/* Search Bar & Barcode scan form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          {/* Text search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="search-product-input"
              type="text"
              placeholder="ค้นหาชื่อแซนด์วิช หรือบาร์โค้ด..."
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>

          {/* Barcode scanner mockup */}
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <Barcode className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              ref={barcodeRef}
              id="barcode-input"
              type="text"
              placeholder="ยิงบาร์โค้ดสแกนที่นี่..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-amber-50/40 text-amber-900 font-mono font-semibold"
            />
          </form>
        </div>

        {/* Categories Pills */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1.5 scrollbar-none shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'}`}
            >
              {cat === 'all' ? 'ทั้งหมด' : cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
          {filteredProducts.map(p => {
            const isLowStock = p.stock <= p.minStock;
            return (
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between text-left hover:border-amber-400 transition-all group relative overflow-hidden h-36"
              >
                {/* Visual Category Dot */}
                <div className="flex justify-between items-center w-full">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase">{p.category}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isLowStock ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    เหลือ {p.stock}
                  </span>
                </div>

                <div className="my-2 flex-1">
                  <p className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-amber-600 transition-colors leading-snug">
                    {p.name}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">{p.barcode}</span>
                </div>

                <div className="flex justify-between items-baseline w-full pt-1.5 border-t border-slate-50">
                  <span className="text-[9px] text-slate-400 font-bold">ปลีก {p.retailPrice}.-</span>
                  <span className="text-sm font-extrabold text-amber-500 font-mono">{p.retailPrice} ฿</span>
                </div>

                {/* Hover Quick Indicator */}
                <div className="absolute right-2 bottom-2 bg-amber-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Cart, checkout, member calculations (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between h-full overflow-hidden">
        
        {/* Member Section */}
        <div className="border-b border-slate-100 pb-3 shrink-0">
          <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5 mb-2">
            <User className="h-4 w-4 text-amber-500" />
            <span>ลูกค้าสมาชิก (สะสมแต้ม)</span>
          </h2>

          {selectedMember ? (
            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-amber-900">{selectedMember.name}</p>
                <span className="text-[10px] text-amber-700 font-mono">{selectedMember.phone}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-amber-600 block">แต้มสะสมปัจจุบัน</span>
                <span className="text-sm font-extrabold text-amber-600">{selectedMember.points} แต้ม</span>
              </div>
              <button 
                id="remove-member-btn"
                onClick={() => { setSelectedMember(null); setUsePoints(false); }}
                className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-white transition-colors ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={searchMember} className="flex space-x-2">
              <input
                id="member-phone-input"
                type="text"
                placeholder="กรอกเบอร์โทรสมาชิก..."
                value={memberPhone}
                onChange={(e) => setMemberPhone(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                id="search-member-btn"
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                ค้นหา
              </button>
            </form>
          )}
          {memberSearchError && (
            <p className="text-[10px] text-red-500 mt-1">{memberSearchError}</p>
          )}
        </div>

        {/* Selected Items Cart List */}
        <div className="flex-1 overflow-y-auto py-2 my-2 min-h-0 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-slate-400 text-xs py-8">
              <ShoppingBag className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
              <span>ยังไม่มีสินค้าในตะกร้า</span>
              <p className="text-[10px] text-slate-400">เลือกสินค้าจากหน้าร้านด้านซ้าย</p>
            </div>
          ) : (
            cart.map(item => {
              const prodRef = products.find(p => p.id === item.productId);
              const isWholesale = item.quantity >= (prodRef?.wholesaleMinQty || 5);
              return (
                <div key={item.productId} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 border border-slate-100 text-xs">
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-slate-800 leading-tight">{item.name}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">{item.price} ฿</span>
                      {isWholesale && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-md flex items-center">
                          <Tag className="h-2.5 w-2.5 mr-0.5" />
                          ราคาส่ง
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                      <button 
                        id={`minus-${item.productId}`}
                        onClick={() => updateCartQty(item.productId, -1)}
                        className="px-2 py-0.5 hover:bg-slate-100 font-bold"
                      >
                        -
                      </button>
                      <span className="px-2 font-bold font-mono text-slate-800">{item.quantity}</span>
                      <button 
                        id={`plus-${item.productId}`}
                        onClick={() => updateCartQty(item.productId, 1)}
                        className="px-2 py-0.5 hover:bg-slate-100 font-bold"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-extrabold text-slate-800 font-mono w-14 text-right">
                      {item.total.toLocaleString()} ฿
                    </span>

                    <button 
                      id={`delete-${item.productId}`}
                      onClick={() => deleteFromCart(item.productId)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Promotions Notification banner inside POS */}
        {promotionSummary.alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl text-[10px] text-amber-800 space-y-1 my-2 shrink-0 max-h-24 overflow-y-auto">
            {promotionSummary.alerts.map((al, idx) => (
              <div key={idx} className="flex items-center font-semibold">
                <span className="mr-1">🏷️</span>
                <span>{al}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bill calculation details */}
        <div className="border-t border-slate-100 pt-3 space-y-2 shrink-0">
          
          {/* Discount inputs */}
          <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100/60">
            {/* Manual discount */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">ส่วนลดท้ายบิล (฿)</label>
              <input
                id="bill-discount-input"
                type="number"
                min="0"
                placeholder="ลดเป็นบาท..."
                value={billDiscount || ''}
                onChange={(e) => setBillDiscount(Math.max(0, Number(e.target.value)))}
                className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
              />
            </div>

            {/* Member points discount */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">แต้มแลกส่วนลด</label>
              {selectedMember ? (
                <button
                  id="toggle-redeem-points-btn"
                  onClick={() => setUsePoints(!usePoints)}
                  className={`w-full py-1 px-2 rounded-lg text-xs font-semibold border flex items-center justify-between ${usePoints ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <span className="truncate">{usePoints ? 'แลกแล้ว ✅' : 'กดเพื่อใช้แต้ม'}</span>
                  <span className="font-bold text-[10px]">{usePoints ? `-${pointsDiscountValue} ฿` : `${selectedMember.points} p`}</span>
                </button>
              ) : (
                <div className="w-full py-1 px-2 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-400">
                  ต้องเลือกสมาชิกก่อน
                </div>
              )}
            </div>
          </div>

          {/* Pricing calculation summary */}
          <div className="space-y-1.5 text-xs text-slate-600 font-semibold">
            <div className="flex justify-between">
              <span>ยอดรวมเบื้องต้น (Subtotal)</span>
              <span className="font-mono">{totals.subtotal.toLocaleString()} ฿</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span className="flex items-center">
                  <BadgePercent className="h-3.5 w-3.5 mr-1" />
                  ส่วนลดบิล
                </span>
                <span className="font-mono">-{totals.discount.toLocaleString()} ฿</span>
              </div>
            )}
            {totals.pointsDiscount > 0 && (
              <div className="flex justify-between text-amber-600 font-bold">
                <span className="flex items-center">
                  <Coins className="h-3.5 w-3.5 mr-1" />
                  ลดจากแต้มสะสม
                </span>
                <span className="font-mono">-{totals.pointsDiscount.toLocaleString()} ฿</span>
              </div>
            )}
            {selectedMember && totals.pointsEarned > 0 && (
              <div className="flex justify-between text-emerald-600 text-[10px] font-bold border-t border-dashed border-slate-100 pt-1 mt-1">
                <span>ได้รับแต้มสะสมครั้งนี้</span>
                <span>+{totals.pointsEarned} แต้ม</span>
              </div>
            )}
            
            {/* Grand Total */}
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
              <span>ยอดชำระสุทธิ (Total)</span>
              <span className="text-xl text-amber-500 font-mono">{totals.total.toLocaleString()} ฿</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="pt-2 border-t border-slate-100/60">
            <div className="grid grid-cols-2 gap-2">
              <button
                id="pay-cash-btn"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center space-x-1.5 transition-all ${paymentMethod === 'cash' ? 'bg-amber-500 border-amber-500 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              >
                <span>💵 เงินสด (Cash)</span>
              </button>
              <button
                id="pay-promptpay-btn"
                onClick={() => { setPaymentMethod('promptpay'); setCashReceived(0); }}
                className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center space-x-1.5 transition-all ${paymentMethod === 'promptpay' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              >
                <Smartphone className="h-4 w-4" />
                <span>📱 โอนจ่าย PromptPay</span>
              </button>
            </div>
          </div>

          {/* Cash input / Quick change section */}
          {paymentMethod === 'cash' && (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">รับเงินสด (Cash Received)</span>
                <input
                  id="cash-received-input"
                  type="number"
                  placeholder="จำนวนเงิน..."
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(Math.max(0, Number(e.target.value)))}
                  className="w-28 px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 text-right font-bold font-mono"
                />
              </div>

              {/* Quick Cash bills button */}
              <div className="grid grid-cols-4 gap-1.5">
                {[totals.total, 50, 100, 500, 1000].map((bill, index) => {
                  // Skip if exact total is 0 or less
                  if (bill <= 0) return null;
                  const label = index === 0 ? 'พอดี' : `${bill} ฿`;
                  const amount = index === 0 ? Math.ceil(totals.total) : bill;
                  return (
                    <button
                      key={index}
                      onClick={() => handleQuickCash(amount)}
                      className="py-1 bg-white hover:bg-slate-100 text-[10px] font-bold rounded-md border border-slate-200 text-slate-700 font-mono shadow-xs"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {cashReceived > totals.total && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-600 border-t border-slate-100 pt-1.5 mt-1.5">
                  <span>เงินทอน (Change Due):</span>
                  <span className="font-mono text-sm">{changeDue.toLocaleString()} ฿</span>
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <button
            id="checkout-submit-btn"
            onClick={handleCheckout}
            className={`w-full py-3 rounded-2xl font-extrabold text-sm transition-all shadow-md flex items-center justify-center space-x-1.5 ${!activeShift ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'}`}
          >
            {!activeShift ? (
              <>
                <AlertCircle className="h-5 w-5" />
                <span>กรุณาเปิดกะก่อนทำการขาย</span>
              </>
            ) : (
              <>
                <span>🚀 ชำระเงิน & ออกใบเสร็จ</span>
                <span className="font-mono">({totals.total.toLocaleString()} ฿)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
