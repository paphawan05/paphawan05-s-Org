/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import { LogIn, Key, Loader2, Sandwich } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onDemoLogin: (role: 'admin' | 'staff') => void;
}

export default function Login({ onDemoLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('ป๊อปอัพถูกบล็อกโดยเบราว์เซอร์ของคุณ กรุณาอนุญาตป๊อปอัพหรือใช้ปุ่มเข้าสู่ระบบทดลอง');
      } else {
        setError('การเข้าสู่ระบบล้มเหลว: ' + (err.message || 'ข้อผิดพลาดที่ไม่รู้จัก'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error(err);
      setError('ไม่สามารถสร้างเซสชันชั่วคราวได้: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20"
        >
          <Sandwich className="h-12 w-12" />
        </motion.div>
        
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 font-sans">
          Sandwich Box POS
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          ระบบจัดการและขายหน้าร้านสำหรับร้านแซนด์วิชกล่อง
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white py-8 px-4 shadow-xl shadow-slate-100 rounded-2xl sm:px-10 border border-slate-100"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              id="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-slate-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none transition-colors"
            >
              {loading ? (
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-slate-500" />
              ) : (
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 15 0 12 0 7.35 0 3.39 2.67 1.47 6.56l3.84 2.98C6.24 6.74 8.93 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.31 14.58c-.24-.73-.38-1.51-.38-2.33 0-.82.14-1.6.38-2.33L1.47 6.94C.53 8.89 0 11.08 0 13.41c0 2.33.53 4.52 1.47 6.47l3.84-2.97z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.2 1.1-3.07 0-5.76-1.7-6.69-4.51l-3.84 2.98C3.39 21.33 7.35 24 12 24z"
                  />
                </svg>
              )}
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google (Gmail)'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-mono">OR IF IN PREVIEW IFRAME</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="demo-admin-login-btn"
                onClick={() => onDemoLogin('admin')}
                className="flex items-center justify-center px-4 py-2.5 border border-amber-200 rounded-xl bg-amber-50 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Key className="mr-1.5 h-4 w-4" />
                โหมดผู้จัดการ (Admin)
              </button>
              <button
                id="demo-staff-login-btn"
                onClick={() => onDemoLogin('staff')}
                className="flex items-center justify-center px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <LogIn className="mr-1.5 h-4 w-4" />
                โหมดพนักงาน (Staff)
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
              * เนื่องจากระบบทำงานใน Iframe ของ AI Studio บางเบราว์เซอร์อาจบล็อกหน้าต่างป๊อปอัพ Google OAuth ท่านสามารถใช้ปุ่ม "โหมดผู้จัดการ" หรือ "โหมดพนักงาน" เพื่อเข้าทดสอบระบบได้ทันทีโดยไม่ต้องเชื่อมบัญชีจริง
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
