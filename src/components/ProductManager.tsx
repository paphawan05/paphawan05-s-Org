/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  X, 
  AlertTriangle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductManagerProps {
  products: Product[];
}

export default function ProductManager({ products }: ProductManagerProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product Form state
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [wholesaleMinQty, setWholesaleMinQty] = useState<number>(5);
  const [stock, setStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(5);

  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return ['all', ...Array.from(list)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.barcode.includes(search);
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, categoryFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setBarcode('885' + Math.floor(Math.random() * 1000000000).toString().padStart(10, '0'));
    setName('');
    setCategory('คลาสสิก');
    setCost(15);
    setRetailPrice(35);
    setWholesalePrice(28);
    setWholesaleMinQty(5);
    setStock(20);
    setMinStock(5);
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setBarcode(p.barcode);
    setName(p.name);
    setCategory(p.category);
    setCost(p.cost);
    setRetailPrice(p.retailPrice);
    setWholesalePrice(p.wholesalePrice);
    setWholesaleMinQty(p.wholesaleMinQty);
    setStock(p.stock);
    setMinStock(p.minStock);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim() || !category.trim()) {
      alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน');
      return;
    }

    try {
      const pData = {
        barcode: barcode.trim(),
        name: name.trim(),
        category: category.trim(),
        cost: Number(cost) || 0,
        retailPrice: Number(retailPrice) || 0,
        wholesalePrice: Number(wholesalePrice) || 0,
        wholesaleMinQty: Number(wholesaleMinQty) || 5,
        stock: Number(stock) || 0,
        minStock: Number(minStock) || 0
      };

      if (editingProduct) {
        // Update
        const docRef = doc(db, 'products', editingProduct.id);
        await updateDoc(docRef, pData);
      } else {
        // Add
        await addDoc(collection(db, 'products'), pData);
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลสินค้า: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบแซนด์วิชรายการนี้ออกจากหน้าร้าน?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบสินค้า: ' + err.message);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = products.map(p => ({
      'รหัสบาร์โค้ด (Barcode)': p.barcode,
      'ชื่อสินค้า (Name)': p.name,
      'หมวดหมู่ (Category)': p.category,
      'ราคาทุน (Cost)': p.cost,
      'ราคาขายปลีก (Retail Price)': p.retailPrice,
      'ราคาขายส่ง (Wholesale Price)': p.wholesalePrice,
      'จำนวนส่งขั้นต่ำ (Wholesale Min Qty)': p.wholesaleMinQty,
      'สต๊อกคงเหลือ (Stock)': p.stock,
      'จุดแจ้งเตือนขั้นต่ำ (Min Stock)': p.minStock
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "สินค้าทั้งหมด");
    XLSX.writeFile(wb, "Sandwich_Box_Products.xlsx");
  };

  // Import from Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          alert('ไม่พบข้อมูลสินค้าในตาราง Excel');
          return;
        }

        if (!confirm(`ต้องการนำเข้าข้อมูลสินค้าทั้งหมด ${data.length} รายการเข้าสู่ระบบขายหรือไม่? (สินค้าที่มีบาร์โค้ดซ้ำจะยังคงถูกเพิ่มในระบบ)`)) return;

        const batch = writeBatch(db);
        data.forEach(row => {
          const barcodeVal = String(row['รหัสบาร์โค้ด (Barcode)'] || row['Barcode'] || row['barcode'] || Math.floor(Math.random() * 1000000000));
          const nameVal = String(row['ชื่อสินค้า (Name)'] || row['Name'] || row['name'] || 'แซนด์วิชไม่มีชื่อ');
          const catVal = String(row['หมวดหมู่ (Category)'] || row['Category'] || row['category'] || 'คลาสสิก');
          const costVal = Number(row['ราคาทุน (Cost)'] || row['Cost'] || row['cost'] || 15);
          const retailVal = Number(row['ราคาขายปลีก (Retail Price)'] || row['Retail Price'] || row['retailPrice'] || 35);
          const wholesaleVal = Number(row['ราคาขายส่ง (Wholesale Price)'] || row['Wholesale Price'] || row['wholesalePrice'] || 28);
          const wholesaleMinVal = Number(row['จำนวนส่งขั้นต่ำ (Wholesale Min Qty)'] || row['Wholesale Min Qty'] || row['wholesaleMinQty'] || 5);
          const stockVal = Number(row['สต๊อกคงเหลือ (Stock)'] || row['Stock'] || row['stock'] || 10);
          const minStockVal = Number(row['จุดแจ้งเตือนขั้นต่ำ (Min Stock)'] || row['Min Stock'] || row['minStock'] || 5);

          const newDocRef = doc(collection(db, 'products'));
          batch.set(newDocRef, {
            barcode: barcodeVal,
            name: nameVal,
            category: catVal,
            cost: costVal,
            retailPrice: retailVal,
            wholesalePrice: wholesaleVal,
            wholesaleMinQty: wholesaleMinVal,
            stock: stockVal,
            minStock: minStockVal
          });
        });

        await batch.commit();
        alert(`นำเข้าสินค้า ${data.length} รายการเสร็จสมบูรณ์เรียบร้อยแล้ว!`);
      } catch (err: any) {
        console.error(err);
        alert('เกิดข้อผิดพลาดระหว่างนำเข้าข้อมูล Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input so same file can be uploaded again if needed
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">จัดการสินค้าและสต๊อก</h1>
          <p className="text-xs text-slate-500">จัดการ แซนด์วิช กำหนดราคาส่ง-ปลีก อัปเดตสต๊อกแจ้งเตือน และนำเข้า/ส่งออกข้อมูล Excel</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import Excel */}
          <label className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer border border-slate-200">
            <Upload className="h-4 w-4" />
            <span>นำเข้า Excel</span>
            <input
              id="import-excel-file"
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>

          {/* Export Excel */}
          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-2 px-3 rounded-xl transition-all border border-emerald-200"
          >
            <Download className="h-4 w-4" />
            <span>ส่งออก Excel</span>
          </button>

          {/* Add Product Button */}
          <button
            id="open-add-product-modal-btn"
            onClick={openAddModal}
            className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold py-2 px-3.5 rounded-xl transition-all shadow-xs"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>เพิ่มแซนด์วิชใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            id="search-product-manager-input"
            type="text"
            placeholder="ค้นหาบาร์โค้ด หรือชื่อแซนด์วิช..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
          />
        </div>

        {/* Category select */}
        <div className="relative">
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold appearance-none bg-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'ทุกหมวดหมู่' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main product table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left font-bold">
                <th className="px-5 py-3 rounded-l-2xl">บาร์โค้ด</th>
                <th className="px-5 py-3">ชื่อแซนด์วิช</th>
                <th className="px-5 py-3">หมวดหมู่</th>
                <th className="px-5 py-3 text-right">ทุน (฿)</th>
                <th className="px-5 py-3 text-right">ปลีก (฿)</th>
                <th className="px-5 py-3 text-right">ราคาส่ง (฿)</th>
                <th className="px-5 py-3 text-center">ส่งขั้นต่ำ</th>
                <th className="px-5 py-3 text-center">คงเหลือ (สต๊อก)</th>
                <th className="px-5 py-3 text-center rounded-r-2xl">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((p) => {
                const isLowStock = p.stock <= p.minStock;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-slate-500">{p.barcode}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 leading-snug">{p.name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">{p.category}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-500">{p.cost}</td>
                    <td className="px-5 py-4 text-right font-extrabold text-amber-500 font-mono">{p.retailPrice}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600 font-mono">{p.wholesalePrice}</td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-500">{p.wholesaleMinQty} ชิ้น</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-bold font-mono ${isLowStock ? 'text-red-500 text-sm bg-red-50 px-2 py-0.5 rounded-md' : 'text-slate-800'}`}>
                          {p.stock} ชิ้น
                        </span>
                        {isLowStock && (
                          <span className="text-[9px] text-red-500 font-semibold mt-0.5 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-0.5 shrink-0" />
                            ใกล้หมด
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center items-center space-x-1.5">
                        <button
                          id={`edit-product-btn-${p.id}`}
                          onClick={() => openEditModal(p)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          id={`delete-product-btn-${p.id}`}
                          onClick={() => handleDelete(p.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm">{editingProduct ? 'แก้ไขข้อมูลแซนด์วิช' : 'เพิ่มแซนด์วิชกล่องใหม่'}</span>
              <button 
                id="close-add-product-modal-btn"
                onClick={() => setModalOpen(false)} 
                className="p-1 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs font-semibold">
              {/* Name */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">ชื่อรายการแซนด์วิช *</label>
                <input
                  id="product-form-name"
                  type="text"
                  required
                  placeholder="เช่น แซนด์วิชแฮมชีสโฮลวีท..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                />
              </div>

              {/* Barcode & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">รหัสบาร์โค้ด *</label>
                  <input
                    id="product-form-barcode"
                    type="text"
                    required
                    placeholder="บาร์โค้ดสินค้า..."
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">หมวดหมู่ *</label>
                  <input
                    id="product-form-category"
                    type="text"
                    required
                    placeholder="เช่น คลาสสิก, สุขภาพ, พรีเมียม..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-3 gap-3 border-t border-slate-50 pt-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">ทุน (฿) *</label>
                  <input
                    id="product-form-cost"
                    type="number"
                    min="0"
                    required
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">ราคาปลีก (฿) *</label>
                  <input
                    id="product-form-retail"
                    type="number"
                    min="0"
                    required
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">ราคาส่ง (฿)</label>
                  <input
                    id="product-form-wholesale"
                    type="number"
                    min="0"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Wholesale Qty and Stocks */}
              <div className="grid grid-cols-3 gap-3 border-b border-slate-50 pb-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">จำนวนส่งขั้นต่ำ</label>
                  <input
                    id="product-form-wholesale-min"
                    type="number"
                    min="1"
                    value={wholesaleMinQty}
                    onChange={(e) => setWholesaleMinQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">คงเหลือ (สต๊อก)</label>
                  <input
                    id="product-form-stock"
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">เตือนเมื่อขั้นต่ำ</label>
                  <input
                    id="product-form-min-stock"
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3.5 pt-2">
                <button
                  id="product-form-cancel"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  id="product-form-submit"
                  type="submit"
                  className="w-2/3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition-colors shadow-xs"
                >
                  บันทึกข้อมูลสินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
