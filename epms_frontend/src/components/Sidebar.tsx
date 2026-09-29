import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import PerformaxAnimatedLogo from "./PerformaxAnimatedLogo";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  MessageSquare,
  BarChart3,
  ChevronDown,
  LogOut,
  Building2,
  ShieldCheck,
  Briefcase,
  Zap,
  Target,
  History,
  Calendar,
  Layers,
  X,
  Database,
  GraduationCap,
  Bell,
} from "lucide-react";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  hrOnly?: boolean;
  end?: boolean;
  privilegedOnly?: boolean;
  hideForPrivileged?: boolean;
  hideForAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Executive Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Announcement Hub", to: "/superadmin/notifications", icon: Bell, adminOnly: true },
  { label: "Assigned Mentees", to: "/manager/mentees", icon: Users, hideForAdmin: true },
  { label: "Performance Appraisals", to: "/appraisal", icon: ClipboardCheck, end: true, hideForAdmin: true },
  { label: "Performance Pulse", to: "/performance-history/admin", icon: History },
  { label: "Team Pulse", to: "/performance-history/manager", icon: History, privilegedOnly: true, hideForAdmin: true },
  { label: "Continuous Feedback", to: "/continuous-feedback", icon: MessageSquare },
  { label: "Strategic Analytics", to: "/analytics", icon: BarChart3 },
];

const HR_ORG_ITEMS: NavItem[] = [
  { label: "Employees Directory", to: "/employees", icon: Users },
  { label: "Departments", to: "/departments", icon: Building2 },
  { label: "Job Levels & Bands", to: "/job-levels", icon: Zap },
  { label: "Positions & Tracks", to: "/positions", icon: Briefcase },
  { label: "Organizational Teams", to: "/teams", icon: Users },
  { label: "Financial Cycles", to: "/financial-years", icon: Calendar },
  { label: "Evaluation Criteria", to: "/performance-categories", icon: Layers },
];

