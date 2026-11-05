import React from 'react';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  UserCheck,
  RotateCcw,
  QrCode,
  FileBarChart2,
  Settings,
  History,
  Boxes,
  Briefcase,
  Building2,
  Receipt,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '../../types/security';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  userRole: UserRole;
  pendingInwardCount: number;
  pendingOutwardCount: number;
  visitorsInsideCount: number;
  pendingReturnCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
  userRole,
  pendingInwardCount,
  pendingOutwardCount,
  visitorsInsideCount,
  pendingReturnCount,
}) => {
  const securityNavItems = [
    {
      id: 'security-dashboard',
      label: 'Security Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'inward-entry',
      label: 'Inward Entry (Raw Material)',
      icon: ArrowDownLeft,
      badge: pendingInwardCount > 0 ? pendingInwardCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'outward-entry',
      label: 'Outward Dispatch',
      icon: ArrowUpRight,
      badge: pendingOutwardCount > 0 ? pendingOutwardCount : null,
      badgeColor: 'bg-blue-500 text-white',
    },
    {
      id: 'visitor-management',
      label: 'Visitor Management',
      icon: Users,
      badge: visitorsInsideCount > 0 ? `${visitorsInsideCount} Inside` : null,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'security-staff',
      label: 'Staff & Attendance',
      icon: UserCheck,
      badge: null,
    },
    {
      id: 'return-material',
      label: 'Return Material & Stock',
      icon: RotateCcw,
      badge: pendingReturnCount > 0 ? pendingReturnCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'gate-pass',
      label: 'Gate Pass Register',
      icon: QrCode,
      badge: null,
    },
    {
      id: 'security-reports',
      label: 'Security Reports',
      icon: FileBarChart2,
      badge: null,
    },
    {
      id: 'security-settings',
      label: 'Security Settings',
      icon: Settings,
      badge: null,
      restricted: userRole === 'SECURITY_STAFF',
    },
    {
      id: 'audit-logs',
      label: 'Audit Trail & History',
      icon: History,
      badge: null,
    },
  ];

  const crmNavItems = [
    {
      id: 'crm-overview',
      label: 'CRM Overview',
      icon: Briefcase,
    },
    {
      id: 'crm-inventory',
      label: 'Inventory & Stock Sync',
      icon: Boxes,
      highlight: true,
    },
    {
      id: 'crm-customers',
      label: 'Customers & Dealers',
      icon: Building2,
    },
    {
      id: 'crm-sales',
      label: 'Sales Invoices & Orders',
      icon: Receipt,
    },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[57px] left-0 z-40 h-full lg:h-[calc(100vh-57px)] w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out shrink-0 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header in drawer */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Navigation Menu</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
          >
            Close
          </button>
        </div>

        {/* Security Module Section */}
        <div className="px-3 pt-4 pb-2">
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center justify-between">
            <span>Security Management</span>
            <span className="text-[9px] bg-emerald-950/80 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/40">
              ACTIVE
            </span>
          </div>
          <nav className="space-y-1">
            {securityNavItems.map((item) => {
              if (item.restricted) return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        item.badgeColor || 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* CRM Core Section */}
        <div className="px-3 pt-4 pb-6 mt-2 border-t border-slate-800/80">
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center justify-between">
            <span>Raviraja CRM Core</span>
            <span className="text-[9px] text-slate-500">INTEGRATED</span>
          </div>
          <nav className="space-y-1">
            {crmNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.highlight && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                      LIVE
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Plant Status Footnote */}
        <div className="mt-auto p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Main Gate Security Gate 1</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            24x7 CCTV & Weighbridge Link Active. Naroda Industrial Area, Gujarat.
          </p>
        </div>
      </aside>
    </>
  );
};
