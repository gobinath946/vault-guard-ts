import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  Settings, 
  Users, 
  FolderTree, 
  KeyRound,
  BookOpen, 
  Key,
  ChevronLeft,
  ChevronRight,
  Trash
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  path: string;
  icon: any;
  roles: string[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['master_admin', 'company_super_admin', 'company_user'],
  },
  {
    title: 'Companies',
    path: '/companies',
    icon: Building2,
    roles: ['master_admin'],
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: Settings,
    roles: ['master_admin'],
  },
  {
    title: 'Users',
    path: '/users',
    icon: Users,
    roles: ['company_super_admin'],
  },
  {
    title: 'Password Creation',
    path: '/password-creation',
    icon: KeyRound,
    roles: ['company_super_admin', 'company_user'],
  },
  {
    title: 'Trash',
    path: '/trash',
    icon: Trash,
    roles: ['company_super_admin'],
  }
];

export const Sidebar = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) => {
  const { user } = useAuth();

  // If user is 'company_user', only show Password Creation
  let filteredMenuItems = menuItems.filter((item) => item.roles.includes(user?.role || ''));
  if (user?.role === 'company_user') {
    filteredMenuItems = menuItems.filter((item) => item.title === 'Password Creation');
  }

  // Desktop sidebar
  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 hover:bg-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                collapsed && 'justify-center px-0'
              )
            }
            onClick={() => {
              if (mobileOpen) setMobileOpen(false);
            }}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'z-40 hidden md:fixed md:left-0 md:top-16 md:h-[calc(100vh-4rem)] border-r border-border bg-card transition-all duration-300 md:flex flex-col',
          collapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
        {sidebarContent}
      </aside>
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 bg-card border-r border-border flex flex-col h-full animate-slide-in-left">
            {sidebarContent}
          </div>
          {/* Backdrop */}
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
};