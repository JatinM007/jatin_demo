import React from 'react';
import { X, History, FileEdit } from 'lucide-react';
import { useGetGoalSetAuditTrailQuery } from '../../services/kpiApi';
import { formatRelativeTime } from '../../utils/timeUtils';

interface KpiAuditLogModalProps {
  goalSetId: number | string;
  onClose: () => void;
}

const KpiAuditLogModal: React.FC<KpiAuditLogModalProps> = ({ goalSetId, onClose }) => {
  const { data: response, isLoading, error } = useGetGoalSetAuditTrailQuery(goalSetId);
  
  const logs = response?.data || [];

  const parseDiffString = (details: string) => {
    // Looks for patterns like "TargetValue changed from 10 to 20"
    const regex = /(.*) changed from (.*) to (.*)/i;
    const match = details.match(regex);
    if (match) {
      const [, field, oldVal, newVal] = match;
      return (
        <div className="text-sm mt-1">
          <span className="font-semibold text-gray-700">{field}: </span>
          <span className="line-through text-red-500 bg-red-50 px-1 rounded">{oldVal}</span>
          <span className="mx-2 text-gray-400">➔</span>
          <span className="text-green-600 font-bold bg-green-50 px-1 rounded">{newVal}</span>
        </div>
      );
    }
    return <p className="text-sm text-gray-600 mt-1">{details}</p>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Revision Audit Log</h2>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-0.5">Goal Set #{goalSetId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center py-20 text-gray-400 font-semibold text-sm">
              Loading audit logs...
            </div>
          ) : error ? (
            <div className="text-center py-10 text-rose-500 text-sm font-semibold">
              Failed to load audit logs.
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <History className="w-6 h-6" />
              </div>
              <p className="text-gray-500 font-semibold text-sm">No revisions found.</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {logs.map((log) => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Timeline Dot */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <FileEdit className="w-3.5 h-3.5" />
                  </div>

                  {/* Card */}
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="text-[11px] font-bold text-gray-400">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-800 uppercase mb-2 pb-2 border-b border-gray-50">
                      Goal Set Revision
                    </p>
                    
                    {/* Diff Parsing */}
                    {log.changeDetails && parseDiffString(log.changeDetails)}
                    
                    {log.changeReason && (
                      <p className="text-xs mt-3 pt-2 border-t border-gray-50 text-gray-600">
                        <span className="font-semibold text-gray-800">Reason:</span> {log.changeReason}
                      </p>
                    )}
                    
                    <p className="text-[10px] text-gray-400 font-semibold mt-3 pt-2 border-t border-gray-50 uppercase text-right tracking-wider">
                      User ID: {log.changedBy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KpiAuditLogModal;
