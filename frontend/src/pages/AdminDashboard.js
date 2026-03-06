import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-md">
        <div className="w-20" />
        <div className="relative group/menu mx-auto">
          <button type="button" className="text-sm font-medium cursor-pointer px-3 py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1">
            Administrator
            <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div className="invisible opacity-0 group-hover/menu:visible group-hover/menu:opacity-100 transition-all duration-200 absolute top-full left-0 pt-1 z-[60]">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[220px]">
              <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Setup</div>
              <button
                onClick={() => navigate('/admin/create-plan')}
                className="w-full text-left px-6 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                Journey Plan
              </button>
            </div>
          </div>
        </div>
        <button onClick={logout} className="bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium">Logout</button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <h2 className="text-2xl font-bold text-blue-700">Welcome to WinIt Thinking Mobile</h2>
      </div>
    </div>
  );
}
