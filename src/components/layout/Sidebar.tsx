import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRef, useCallback } from 'react';
import {
    LayoutDashboard,
    Building2,
    Settings,
    Users,
    KeyRound,
    ChevronDown,
    ChevronUp,
    Trash,
    Package,
    HardDrive,
    Monitor,
    UserCheck,
    Shield,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
        title: 'My Assets',
        icon: Package,
        roles: ['company_user'],
        children: [
            {
                title: 'Hardware Asset',
                path: '/my-assets/hardware',
                icon: HardDrive,
                roles: ['company_user'],
            },
            {
                title: 'Software Asset',
                path: '/my-assets/software',
                icon: Monitor,
                roles: ['company_user'],
            },
        ],
    },
    {
        title: 'Checkout Process',
        path: '/checkout',
        icon: UserCheck,
        roles: ['company_super_admin'],
    },
    {
        title: 'Passwords',
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
    const navigate = useNavigate();
    // Use ref to track expanded state to prevent re-renders during navigation
    const getInitialExpanded = () => {
        const initialExpanded = new Set<string>();
        
        if (location.pathname.startsWith('/assets')) {
            initialExpanded.add('Asset Management');
        }
        if (location.pathname.startsWith('/my-assets')) {
            initialExpanded.add('My Assets');
        }
        
        return initialExpanded;
    };
    
    const expandedItemsRef = useRef<Set<string>>(getInitialExpanded());

    // State only for triggering re-renders when user manually toggles
    const [, setForceUpdate] = useState({});
    const triggerRerender = useCallback(() => setForceUpdate({}), []);

    // Auto-expand on initial load or when navigating to a new section (but not on child navigation)
    const hasInitialized = useRef(false);
    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            return;
        }

        let shouldUpdate = false;
        
        if (location.pathname.startsWith('/assets') && !expandedItemsRef.current.has('Asset Management')) {
            expandedItemsRef.current.add('Asset Management');
            shouldUpdate = true;
        }
        if (location.pathname.startsWith('/my-assets') && !expandedItemsRef.current.has('My Assets')) {
            expandedItemsRef.current.add('My Assets');
            shouldUpdate = true;
        }
        
        if (shouldUpdate) {
            triggerRerender();
        }
    }, [location.pathname, triggerRerender]);

    const filteredMenuItems = useMemo(
        () => menuItems.filter((item) => item.roles.includes(user?.role || '')),
        [user?.role]
    );

    const toggleExpanded = useCallback((title: string) => {
        if (expandedItemsRef.current.has(title)) {
            expandedItemsRef.current.delete(title);
        } else {
            expandedItemsRef.current.add(title);
        }
        triggerRerender();
    }, [triggerRerender]);

    const handleMenuItemClick = useCallback((item: MenuItem, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const hasChildren = item.children && item.children.length > 0;
        
        if (hasChildren && collapsed) {
            setCollapsed(false);
            expandedItemsRef.current.add(item.title);
            triggerRerender();
            
            if (item.children && item.children.length > 0 && item.children[0].path) {
                navigate(item.children[0].path);
            }
        } else if (hasChildren) {
            toggleExpanded(item.title);
        }
    }, [collapsed, setCollapsed, navigate, toggleExpanded, triggerRerender]);

    const renderMenuItem = useCallback((item: MenuItem, level: number = 0) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItemsRef.current.has(item.title);
        const isActive = item.path ? location.pathname === item.path : false;
        const isChildActive = hasChildren && item.children?.some(child =>
            child.path && location.pathname === child.path
        );

        if (hasChildren) {
            const IconComponent = item.icon;
            
            const buttonElement = (
                <button
                    onClick={(e) => handleMenuItemClick(item, e)}
                    className={cn(
                        'flex w-full items-center rounded-lg py-2 text-sm font-medium transition-all duration-300 ease-in-out mb-1 relative',
                        (isActive || isChildActive)
                            ? collapsed 
                                ? 'text-primary-foreground'
                                : 'bg-primary text-primary-foreground shadow-md'
                            : collapsed
                                ? 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        collapsed ? 'justify-center px-1.5 min-w-[40px]' : 'gap-3 px-3'
                    )}
                    style={collapsed ? { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}
                >
                    <div className={cn(
                        'flex items-center justify-center rounded-lg w-8 h-8 transition-all duration-300 ease-in-out',
                        (isActive || isChildActive) && collapsed ? 'bg-primary' : ''
                    )}>
                        <IconComponent 
                            className={cn(
                                "h-5 w-5 flex-shrink-0 transition-all duration-300 ease-in-out",
                                collapsed 
                                    ? (isActive || isChildActive) 
                                        ? "text-primary-foreground" 
                                        : "text-muted-foreground group-hover:text-primary"
                                    : "text-current"
                            )}
                            style={{ 
                                display: 'block', 
                                visibility: 'visible', 
                                minWidth: '20px', 
                                minHeight: '20px', 
                                flexShrink: 0, 
                                opacity: 1, 
                                pointerEvents: 'auto',
                                position: 'relative',
                                zIndex: 10
                            }} 
                        />
                    </div>
                    {!collapsed && (
                        <div className="flex items-center justify-between flex-1 transition-all duration-300 ease-in-out">
                            <span className="flex-1 text-left transition-all duration-300 ease-in-out">{item.title}</span>
                            <div className="transition-transform duration-300 ease-in-out">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                        </div>
                    )}
                </button>
            );

            return (
                <div key={item.title} className={cn("px-3", collapsed && "px-1")}>
                    {collapsed ? (
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                {buttonElement}
                            </TooltipTrigger>
                            <TooltipContent side="right" align="center" className="z-50">
                                {item.title}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        buttonElement
                    )}
                    {!collapsed && isExpanded && item.children && (
                        <div 
                            className="ml-6 space-y-1"
                        >
                            {item.children.map(child => renderMenuItem(child, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        const IconComponent = item.icon;
        
        const linkElement = (
            <NavLink
                to={item.path!}
                className={({ isActive }) =>
                    cn(
                        'flex items-center rounded-lg py-2 text-sm font-medium transition-all duration-300 ease-in-out mb-1 relative',
                        isActive
                            ? collapsed 
                                ? 'text-primary-foreground'
                                : 'bg-primary text-primary-foreground shadow-md'
                            : collapsed
                                ? 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        collapsed ? 'justify-center px-1.5 min-w-[40px]' : 'gap-3 px-3'
                    )
                }
                style={collapsed ? { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}
            >
                <div className={cn(
                    'flex items-center justify-center rounded-lg w-8 h-8 transition-all duration-300 ease-in-out',
                    isActive && collapsed ? 'bg-primary' : ''
                )}>
                    <IconComponent 
                        className={cn(
                            "h-5 w-5 flex-shrink-0 transition-all duration-300 ease-in-out",
                            collapsed 
                                  ? isActive
                                        ? "text-primary-foreground" 
                                        : "text-muted-foreground"
                                : "text-current"
                        )}
                        style={{ 
                            display: 'block', 
                            visibility: 'visible', 
                            minWidth: '20px', 
                            minHeight: '20px', 
                            flexShrink: 0, 
                            opacity: 1, 
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 10
                        }} 
                    />
                </div>
                {!collapsed && (
                    <span className="transition-all duration-300 ease-in-out">{item.title}</span>
                )}
            </NavLink>
        );

        return (
            <div key={item.path} className={cn("px-3", collapsed && "px-1")}>
                {collapsed ? (
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            {linkElement}
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center" className="z-50">
                            {item.title}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    linkElement
                )}
            </div>
        );
    }, [expandedItemsRef, location.pathname, collapsed, handleMenuItemClick]);

    const sidebarContent = (
        <TooltipProvider>
            <div className="flex h-full flex-col bg-white">
                <div className={cn(
                    "flex h-16 items-center border-b border-border/50 bg-white sticky top-0 z-10 transition-all duration-300 ease-in-out",
                    collapsed ? "px-2 justify-center" : "pr-6 pl-3 gap-3"
                )}>
                    <div className="bg-primary/10 p-2 rounded-xl transition-all duration-300 ease-in-out">
                        <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <span className={cn(
                        "text-xl font-bold tracking-tight text-[#1A1A1A] transition-all duration-300 ease-in-out",
                        collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    )}>
                        SecurePro
                    </span>
                </div>

                <nav className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
                    {filteredMenuItems.map(item => renderMenuItem(item))}
                </nav>

            </div>
        </TooltipProvider>
    );

    return (
        <>
            <aside
                className={cn(
                    'z-40 hidden md:fixed md:left-0 md:top-0 md:h-screen border-r border-border bg-white transition-all duration-300 ease-in-out md:flex flex-col shadow-sm',
                    collapsed ? 'md:w-16' : 'md:w-64'
                )}
            >
                <div className="transition-all duration-300 ease-in-out h-full overflow-hidden">
                    {sidebarContent}
                </div>
            </aside>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div className="w-64 bg-white border-r border-border flex flex-col h-full animate-slide-in-left shadow-2xl">
                        {sidebarContent}
                    </div>
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                </div>
            )}
        </>
    );
};