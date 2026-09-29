import { useLocation, useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { Search, HelpCircle, Settings, ChevronRight, Menu, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface PageInfo {
  section?: string;
  title: string;
}

const PAGE_MAP: Record<string, PageInfo> = {
  "/dashboard":            { title: "Executive Dashboard" },
  "/appraisal":            { section: "Performance Cycles", title: "Appraisal Assessments" },
  "/profile":              { title: "Employee Profile Hub" },
  "/notifications":        { title: "Notification Feed" },
  "/employees":            { section: "Org Governance", title: "Employee Directory" },
  "/departments":          { section: "Org Governance", title: "Departments" },
  "/roles":                { section: "Access Security", title: "Role Architecture" },
  "/job-levels":           { section: "Org Governance", title: "Job Bands & Levels" },
  "/positions":            { section: "Org Governance", title: "Tracks & Positions" },
  "/teams":                { section: "Org Governance", title: "Team Pods" },
  "/permissions":          { section: "Access Security", title: "Permission Sets" },
  "/permissions/matrix":   { section: "Access Security", title: "RBAC Matrix" },
  "/permissions/assign":   { section: "Access Security", title: "Direct Permissions" },
  "/financial-years":      { section: "Cycles", title: "Financial Quarters" },
  "/performance-categories": { section: "Cycles", title: "Performance Categories" },
  "/pip":                  { title: "Performance Recovery (PIP)" },
  "/analytics":            { section: "Executive Insights", title: "Strategic Analytics" },
  "/kpi":                  { section: "Objectives & KRAs", title: "KPI Intelligence Hub" },
  "/kpi/my":               { section: "Objectives & KRAs", title: "My Goals & Targets" },
  "/kpi/team":             { section: "Objectives & KRAs", title: "Team Performance Pulse" },
  "/kpi/manage":           { section: "Objectives & KRAs", title: "Goal Management" },
  "/kpi/library":          { section: "Objectives & KRAs", title: "KRA Library" },
  "/continuous-feedback":  { title: "Continuous Feedback Stream" },
  "/performance-history":  { title: "Performance Pulse" },
};

function resolvePageInfo(pathname: string): PageInfo {
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname];
  const prefix = Object.keys(PAGE_MAP)
    .filter((k) => pathname.startsWith(k) && k !== "/")
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? PAGE_MAP[prefix] : { title: "PERFORMAX" };
}

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isHR, isManager } = useAuth();
  const pageInfo = resolvePageInfo(pathname);

  const roleLabel = isAdmin
    ? "Super Admin"
    : isHR
    ? "HR Partner"
    : isManager
    ? "Tech Manager"
    : "Intern";

  return (
    <header className="flex items-center justify-between app-header sticky top-0 z-30 shrink-0 px-6 h-14 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        {/* Clean Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
          {pageInfo.section ? (
            <>
              <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-purple-400">
                {pageInfo.section}
              </span>
              <ChevronRight size={12} className="hidden sm:block text-purple-300" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900 tracking-tight">
                {pageInfo.title}
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-900 tracking-tight">
              {pageInfo.title}
            </span>
          )}
        </nav>
      </div>

      {/* Right Actions & Combined Intelligence Status */}
      <div className="flex items-center gap-3">
        {/* Global Search with ⌘K Badge */}
        <div className="relative hidden lg:flex items-center">
          <Search size={14} className="absolute left-3 text-purple-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employees, KRAs, metrics..."
            className="bg-white/80 hover:bg-white focus:bg-white text-xs text-slate-700 placeholder:text-slate-400 pl-9 pr-12 py-1.5 rounded-xl border border-purple-200/80 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all outline-none w-64 shadow-xs"
          />
          <kbd className="absolute right-2.5 text-[10px] font-semibold text-purple-500 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 pointer-events-none shadow-xs">
            ⌘K
          </kbd>
        </div>

        {/* Active Persona Pill */}
        <div className="hidden sm:flex items-center gap-1.5 bg-purple-100/90 border border-purple-200 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold shadow-xs">
          <Zap size={12} className="text-purple-600 fill-purple-600" />
          <span>{roleLabel}</span>
        </div>

        {/* Notification Bell */}
        <div className="flex items-center">
          <NotificationBell />
        </div>

        {/* Help Button */}
        <button
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-purple-200/80 text-purple-600 hover:text-purple-800 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-xs"
          title="Combined Intelligence Docs"
          aria-label="Documentation"
          onClick={() => window.open("https://www.dailoqa.com/", "_blank")}
        >
          <HelpCircle size={15} />
        </button>

        {/* Profile Settings */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-purple-200/80 text-purple-600 hover:text-purple-800 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-xs"
          title="My Profile & Settings"
          aria-label="Profile Settings"
          onClick={() => navigate("/profile")}
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};

export default Header;
