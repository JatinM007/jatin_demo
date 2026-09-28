import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Users, Building2, BarChart3, Settings2, Lock } from "lucide-react";

export const SuperAdminModule = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" size={28} />
            Super Admin Control Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global governance, user security permissions, and enterprise controls.
          </p>
        </div>
        <span className="bg-indigo-50 text-indigo-700 font-bold text-xs uppercase px-3 py-1 rounded-full border border-indigo-200">
          Super Admin Scope
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link to="/employees" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all group">
          <Users className="text-indigo-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Employee Directory & Access</h3>
          <p className="text-xs text-slate-500 mt-1">Manage all 80+ employees, lock/unlock accounts, assign roles.</p>
        </Link>

        <Link to="/departments" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all group">
          <Building2 className="text-indigo-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Departments & Structure</h3>
          <p className="text-xs text-slate-500 mt-1">Manage departmental hierarchies, teams, and organizational divisions.</p>
        </Link>

        <Link to="/permissions/matrix" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all group">
          <Settings2 className="text-indigo-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Role Permissions Matrix</h3>
          <p className="text-xs text-slate-500 mt-1">Configure granular RBAC permissions across all user roles.</p>
        </Link>
      </div>
    </div>
  );
};

export default SuperAdminModule;