const SUPERADMIN_ORG_ITEMS: NavItem[] = [
  { label: "Role & Permission", to: "/superadmin/roles-permissions", icon: ShieldCheck },
  { label: "Security Roles", to: "/roles", icon: ShieldCheck },
  { label: "Access Permissions", to: "/permissions", icon: ShieldCheck, end: true },
  { label: "Permissions Matrix", to: "/permissions/matrix", icon: ShieldCheck },
  { label: "Assign Permissions", to: "/permissions/assign", icon: Zap },
  { label: "Record Management", to: "/admin/records", icon: Database },
  { label: "Employees Directory", to: "/employees", icon: Users },
  { label: "Departments", to: "/departments", icon: Building2 },
  { label: "Job Levels & Bands", to: "/job-levels", icon: Zap },
  { label: "Positions & Tracks", to: "/positions", icon: Briefcase },
  { label: "Organizational Teams", to: "/teams", icon: Users },
  { label: "Financial Cycles", to: "/financial-years", icon: Calendar },
  { label: "Evaluation Criteria", to: "/performance-categories", icon: Layers },
];

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const { logout, isAdmin, isHR, isManager, isIntern, user, hasPermission, hasRole } = useAuth();
  const location = useLocation();
  const [mgmtOpen, setMgmtOpen] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [tradReviewOpen, setTradReviewOpen] = useState(false);

  const isInternUser = isIntern || (!isAdmin && !isHR && !isManager);

  const baseNav = NAV_ITEMS.filter((item) => {
    if (item.hideForAdmin && isAdmin) return false;
    if (item.adminOnly && !isAdmin) return false;
    switch (item.label) {
      case "Announcement Hub":    return isAdmin;
      case "Assigned Mentees":    return isManager || isHR;
      case "Performance Appraisals": return isManager || isHR;
      case "Performance Pulse":   return isAdmin || isHR || hasPermission("REPORT_VIEW_ALL");
      case "Team Pulse":          return hasPermission("APPRAISAL_VIEW_TEAM") && !isAdmin && !isHR;
      case "Continuous Feedback": return true;
      case "Strategic Analytics": return isAdmin || isHR || hasPermission("REPORT_VIEW_ALL");
      default:                    return true;
    }
  });

  const filteredNav = baseNav.flatMap((item: NavItem): NavItem[] => {
    if (item.to === "/dashboard") {
      const adjusted: NavItem = {
        ...item,
        label: isInternUser ? "Intern Dashboard" : item.label,
      };
      if (isInternUser) {
        const portalItem: NavItem = {
          label: "Intern Learning Portal",
          to: "/intern",
          icon: GraduationCap,
          end: true,
        };
        return [adjusted, portalItem];
      }
      return [adjusted];
    }
    return [item];
  });

  const perfSubItems: Array<{ to: string; label: string; end?: boolean }> = [
    { to: "/kpi", label: "KPI Intelligence Hub", end: true },
    ...((hasPermission("KPI_VIEW_OWN") || isHR) && !isAdmin ? [{ to: "/kpi/my", label: "My Goals & KRAs" }] : []),
    ...((hasPermission("KPI_VIEW_OWN") || isHR) && !isAdmin && user ? [{ to: `/kpi/history/${user.id}`, label: "My KPI Journey" }] : []),
    ...(hasPermission("KPI_VIEW_TEAM") || isHR || isAdmin ? [{ to: "/kpi/team", label: "Team Performance" }] : []),
    ...(isManager
      ? [
          { to: "/manager/tasks", label: "Team Tasks & Goals" },
          { to: "/manager/technical-capabilities", label: "Technical Capabilities" },
          { to: "/manager/evidence", label: "Evidence Reviews" },
        ]
      : []),
    ...(isHR || isAdmin
      ? [{ to: "/kpi/org-history", label: "Org KPI History" }]
      : []),
    ...(isManager && !isHR && !isAdmin
      ? [{ to: "/kpi/org-history", label: "Team KPI History" }]
      : []),
    ...(hasPermission("KPI_LIBRARY_MANAGE") || isHR || isAdmin
      ? [
          { to: "/kpi/manage", label: "Goal Management" },
          { to: "/kpi/library", label: "KRA Library" },
          { to: "/kpi/categories", label: "KPI Categories" },
        ]
      : []),
  ];

  const handleNavClick = () => {
    onClose?.();
  };

  const navItemClass = (isActive: boolean) =>
    `nav-item ${isActive ? "nav-item-active" : ""}`;

  const iconClass = (isActive: boolean) =>
    `transition-colors shrink-0 ${isActive ? "text-white" : "text-purple-200 group-hover:text-white"}`;

  return (
    <aside
      className="app-sidebar flex flex-col h-screen shrink-0 text-white select-none relative z-40"
      style={{ width: 250 }}
    >
      {/* Tanvi Brand Header with Animated Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <PerformaxAnimatedLogo compact />
        </div>
        {onClose && (
          <button
            className="md:hidden flex items-center justify-center rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Core Intelligence */}
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-widest text-white/40 uppercase">
            Workspace
          </div>
          <div className="space-y-0.5">
            {filteredNav.map((item) => {
              const isActive = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={navItemClass(isActive)}
                  onClick={handleNavClick}
                >
                  <item.icon size={16} className={iconClass(isActive)} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Traditional Review Accordion */}
        {(isAdmin || isHR || isManager) && (
          <div>
            <button
              onClick={() => setTradReviewOpen(!tradReviewOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] text-purple-100 hover:bg-white/10 hover:text-white transition-colors group"
            >
              <span className="flex items-center gap-2.5 font-normal">
                <ClipboardCheck size={16} className="text-purple-200 group-hover:text-white" />
                Traditional Review
              </span>
              <ChevronDown
                size={14}
                className={`text-purple-200 transition-transform duration-200 ${
                  tradReviewOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {tradReviewOpen && (
              <div className="ml-5 pl-2.5 mt-1 border-l border-white/20 space-y-0.5">
                <NavLink
                  to="/appraisal"
                  className={({ isActive }) =>
                    `block px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors ${
                      isActive
                        ? "text-white font-semibold bg-white/20 shadow-xs"
                        : "text-purple-200 hover:text-white hover:bg-white/10"
                    }`
                  }
                  onClick={handleNavClick}
                  end
                >
                  Appraisal Dashboard
                </NavLink>
                {(isHR || isAdmin) && (
                  <>
                    <NavLink
                      to="/appraisal/design-form"
                      className={({ isActive }) =>
                        `block px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors ${
                          isActive
                            ? "text-white font-semibold bg-white/20 shadow-xs"
                            : "text-purple-200 hover:text-white hover:bg-white/10"
                        }`
                      }
                      onClick={handleNavClick}
                    >
                      Dynamic Form Builder
                    </NavLink>
                    <NavLink
                      to="/performance-categories"
                      className={({ isActive }) =>
                        `block px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors ${
                          isActive
                            ? "text-white font-semibold bg-white/20 shadow-xs"
                            : "text-purple-200 hover:text-white hover:bg-white/10"
                        }`
                      }
                      onClick={handleNavClick}
                    >
                      Evaluation Criteria
                    </NavLink>
                    <NavLink
                      to="/appraisal/create-cycle"
                      className={({ isActive }) =>
                        `block px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors ${
                          isActive
                            ? "text-white font-semibold bg-white/20 shadow-xs"
                            : "text-purple-200 hover:text-white hover:bg-white/10"
                        }`
                      }
                      onClick={handleNavClick}
                    >
                      Release Appraisal Form
                    </NavLink>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {/* Performance & KRAs Accordion */}
        <div>
          <button
            onClick={() => setPerfOpen(!perfOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] text-purple-100 hover:bg-white/10 hover:text-white transition-colors group"
          >
            <span className="flex items-center gap-2.5 font-normal">
              <Target size={16} className="text-purple-200 group-hover:text-white" />
              KRAs & Objectives
            </span>
            <ChevronDown
              size={14}
              className={`text-purple-200 transition-transform duration-200 ${
                perfOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {perfOpen && (
            <div className="ml-5 pl-2.5 mt-1 border-l border-white/20 space-y-0.5">
              {perfSubItems.map((sub) => {
                const isActive = sub.end
                  ? location.pathname === sub.to
                  : location.pathname.startsWith(sub.to);
                return (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    className={`block px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors ${
                      isActive
                        ? "text-white font-semibold bg-white/20 shadow-xs"
                        : "text-purple-200 hover:text-white hover:bg-white/10"
                    }`}
                    onClick={handleNavClick}
                  >
                    {sub.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Governance & Administration */}
        {(isAdmin || isHR) && (
          <div>
            <button
              onClick={() => setMgmtOpen(!mgmtOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] text-purple-100 hover:bg-white/10 hover:text-white transition-colors group"
            >
              <span className="flex items-center gap-2.5 font-normal">
                <Building2 size={16} className="text-purple-200 group-hover:text-white" />
                Org Governance
              </span>
              <ChevronDown
                size={14}
                className={`text-purple-200 transition-transform duration-200 ${
                  mgmtOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {mgmtOpen && (
              <div className="ml-5 pl-2.5 mt-1 border-l border-white/20 space-y-0.5">
                {(isAdmin ? SUPERADMIN_ORG_ITEMS : HR_ORG_ITEMS).map((item) => {
                  const isActive = item.end
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to);
                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      className={`block px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors ${
                        isActive
                          ? "text-white font-semibold bg-white/20 shadow-xs"
                          : "text-purple-200 hover:text-white hover:bg-white/10"
                      }`}
                      onClick={handleNavClick}
                    >
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Tanvi Frosted Glass User Profile Card */}
      <div className="p-3">
        <div className="sidebar-profile rounded-2xl p-3 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
                {user?.staffName?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-white truncate">
                  {user?.staffName || (user as any)?.username || "Authorized User"}
                </div>
                <div className="text-[10px] font-medium text-purple-200 uppercase tracking-wider truncate">
                  {isAdmin ? "Super Admin" : isHR ? "HR Partner" : isManager ? "Tech Manager" : "Intern"}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
