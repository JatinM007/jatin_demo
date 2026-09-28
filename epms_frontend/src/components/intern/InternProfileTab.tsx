import React from 'react';
import {
  User, Mail, Hash, Briefcase, Building2, UserCheck,
  Calendar, Phone, ShieldCheck, CheckCircle2
} from 'lucide-react';
import type { InternMentorInfo } from '../../features/dashboard/dashboardTypes';

interface InternProfileTabProps {
  user: any;
  mentor?: InternMentorInfo;
  cycleName?: string;
}

export const InternProfileTab: React.FC<InternProfileTabProps> = ({
  user,
  mentor,
  cycleName,
}) => {
  const profile = (user as any)?.profile || {};

  const internName = user?.staffName || user?.username || profile.full_name || 'Authenticated Intern';
  const email = user?.email || 'N/A';
  const employeeCode = user?.employeeCode || profile.employee_code || (user as any)?.id?.slice(0, 8) || 'N/A';
  const designation = (user as any)?.positionName || profile.designation || 'Software Engineering Intern';
  const department = (user as any)?.currentDepartmentName || profile.department_name || profile.department?.name || 'Engineering';
  const status = profile.employment_status || (user?.is_active ? 'ACTIVE' : 'INACTIVE');
  const joiningDate = profile.joining_date || 'N/A';
  const phoneNumber = profile.phone_number || 'N/A';

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-18 h-18 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
            {internName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">{internName}</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={11} />
                {status}
              </span>
            </div>
            <p className="text-xs font-semibold text-indigo-600">{designation}</p>
            <p className="text-xs text-slate-500">{department} Department</p>
          </div>
        </div>

        <div className="text-right space-y-1 shrink-0">
          <span className="text-xs text-slate-400 block">Current Cycle / Cohort</span>
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg inline-block">
            {cycleName || 'Active PMS Evaluation Cycle'}
          </span>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employment & Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center gap-2">
            <Briefcase size={16} className="text-indigo-600" />
            Official Identity & Placement
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 flex items-center gap-1.5"><Hash size={13} /> Employee / Intern ID</span>
              <span className="font-semibold text-slate-800 font-mono">{employeeCode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 flex items-center gap-1.5"><Mail size={13} /> Official Email</span>
              <span className="font-semibold text-slate-800">{email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 flex items-center gap-1.5"><Building2 size={13} /> Department</span>
              <span className="font-semibold text-slate-800">{department}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={13} /> Date of Joining</span>
              <span className="font-semibold text-slate-800">{joiningDate}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400 flex items-center gap-1.5"><Phone size={13} /> Contact Phone</span>
              <span className="font-semibold text-slate-800">{phoneNumber}</span>
            </div>
          </div>
        </div>

        {/* Direct Mentorship Information */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center gap-2">
            <UserCheck size={16} className="text-indigo-600" />
            Assigned Mentorship Hierarchy
          </h3>

          {mentor ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5"><User size={13} /> Assigned Mentor</span>
                <span className="font-bold text-slate-900">{mentor.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5"><Mail size={13} /> Mentor Email</span>
                <span className="font-semibold text-indigo-600">{mentor.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5"><Briefcase size={13} /> Designation</span>
                <span className="font-semibold text-slate-800">{mentor.designation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5"><Building2 size={13} /> Department</span>
                <span className="font-semibold text-slate-800">{mentor.department}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5"><ShieldCheck size={13} /> Status</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {mentor.status || 'Active Mentorship'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <User size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-600">No Mentor Assigned</p>
              <p className="text-[11px] text-slate-400">Contact People Operations for mentor configuration.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternProfileTab;
