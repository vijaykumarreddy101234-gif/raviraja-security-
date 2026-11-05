import React, { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  UserCheck,
  RefreshCw,
  Menu,
  Factory,
  ChevronDown,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types/security';
import { getUserProfiles, resetToDemoData } from '../../services/storage';

interface NavbarProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  onToggleSidebar: () => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChange,
  onToggleSidebar,
}) => {
  const [time, setTime] = useState<string>('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const profiles = getUserProfiles();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SECURITY_SUPERVISOR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SECURITY_STAFF':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shadow-xs font-black tracking-wider text-base">
              RI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base sm:text-lg">
                  RAVIRAJA INDUSTRIES
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                  CRM & SECURITY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                UPVC Profiles, Pipes & Polymer Manufacturing Facility
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right: Live Clock & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Live Plant Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono">{time}</span>
            <span className="text-[10px] text-slate-500">| Gate 1</span>
          </div>

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
              aria-label="Switch User Role"
            >
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {currentUser.name.split('(')[0]}
                </div>
                <div className="text-[10px] text-slate-400">{currentUser.role.replace('_', ' ')}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 text-slate-800 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Switch Active User Role
                  </p>
                  <p className="text-xs text-slate-500">Test different permission workflows</p>
                </div>

                <div className="py-1">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onUserChange(p);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors ${
                        p.id === currentUser.id ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <UserCheck
                        className={`w-4 h-4 mt-0.5 ${
                          p.id === currentUser.id ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-900">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getRoleBadge(
                              p.role
                            )}`}
                          >
                            {p.role.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500">{p.department}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-3 pt-2 mt-1 border-t border-slate-100 flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Need fresh test records?</span>
                  <button
                    onClick={() => {
                      if (confirm('Reset all security and CRM demo data to initial state?')) {
                        resetToDemoData();
                      }
                    }}
                    className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
