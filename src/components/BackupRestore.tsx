/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Member, Transaction, Shift, Promotion, Employee, BackupData } from '../types';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { 
  Download, 
  Upload, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  Loader2
} from 'lucide-react';

interface BackupRestoreProps {
  products: Product[];
  members: Member[];
  transactions: Transaction[];
  shifts: Shift[];
  promotions: Promotion[];
  employees: Employee[];
}

export default function BackupRestore({
  products,
  members,
  transactions,
  shifts,
  promotions,
  employees
}: BackupRestoreProps) {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Manual Backup: Package all Firestore local states into a JSON file
  const handleExportBackup = async () => {
    setExportLoading(true);
    setStatusMsg(null);
    try {
      const backup: BackupData = {
        products,
        members,
        transactions,
        shifts,
        promotions,
        employees,
        backupTime: new Date().toISOString()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Sandwich_Box_POS_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMsg('✅ สำรองข้อมูลระบบเสร็จสิ้น! บันทึกไฟล์สำรองข้อมูลลงเครื่องเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error(err);
      setStatusMsg('❌ การสำรองข้อมูลล้มเหลว: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Manual Restore: Parse JSON file and write to Firestore
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImportLoading(true);
      setStatusMsg(null);
      try {
        const jsonStr = evt.target?.result as string;
        const backup: BackupData = JSON.parse(jsonStr);

        // Simple schema checks
        if (!backup.products || !backup.members || !backup.employees) {
          throw new Error('โครงสร้างไฟล์สำรองข้อมูลไม่ถูกต้อง กรุณาเลือกไฟล์ที่ถูกบันทึกจากระบบนี้เท่านั้น');
        }

        if (!confirm(`คำเตือน ⚠️: การกู้คืน (Restore) จะทำการเขียนทับข้อมูลที่มีอยู่เดิมในระบบด้วยข้อมูลสำรองจำนวน ${backup.products.length} รายการสินค้า, ${backup.members.length} สมาชิก และ ${backup.transactions.length} รายการยอดขาย ประสงค์จะดำเนินการต่อใช่หรือไม่?`)) {
          setImportLoading(false);
          return;
        }

        // Restore collections via batches
        const writeCollection = async (colName: string, items: any[]) => {
          const batch = writeBatch(db);
          items.forEach(item => {
            const docRef = doc(db, colName, item.id);
            batch.set(docRef, item);
          });
          await batch.commit();
        };

        // Write all collections sequentially
        await writeCollection('products', backup.products);
        await writeCollection('members', backup.members);
        await writeCollection('promotions', backup.promotions || []);
        await writeCollection('employees', backup.employees);
        
        if (backup.shifts && backup.shifts.length > 0) {
          await writeCollection('shifts', backup.shifts);
        }
        if (backup.transactions && backup.transactions.length > 0) {
          await writeCollection('transactions', backup.transactions);
        }

        setStatusMsg('✅ กู้คืนข้อมูลระบบ (Restore) สำเร็จลุล่วงเรียบร้อยแล้ว! ข้อมูลทั้งหมดถูกอัปเดตและซิงค์เรียลไทม์');
      } catch (err: any) {
        console.error(err);
        setStatusMsg('❌ เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + err.message);
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // clear value
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ศูนย์สำรองและกู้คืนข้อมูล (Backup & Restore)</h1>
        <p className="text-xs text-slate-500">สำรองฐานข้อมูล แซนด์วิช สมาชิก ประวัติการขาย และกะการทำงาน เพื่อความปลอดภัยป้องกันข้อมูลสูญหาย</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Backup Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl inline-block">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm">ดาวน์โหลดไฟล์สำรองข้อมูล (Manual Backup)</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              บันทึกโครงสร้างข้อมูลสินค้า สต๊อกคงเหลือ รายชื่อลูกค้าสมาชิก แต้มสะสม ประวัติกะการทำงาน และยอดขายทั้งหมด ออกมาในรูปแบบไฟล์ JSON นำไปจัดเก็บไว้ภายนอกได้อย่างปลอดภัย
            </p>
          </div>

          <button
            id="export-backup-json-btn"
            onClick={handleExportBackup}
            disabled={exportLoading}
            className="w-full flex items-center justify-center space-x-1.5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/10 transition-colors disabled:bg-slate-300"
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4.5 w-4.5" />
            )}
            <span>{exportLoading ? 'กำลังรวบรวมและสร้างไฟล์...' : 'ดาวน์โหลดไฟล์สำรองข้อมูล (.json)'}</span>
          </button>
        </div>

        {/* Import Restore Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl inline-block">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm">กู้คืนข้อมูลสำรอง (Restore Database)</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              อัปโหลดไฟล์สำรองข้อมูล JSON ที่ดาวน์โหลดเก็บไว้ก่อนหน้า เพื่อกู้คืนสถานะข้อมูลเดิม หรือซิงค์ข้อมูลทั้งหมดไปยังเครื่องใหม่ทันที ข้อมูลเดิมจะถูกเขียนทับด้วยข้อมูลในไฟล์สำรอง
            </p>
          </div>

          <label className="w-full flex items-center justify-center space-x-1.5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer text-center">
            {importLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4.5 w-4.5" />
            )}
            <span>{importLoading ? 'กำลังนำเข้าและกู้คืนฐานข้อมูล...' : 'อัปโหลดไฟล์เพื่อกู้คืน (.json)'}</span>
            <input
              id="import-backup-json-file"
              type="file"
              accept=".json"
              disabled={importLoading}
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>

      </div>

      {/* Info Warning Alert */}
      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-800 leading-relaxed font-semibold flex space-x-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
        <div>
          <span className="font-bold">ข้อควรระวังสำคัญ ⚠️:</span>
          <p className="mt-0.5">ระบบจะสำรองข้อมูลอัตโนมัติบนฐานข้อมูล Cloud Firestore ของ Google เป็นระบบเรียลไทม์อยู่แล้ว การสำรองข้อมูลแมนนวลด้วยตนเองนี้เหมาะสำหรับเมื่อต้องการย้ายบัญชี Google หรือกู้คืนฐานข้อมูลเดิมกรณีประวัติถูกล้าง</p>
        </div>
      </div>

      {/* Status Notifications Banner */}
      {statusMsg && (
        <div className="p-4 bg-white border border-slate-100 rounded-2xl text-xs font-bold shadow-xs text-center">
          {statusMsg}
        </div>
      )}
    </div>
  );
}
