/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Sandwich, 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Clock, 
  Tag, 
  ShieldAlert, 
  Database, 
  LogOut, 
  Menu, 
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import Types
import { Product, Member, Transaction, Shift, Promotion, Employee } from './types';

// Import Mock Seeding data
import { INITIAL_PRODUCTS, INITIAL_MEMBERS, INITIAL_PROMOTIONS } from './lib/mockData';

// Import Modular Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import ProductManager from './components/ProductManager';
import MemberManager from './components/MemberManager';
import ShiftManager from './components/ShiftManager';
import PromotionManager from './components/PromotionManager';
import EmployeeManager from './components/EmployeeManager';
import BackupRestore from './components/BackupRestore';
import ReceiptModal from './components/ReceiptModal';

type ActiveMenu = 'dashboard' | 'pos' | 'products' | 'members' | 'shifts' | 'promotions' | 'employees' | 'backup';

export default function App() {
  // Navigation / Loading States
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth User
  const [user, setUser] = useState<{ uid: string; displayName: string; email: string } | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(false);

  // Firestore Synced States
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Computed Active Employee Session
  const currentEmployee = useMemo<Employee | null>(() => {
    if (!user) return null;
    
    // In demo mode or if email matches list of system employees
    const matched = employees.find(e => e.email.toLowerCase() === user.email.toLowerCase());
    if (matched) return matched;

    // Default fallback admin/staff profile if not declared in the employees database yet
    return {
      id: 'fallback_uid',
      name: user.displayName || 'ผู้จัดการร้าน',
      email: user.email,
      role: 'admin',
      posOnly: false,
      viewReports: true,
      manageProducts: true,
      manageSettings: true
    };
  }, [user, employees]);

  // Computed Active Shift
  const activeShift = useMemo<Shift | null>(() => {
    return shifts.find(s => s.status === 'open') || null;
  }, [shifts]);

  // Invoice Receipt Modal trigger
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'พนักงาน',
          email: firebaseUser.email || ''
        });
        setIsDemoUser(false);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sync products from firestore with auto seeding if empty
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(list);

      // Auto-Seed empty catalog with delicious sandwich selections
      if (snapshot.empty) {
        INITIAL_PRODUCTS.forEach(async (p) => {
          try {
            await addDoc(collection(db, 'products'), p);
          } catch (e) {
            console.error('Seeding products error:', e);
          }
        });
      }
    });
    return unsub;
  }, []);

  // Sync members from firestore with auto seeding if empty
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'members'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Member[];
      setMembers(list);

      // Auto-Seed members
      if (snapshot.empty) {
        INITIAL_MEMBERS.forEach(async (m) => {
          try {
            await addDoc(collection(db, 'members'), m);
          } catch (e) {
            console.error('Seeding members error:', e);
          }
        });
      }
    });
    return unsub;
  }, []);

  // Sync transactions, shifts, promotions and employees from Firestore
  useEffect(() => {
    const unsubTx = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      // Sort transactions descending by date
      const sorted = list.sort((a, b) => {
        const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
        const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
        return bTime - aTime;
      });
      setTransactions(sorted);
    });

    const unsubShifts = onSnapshot(collection(db, 'shifts'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shift[];
      const sorted = list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setShifts(sorted);
    });

    const unsubPromos = onSnapshot(collection(db, 'promotions'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Promotion[];
      setPromotions(list);

      // Auto-Seed promotions
      if (snapshot.empty) {
        INITIAL_PROMOTIONS.forEach(async (p) => {
          try {
            await addDoc(collection(db, 'promotions'), p);
          } catch (e) {
            console.error('Seeding promotions error:', e);
          }
        });
      }
    });

    const unsubEmp = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
      setEmployees(list);

      // Seed the first user as employee once they log in or create fallback
    });

    return () => {
      unsubTx();
      unsubShifts();
      unsubPromos();
      unsubEmp();
    };
  }, []);

  // Handle Demo login (skips actual Google OAuth for iframe environments)
  const handleDemoLogin = (role: 'admin' | 'staff') => {
    setIsDemoUser(true);
    setUser({
      uid: `demo_${role}_uid`,
      displayName: role === 'admin' ? 'ผู้จัดการร้าน (เดโม่)' : 'แคชเชียร์หน้าร้าน (เดโม่)',
      email: role === 'admin' ? 'demo_admin@sandwichbox.com' : 'demo_staff@sandwichbox.com'
    });
    
    // Automatically seed a corresponding Employee document to sync permissions correctly if missing
    const existing = employees.find(e => e.email.includes(role));
    if (!existing) {
      addDoc(collection(db, 'employees'), {
        name: role === 'admin' ? 'ผู้จัดการร้าน (เดโม่)' : 'แคชเชียร์หน้าร้าน (เดโม่)',
        email: role === 'admin' ? 'demo_admin@sandwichbox.com' : 'demo_staff@sandwichbox.com',
        role: role,
        posOnly: role === 'staff',
        viewReports: role === 'admin',
        manageProducts: role === 'admin',
        manageSettings: role === 'admin'
      });
    }

    // Go to appropriate starting tab
    if (role === 'staff') {
      setActiveMenu('pos');
    } else {
      setActiveMenu('dashboard');
    }
  };

  const handleSignOut = async () => {
    if (isDemoUser) {
      setUser(null);
      setIsDemoUser(false);
    } else {
      await signOut(auth);
    }
  };

  // Open register shift
  const handleOpenShift = async (openingAmount: number) => {
    if (!user) return;
    const newShift: Omit<Shift, 'id'> = {
      employeeId: user.uid,
      employeeName: currentEmployee?.name || user.displayName,
      startTime: new Date().toISOString(),
      endTime: null,
      openingCash: openingAmount,
      closingCash: null,
      expectedCash: null,
      difference: null,
      salesTotal: 0,
      status: 'open'
    };
    await addDoc(collection(db, 'shifts'), newShift);
  };

  // Close register shift with audits
  const handleCloseShift = async (countedAmount: number) => {
    if (!activeShift) return;

    // Calculate actual shift stats
    const shiftTxList = transactions.filter(t => t.shiftId === activeShift.id);
    const totalSales = shiftTxList.reduce((sum, t) => sum + t.total, 0);
    const cashSales = shiftTxList
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.total, 0);
    const expected = activeShift.openingCash + cashSales;
    const difference = countedAmount - expected;

    const docRef = doc(db, 'shifts', activeShift.id);
    await updateDoc(docRef, {
      endTime: new Date().toISOString(),
      closingCash: countedAmount,
      expectedCash: expected,
      difference: difference,
      salesTotal: totalSales,
      status: 'closed'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <Sandwich className="h-12 w-12 text-amber-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">กำลังเชื่อมต่อระบบหน้าร้านและคลาวด์...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onDemoLogin={handleDemoLogin} />;
  }

  // Permission Checks based on current matched Employee record
  const canViewReports = currentEmployee?.viewReports ?? true;
  const canManageProducts = currentEmployee?.manageProducts ?? true;
  const canManageSettings = currentEmployee?.manageSettings ?? true;

  // Render navigation menu items based on current role permissions
  const menuItems = [
    { id: 'dashboard', label: 'แดชบอร์ดสรุปผล', icon: LayoutDashboard, permission: canViewReports },
    { id: 'pos', label: 'ระบบขายหน้าร้าน POS', icon: ShoppingBag, permission: true },
    { id: 'products', label: 'คลังสินค้าและสต๊อก', icon: Package, permission: canManageProducts },
    { id: 'members', label: 'สมาชิกร้านสะสมแต้ม', icon: Users, permission: true },
    { id: 'shifts', label: 'กะทำงานพนักงาน', icon: Clock, permission: true },
    { id: 'promotions', label: 'โปรโมชั่นการตลาด', icon: Tag, permission: canManageSettings },
    { id: 'employees', label: 'จัดการสิทธิ์พนักงาน', icon: ShieldAlert, permission: canManageSettings },
    { id: 'backup', label: 'สำรองและกู้ข้อมูล', icon: Database, permission: canManageSettings },
  ];

  const visibleMenuItems = menuItems.filter(item => item.permission);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-800 text-[#F1F5F9] shrink-0 justify-between border-r border-slate-700">
        <div className="flex flex-col flex-1">
          {/* Logo Brand */}
          <div className="h-14 px-4 bg-slate-900 flex items-center space-x-2 border-b border-slate-700 shrink-0">
            <div className="p-1.5 bg-amber-500 rounded text-white">
              <Sandwich className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-extrabold text-xs tracking-wide text-amber-500 block">SANDWICH BOX</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-mono">POS & Management</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-1.5 space-y-0.5 overflow-y-auto">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  id={`menu-link-${item.id}`}
                  onClick={() => setActiveMenu(item.id as ActiveMenu)}
                  className={`w-full flex items-center space-x-2.5 px-4 py-2.5 border-l-4 text-[12px] font-semibold text-left transition-all ${
                    isActive 
                      ? 'bg-slate-700 border-amber-500 text-white font-bold' 
                      : 'border-transparent text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile section at sidebar bottom */}
        <div className="p-3 bg-slate-900 border-t border-slate-700 flex flex-col space-y-2.5 shrink-0">
          <div className="flex items-center space-x-2.5 text-xs">
            <div className="h-7 w-7 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <p className="font-bold text-slate-200 text-[11px]">{currentEmployee?.name || user.displayName}</p>
              <span className="text-[9px] text-slate-400 block leading-tight truncate">{user.email}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-800/60 pt-2 flex flex-col space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="real-time-indicator shrink-0"></span>
              <span className="font-semibold text-slate-300">Firebase Connected</span>
            </div>
            <div className="font-mono text-[9px] text-slate-500 truncate">Project: SANDWICH-BOX-PRD</div>
          </div>

          <button
            id="sign-out-btn"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded text-[11px] font-bold bg-slate-800 hover:bg-red-900 hover:text-white transition-colors text-slate-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden h-16 bg-slate-900 text-white flex items-center justify-between px-4 shrink-0 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500 rounded-lg text-white">
            <Sandwich className="h-4.5 w-4.5" />
          </div>
          <span className="font-extrabold text-sm tracking-wide text-amber-400">SANDWICH BOX</span>
        </div>

        <button 
          id="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* MOBILE NAVIGATION DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-950 text-white px-4 py-3 space-y-1.5 shrink-0 border-b border-slate-800"
          >
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-menu-link-${item.id}`}
                  onClick={() => {
                    setActiveMenu(item.id as ActiveMenu);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <div className="truncate text-xs">
                <p className="font-bold">{currentEmployee?.name || user.displayName}</p>
                <span className="text-[10px] text-slate-500">{user.email}</span>
              </div>
              <button
                id="mobile-sign-out-btn"
                onClick={handleSignOut}
                className="flex items-center space-x-1.5 py-1.5 px-3 bg-red-950 text-red-400 border border-red-900 text-xs font-semibold rounded-lg"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>ออก</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto min-h-0">
        
        {/* Warning if register shift is NOT opened */}
        {activeMenu === 'pos' && !activeShift && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center text-red-800">
              <AlertCircle className="h-5 w-5 mr-2 shrink-0 text-red-500" />
              <span>กะทำงานยังไม่เปิด ⚠️ ! คุณจำเป็นต้องระบุเงินทอนเปิดกะเพื่อเข้าหน้าจอขายสินค้า</span>
            </div>
            <button
              id="goto-shifts-btn"
              onClick={() => setActiveMenu('shifts')}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-extrabold transition-colors shadow-xs"
            >
              เปิดกะทำงานขาย
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto h-full">
          {activeMenu === 'dashboard' && (
            <Dashboard 
              products={products} 
              transactions={transactions} 
              shifts={shifts}
              activeShift={activeShift}
            />
          )}

          {activeMenu === 'pos' && (
            <POS 
              products={products} 
              members={members} 
              promotions={promotions}
              activeShift={activeShift}
              currentUser={user}
              onOpenShiftRequired={() => setActiveMenu('shifts')}
              onTransactionComplete={(tx) => setActiveReceipt(tx)}
            />
          )}

          {activeMenu === 'products' && (
            <ProductManager products={products} />
          )}

          {activeMenu === 'members' && (
            <MemberManager members={members} />
          )}

          {activeMenu === 'shifts' && (
            <ShiftManager 
              shifts={shifts} 
              activeShift={activeShift} 
              transactions={transactions}
              currentUser={user}
              onOpenShift={handleOpenShift}
              onCloseShift={handleCloseShift}
            />
          )}

          {activeMenu === 'promotions' && (
            <PromotionManager promotions={promotions} products={products} />
          )}

          {activeMenu === 'employees' && (
            <EmployeeManager employees={employees} />
          )}

          {activeMenu === 'backup' && (
            <BackupRestore 
              products={products}
              members={members}
              transactions={transactions}
              shifts={shifts}
              promotions={promotions}
              employees={employees}
            />
          )}
        </div>
      </main>

      {/* Thermal Receipt Print Animation popup */}
      <AnimatePresence>
        {activeReceipt && (
          <ReceiptModal 
            transaction={activeReceipt} 
            onClose={() => setActiveReceipt(null)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}
