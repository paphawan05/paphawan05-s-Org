/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Employee } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Shield, 
  UserCheck, 
  Lock, 
  CheckSquare, 
  Square 
} from 'lucide-react';

interface EmployeeManagerProps {
  employees: Employee[];
}

export default function EmployeeManager({ employees }: EmployeeManagerProps) {
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  
  // Custom Permissions flags
  const [posOnly, setPosOnly] = useState(false);
  const [viewReports, setViewReports] = useState(true);
  const [manageProducts, setManageProducts] = useState(true);
  const [manageSettings, setManageSettings] = useState(true);

  const openAddModal = () => {
    setEditingEmployee(null);
    setName('');
    setEmail('');
    setRole('staff');
    setPosOnly(false);
    setViewReports(true);
    setManageProducts(true);
    setManageSettings(true);
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setRole(emp.role);
    setPosOnly(emp.posOnly);
    setViewReports(emp.viewReports);
    setManageProducts(emp.manageProducts);
    setManageSettings(emp.manageSettings);
    setModalOpen(true);
  };

  const handleRoleChange = (selectedRole: 'admin' | 'staff') => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      // Admins automatically get all permissions
      setPosOnly(false);
      setViewReports(true);
      setManageProducts(true);
      setManageSettings(true);
    } else {
      // Staff has default restricted permissions
      setPosOnly(true);
      setViewReports(false);
      setManageProducts(false);
      setManageSettings(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('กรุณากรอกข้อมูล ชื่อพนักงาน และ อีเมลหลักที่ใช้ Gmail ให้ถูกต้อง');
      return;
    }

    try {
      const empData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        posOnly: role === 'admin' ? false : posOnly,
        viewReports: role === 'admin' ? true : viewReports,
        manageProducts: role === 'admin' ? true : manageProducts,
        manageSettings: role === 'admin' ? true : manageSettings
      };

      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id), empData);
      } else {
        await addDoc(collection(db, 'employees'), empData);
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('บันทึกข้อมูลพนักงานล้มเหลว: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจที่จะลบรายชื่อพนักงานท่านนี้ออก? สิทธิ์การเข้าใช้งานระบบของพนักงานท่านนี้จะสิ้นสุดทันที')) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (err: any) {
      console.error(err);
      alert('ลบข้อมูลล้มเหลว: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">จัดการสิทธิ์และพนักงาน</h1>
          <p className="text-xs text-slate-500">กำหนดสิทธิ์ทีมงาน แคชเชียร์ ผู้จัดการ กำหนดหน้าเมนูที่มองเห็นและปกป้องรายงานต้นทุนและกำไร</p>
        </div>

        <button
          id="open-add-employee-modal-btn"
          onClick={openAddModal}
          className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold py-2 px-3.5 rounded-xl transition-all shadow-xs shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>เพิ่มพนักงานใหม่</span>
        </button>
      </div>

      {/* Employee List Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left font-bold">
                <th className="px-5 py-3 rounded-l-2xl">ชื่อพนักงาน</th>
                <th className="px-5 py-3">อีเมลผูกระบบ Gmail</th>
                <th className="px-5 py-3">ตำแหน่ง (Role)</th>
                <th className="px-5 py-3 text-center">สิทธิ์การขาย</th>
                <th className="px-5 py-3 text-center">สิทธิ์ดูรายงาน</th>
                <th className="px-5 py-3 text-center">สิทธิ์สินค้า/สต๊อก</th>
                <th className="px-5 py-3 text-center">สิทธิ์ตั้งค่าระบบ</th>
                <th className="px-5 py-3 text-center rounded-r-2xl">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800 text-xs">{emp.name}</td>
                  <td className="px-5 py-4 font-mono font-bold text-slate-500 text-xs">{emp.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[9px] ${
                      emp.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Shield className="h-3 w-3 mr-0.5 shrink-0" />
                      {emp.role === 'admin' ? 'ผู้จัดการ (Admin)' : 'พนักงาน (Staff)'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[9px]">ขายได้ ✅</span>
                  </td>
                  <td className="px-5 py-4 text-center font-bold">
                    {emp.viewReports ? (
                      <span className="text-emerald-600">ได้รับสิทธิ์ ✅</span>
                    ) : (
                      <span className="text-red-500 flex items-center justify-center">
                        <Lock className="h-3 w-3 mr-0.5" />
                        บล็อกสิทธิ์ 🔒
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center font-bold">
                    {emp.manageProducts ? (
                      <span className="text-emerald-600">ได้รับสิทธิ์ ✅</span>
                    ) : (
                      <span className="text-red-500 flex items-center justify-center">
                        <Lock className="h-3 w-3 mr-0.5" />
                        บล็อกสิทธิ์ 🔒
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center font-bold">
                    {emp.manageSettings ? (
                      <span className="text-emerald-600">ได้รับสิทธิ์ ✅</span>
                    ) : (
                      <span className="text-red-500 flex items-center justify-center">
                        <Lock className="h-3 w-3 mr-0.5" />
                        บล็อกสิทธิ์ 🔒
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center items-center space-x-1.5">
                      <button
                        id={`edit-employee-btn-${emp.id}`}
                        onClick={() => openEditModal(emp)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        id={`delete-employee-btn-${emp.id}`}
                        onClick={() => handleDelete(emp.id)}
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

      {/* Edit / Add Employee Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm">{editingEmployee ? 'แก้ไขสิทธิ์พนักงาน' : 'เพิ่มและตั้งสิทธิ์พนักงาน'}</span>
              <button 
                id="close-add-employee-modal-btn"
                onClick={() => setModalOpen(false)} 
                className="p-1 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs font-semibold">
              {/* Name */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">ชื่อพนักงาน *</label>
                <input
                  id="employee-form-name"
                  type="text"
                  required
                  placeholder="เช่น พี่สมพงษ์ ขายดี..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-semibold"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">อีเมลผู้เข้าใช้งานหลัก Gmail *</label>
                <input
                  id="employee-form-email"
                  type="email"
                  required
                  placeholder="เช่น sompong@gmail.com..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-mono font-semibold"
                />
              </div>

              {/* Role Select */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">ตำแหน่งหน้าที่หลัก *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="role-admin-btn"
                    type="button"
                    onClick={() => handleRoleChange('admin')}
                    className={`py-2 px-3 border rounded-xl text-xs font-bold text-center ${role === 'admin' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    ผู้จัดการ (Admin)
                  </button>
                  <button
                    id="role-staff-btn"
                    type="button"
                    onClick={() => handleRoleChange('staff')}
                    className={`py-2 px-3 border rounded-xl text-xs font-bold text-center ${role === 'staff' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    พนักงาน (Staff)
                  </button>
                </div>
              </div>

              {/* Specific Custom Permissions flags */}
              {role === 'staff' && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2.5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1.5">กำหนดสิทธิ์รายบุคคลสำหรับพนักงาน</span>
                  
                  {/* View reports */}
                  <label className="flex items-center space-x-2.5 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={viewReports}
                      onChange={(e) => setViewReports(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-slate-700 font-bold">อนุญาตให้เข้าดูแดชบอร์ด-รายงานยอดขาย-กำไร</span>
                  </label>

                  {/* Manage products */}
                  <label className="flex items-center space-x-2.5 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={manageProducts}
                      onChange={(e) => setManageProducts(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-slate-700 font-bold">อนุญาตให้จัดการสินค้า-เพิ่มราคาทุน/ส่ง</span>
                  </label>

                  {/* Manage Settings */}
                  <label className="flex items-center space-x-2.5 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={manageSettings}
                      onChange={(e) => setManageSettings(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-slate-700 font-bold">อนุญาตให้ตั้งโปรโมชั่นและแบ็กอัปข้อมูล</span>
                  </label>
                </div>
              )}

              {role === 'admin' && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[10px] text-amber-800 leading-normal font-semibold">
                  💡 บัญชีผู้จัดการ (Admin) จะได้รับสิทธิ์ทั้งหมดโดยสมบูรณ์ ไม่จำเป็นต้องกำหนดค่าสิทธิ์แยกบุคคล
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3.5 pt-2">
                <button
                  id="employee-form-cancel"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  id="employee-form-submit"
                  type="submit"
                  className="w-2/3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition-colors shadow-xs"
                >
                  บันทึกข้อมูลและสิทธิ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
