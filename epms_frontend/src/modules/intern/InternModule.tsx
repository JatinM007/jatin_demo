import React from "react";
import { Link } from "react-router-dom";
import { Award, Compass, FileText, UserCheck, LayoutDashboard } from "lucide-react";

export const InternModule = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="text-amber-500" size={28} />
            Intern Learning & Performance Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Personal scorecard, goal progress sliders, code & PR evidence submissions, and self-assessment.
          </p>
        </div>
        <span className="bg-amber-50 text-amber-700 font-bold text-xs uppercase px-3 py-1 rounded-full border border-amber-200">
          Intern Scope
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link to="/dashboard" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md transition-all group">
          <LayoutDashboard className="text-amber-500 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-amber-600">Intern Dashboard</h3>
          <p className="text-xs text-slate-500 mt-1">Personal performance score, KPI completion, and real-time task tracker.</p>
        </Link>

        <Link to="/dashboard" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md transition-all group">
          <Compass className="text-amber-500 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-amber-600">My Goals & Progress</h3>
          <p className="text-xs text-slate-500 mt-1">Log incremental progress, attach evidence links, and reply to mentor notes.</p>
        </Link>

        <Link to="/dashboard" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md transition-all group">
          <UserCheck className="text-amber-500 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-amber-600">Self-Appraisal Evaluation</h3>
          <p className="text-xs text-slate-500 mt-1">Submit self-ratings (1–10 scale) and view final published scorecard.</p>
        </Link>

        <Link to="/dashboard" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md transition-all group">
          <FileText className="text-amber-500 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-amber-600">Evidence & Deliverables Hub</h3>
          <p className="text-xs text-slate-500 mt-1">Submit PR URLs, attach code artifacts, and track mentor verification reviews.</p>
        </Link>
      </div>
    </div>
  );
};

export default InternModule;
