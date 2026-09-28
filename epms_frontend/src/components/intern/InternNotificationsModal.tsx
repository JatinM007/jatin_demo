import React from 'react';
import { Bell, CheckCheck, Clock, AlertTriangle, FileText, CheckCircle2, MessageSquare, X } from 'lucide-react';
import {
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../features/dashboard/dashboardApi';
import { toast } from 'react-toastify';

interface InternNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    notification_type: string;
    is_read: boolean;
    created_at: string;
    action_url?: string;
  }>;
  onRefetch?: () => void;
}

export const InternNotificationsModal: React.FC<InternNotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications = [],
  onRefetch,
}) => {
  const { data: unreadData, refetch: refetchUnread } = useGetUnreadNotificationsCountQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();

  if (!isOpen) return null;

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id).unwrap();
      refetchUnread();
      onRefetch?.();
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
      refetchUnread();
      onRefetch?.();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'DEADLINE_APPROACHING':
        return <Clock className="text-amber-500" size={18} />;
      case 'TASK_ASSIGNED':
      case 'GOAL_ASSIGNED':
        return <FileText className="text-indigo-500" size={18} />;
      case 'TASK_STATUS_CHANGED':
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'FEEDBACK_PUBLISHED':
      case 'MENTOR_FEEDBACK_REPLIED':
        return <MessageSquare className="text-purple-500" size={18} />;
      default:
        return <Bell className="text-slate-500" size={18} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Notifications</h3>
              <p className="text-xs text-slate-500">
                {unreadData?.unread_count ? `${unreadData.unread_count} unread reminders` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadData?.unread_count ? (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
              <p className="text-sm font-semibold text-slate-700">No notifications</p>
              <p className="text-xs text-slate-400">You will be notified about task assignments, mentor feedback, and deadlines here.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl transition-colors flex items-start gap-3 ${
                  n.is_read ? 'hover:bg-slate-50 opacity-80' : 'bg-indigo-50/40 hover:bg-indigo-50/70 border-l-3 border-indigo-600'
                }`}
              >
                <div className="mt-0.5 shrink-0">{getNotifIcon(n.notification_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="mt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InternNotificationsModal;
