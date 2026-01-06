import { NavLink, useLocation } from 'react-router-dom';
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
  ChevronDown,
  ChevronUp,
  Trash,
  FileText,
  Package,
  HardDrive,
  Monitor
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  path?: string;
  icon: any;
  roles: string[];
  children?: MenuItem[];
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
    title: 'Asset Management',
    icon: Package,
    roles: ['company_super_admin'],
    children: [
      {
        title: 'Dashboard',
        path: '/assets/dashboard',
        icon: LayoutDashboard,
        roles: ['company_super_admin'],
      },
      {
        title: 'Hardware Assets',
        path: '/assets/hardware',
        icon: HardDrive,
        roles: ['company_super_admin'],
      },
      {
        title: 'Software Assets',
        path: '/assets/software',
        icon: Monitor,
        roles: ['company_super_admin'],
      },
    ],
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
  },
  {
    title: 'Company Settings',
    path: '/company-settings',
    icon: Settings,
    roles: ['company_super_admin'],
  },
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
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Asset Management']);

  // If user is 'company_user', only show Password Creation
  let filteredMenuItems = menuItems.filter((item) => item.roles.includes(user?.role || ''));
  if (user?.role === 'company_user') {
    filteredMenuItems = menuItems.filter((item) => item.title === 'Password Creation');
  }

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isAssetManagementActive = location.pathname.startsWith('/assets');

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = item.path ? location.pathname === item.path : false;
    const isChildActive = hasChildren && item.children?.some(child => 
      child.path && location.pathname === child.path
    );

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              (isActive || isChildActive)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              collapsed && 'justify-center px-0',
              level > 0 && 'ml-4'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </>
            )}
          </button>
          {!collapsed && isExpanded && item.children && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children
                .filter(child => child.roles.includes(user?.role || ''))
                .map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path!}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            collapsed && 'justify-center px-0',
            level > 0 && 'ml-4'
          )
        }
        onClick={() => {
          if (mobileOpen) setMobileOpen(false);
        }}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{item.title}</span>}
      </NavLink>
    );
  };

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
        {filteredMenuItems.map(item => renderMenuItem(item))}
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