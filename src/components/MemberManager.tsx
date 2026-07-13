/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download, 
  X, 
  User, 
  Coins 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface MemberManagerProps {
  members: Member[];
}

export default function MemberManager({ members }: MemberManagerProps) {
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [points, setPoints] = useState<number>(0);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      return m.name.toLowerCase().includes(search.toLowerCase()) || 
             m.phone.includes(search) || 
             (m.email && m.email.toLowerCase().includes(search.toLowerCase()));
    });
  }, [members, search]);

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setPhone('');
    setEmail('');
    setPoints(0);
    setModalOpen(true);
  };

  const openEditModal = (m: Member) => {
    setEditingMember(m);
    setName(m.name);
    setPhone(m.phone);
    setEmail(m.email || '');
    setPoints(m.points);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('กรุณากรอกข้อมูล ชื่อ และ เบอร์โทรศัพท์ สำคัญ!');
      return;
    }

    // Basic phone pattern verification
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 10) {
      alert('กรุณากรอกเบอร์โทรศัพท์มือถือที่ถูกต้อง (9-10 หลัก)');
      return;
    }

    try {
      const mData = {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || null,
        points: Number(points) || 0
      };

      if (editingMember) {
        // Update
        const docRef = doc(db, 'members', editingMember.id);
        await updateDoc(docRef, mData);
      } else {
        // Add
        await addDoc(collection(db, 'members'), {
          ...mData,
          createdAt: new Date().toISOString()
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลสมาชิก: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายชื่อสมาชิกท่านนี้? ประวัติคะแนนสะสมจะสูญหายถาวร!')) return;
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบสมาชิก: ' + err.message);
    }
  };

  // Export Member List to Excel
  const handleExportExcel = () => {
    const rows = members.map(m => ({
      'ชื่อ-นามสกุลสมาชิก': m.name,
      'เบอร์โทรศัพท์': m.phone,
      'อีเมล': m.email || 'ไม่ได้ระบุ',
      'แต้มสะสมปัจจุบัน': m.points,
      'วันที่สมัครสมาชิก': new Date(m.createdAt).toLocaleDateString('th-TH')
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อสมาชิก");
    XLSX.writeFile(wb, "Sandwich_Box_Members.xlsx");
  };

  return (
    <div className="space-y-6">
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">จัดการข้อมูลลูกค้าสมาชิก</h1>
          <p className="text-xs text-slate-500">บันทึกข้อมูลสมาชิกไม่จำกัด ตรวจสอบ คืนแต้ม หรือสะสมแต้มส่วนลดแลกซื้อสินค้าแซนด์วิชกล่อง</p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Export Excel */}
          <button
            id="export-members-excel-btn"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-2 px-3 rounded-xl transition-all border border-emerald-200"
          >
            <Download className="h-4 w-4" />
            <span>ส่งออก Excel สมาชิก</span>
          </button>

          {/* Add Member Button */}
          <button
            id="open-add-member-modal-btn"
            onClick={openAddModal}
            className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold py-2 px-3.5 rounded-xl transition-all shadow-xs"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>สมัครสมาชิกใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            id="search-member-input"
            type="text"
            placeholder="ค้นหาชื่อสมาชิก, เบอร์โทรศัพท์, หรืออีเมล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold font-mono"
          />
        </div>
      </div>

      {/* Main Members table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left font-bold">
                <th className="px-5 py-3 rounded-l-2xl">ชื่อ-นามสกุลสมาชิก</th>
                <th className="px-5 py-3">เบอร์โทรศัพท์มือถือ</th>
                <th className="px-5 py-3">อีเมลติดต่อ</th>
                <th className="px-5 py-3 text-center">แต้มสะสมทั้งหมด</th>
                <th className="px-5 py-3">สมัครเมื่อวันที่</th>
                <th className="px-5 py-3 text-center rounded-r-2xl">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-slate-800 text-xs">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-slate-600 text-xs">{m.phone}</td>
                  <td className="px-5 py-4 text-slate-500 font-mono text-xs">{m.email || '-'}</td>
                  <td className="px-5 py-4 text-center">
                    <div className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-50 text-amber-700 font-extrabold rounded-lg font-mono">
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      <span>{m.points} p</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400 font-semibold font-mono">
                    {new Date(m.createdAt).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center items-center space-x-1.5">
                      <button
                        id={`edit-member-btn-${m.id}`}
                        onClick={() => openEditModal(m)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        id={`delete-member-btn-${m.id}`}
                        onClick={() => handleDelete(m.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm">{editingMember ? 'แก้ไขข้อมูลสมาชิก' : 'สมัครสมาชิกใหม่'}</span>
              <button 
                id="close-add-member-modal-btn"
                onClick={() => setModalOpen(false)} 
                className="p-1 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs font-semibold">
              {/* Name */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">ชื่อ-นามสกุลสมาชิก *</label>
                <input
                  id="member-form-name"
                  type="text"
                  required
                  placeholder="เช่น นายรักดี มีสุข..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">เบอร์โทรศัพท์มือถือ *</label>
                <input
                  id="member-form-phone"
                  type="text"
                  required
                  placeholder="เช่น 0812345678..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-mono font-semibold"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">อีเมลติดต่อ (ไม่บังคับ)</label>
                <input
                  id="member-form-email"
                  type="email"
                  placeholder="เช่น member@gmail.com..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-mono font-semibold"
                />
              </div>

              {/* Points (Edit only) */}
              {editingMember && (
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">คะแนนสะสมปัจจุบัน</label>
                  <input
                    id="member-form-points"
                    type="number"
                    min="0"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-mono font-semibold bg-amber-50/50"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3.5 pt-2">
                <button
                  id="member-form-cancel"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  id="member-form-submit"
                  type="submit"
                  className="w-2/3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition-colors shadow-xs"
                >
                  {editingMember ? 'บันทึกประวัติสมาชิก' : 'ลงทะเบียนสมัคร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
