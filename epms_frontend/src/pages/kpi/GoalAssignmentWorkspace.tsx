import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetGoalSetByEmployeeQuery,
  useGetAllLibrariesQuery,
  useAddGoalItemMutation,
  useDeleteGoalItemMutation,
  useBulkUpdateGoalItemsMutation,
  useApproveGoalSetMutation,
  useRevertGoalSetMutation,
  useGetKpiCategoriesQuery,
  useAssignKpiToEmployeeMutation,
} from '../../services/kpiApi';
import { useGetEmployeeByIdQuery } from '../../features/employee/employeeapi';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import { useAuth } from '../../hooks/useAuth';
import {
  Search, Plus, Trash2, Lock, LayoutTemplate, Target, Save, Edit3, History, ChevronLeft, Archive
} from 'lucide-react';
import React from 'react';
import { KPI_STATUS_STYLE, KPI_STATUS_FALLBACK } from '../../utils/kpiStatusStyles';
import { formatRelativeTime } from '../../utils/timeUtils';

const GoalAssignmentWorkspace: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isHR, isManager, activeCycleId, activeCycleName, isLoadingCycle: isLoadingActiveCycle } = useAuth();

  const urlCycleId = searchParams.get('cycleId');
  const editMode = searchParams.get('mode') === 'edit';

  const { data: cyclesData, isLoading: isLoadingCycles } = useGetCyclesQuery();
  const cycles = cyclesData || [];

  const resolvedCycleId = useMemo(() => {
    if (urlCycleId) return Number(urlCycleId);
    if (activeCycleId) return activeCycleId;
    // Fallback: If activeCycleId is not found (e.g. active cycle closed), pick the first active or available cycle
    const activeOrFirst = (cycles as any[]).find((c: any) => c.status?.toUpperCase() === 'ACTIVE') || cycles?.[0];
    return activeOrFirst ? (activeOrFirst.cycleId || activeOrFirst.id) : undefined;
  }, [urlCycleId, activeCycleId, cycles]);

  const { data: employee } = useGetEmployeeByIdQuery(employeeId as any, { skip: !employeeId });
  const { data: goalSetResponse, refetch: refetchGoals } = useGetGoalSetByEmployeeQuery({
    employeeId: employeeId as any,
    cycleId: resolvedCycleId!
  }, { skip: !employeeId || !resolvedCycleId });

  const { data: librariesResponse } = useGetAllLibrariesQuery();
  const libraries = librariesResponse?.data || [];

  const { data: categoriesResponse } = useGetKpiCategoriesQuery();
  const categories = categoriesResponse?.data || [];

  const resolvedCycleObj = (cycles as any[]).find((c: any) => (c.cycleId || c.id) === resolvedCycleId);
  const isArchivedCycle = resolvedCycleObj?.status?.toUpperCase() === 'ARCHIVED';
  // In edit mode (navigated from GoalDetail), treat as non-historical even if cycle differs from active
  // Otherwise, archived cycles or non-active cycles are historical
  const isHistoricalCycle = editMode ? false : isArchivedCycle || (!!resolvedCycleId && activeCycleId !== undefined && resolvedCycleId !== activeCycleId);
  const isPrivileged = isManager || isAdmin || isHR;

  // goalSet must be declared before any hook or useMemo that references it.
  // Guard against stale cache: if the returned goal-set belongs to a different cycle
  // (e.g. RTK cache hasn't flushed yet after a cycle switch), treat it as undefined so
  // the UI renders the "no goals assigned" empty state instead of showing old data.
  const rawGoalSet = goalSetResponse?.data;
  const goalSet = rawGoalSet && resolvedCycleId && rawGoalSet.appraisalCycleId !== resolvedCycleId
    ? undefined
    : rawGoalSet;

  // Compute a friendly cycle name: goalSet label -> cycles lookup -> activeCycleName
  const cycleName = useMemo(() => {
    if (goalSet?.appraisalCycleName) return goalSet.appraisalCycleName;
    const found = cycles.find((c: any) => (c.cycleId || c.id) === resolvedCycleId);
    if (found?.cycleName) return found.cycleName;
    return activeCycleName;
  }, [goalSet?.appraisalCycleName, cycles, resolvedCycleId, activeCycleName]);

  const [addGoalItem] = useAddGoalItemMutation();
  const [deleteGoalItem] = useDeleteGoalItemMutation();
  const [bulkUpdateItems] = useBulkUpdateGoalItemsMutation();
  const [approveGoalSet] = useApproveGoalSetMutation();
  const [revertToDraft] = useRevertGoalSetMutation();
  const [assignLibrary] = useAssignKpiToEmployeeMutation();
  // Respect edit mode: APPROVED is only disabled when NOT arriving via mode=edit
  const isInputDisabled = isArchivedCycle 
    || (['LOCKED', 'SCORED', 'ARCHIVED'].includes(goalSet?.status ?? ''))
    || (goalSet?.status === 'APPROVED' && !editMode);
  const [localItems, setLocalItems] = React.useState<any[]>([]);
  const [isModified, setIsModified] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'append'|'replace'>('append');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [pendingTemplate, setPendingTemplate] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tempIdCounter, setTempIdCounter] = useState(-1);

  React.useEffect(() => {
    if (goalSet?.items) {
      setLocalItems(goalSet.items);
      setIsModified(false);
    } else if (goalSet === undefined && !goalSetResponse?.data) {
      setLocalItems([]);
      setIsModified(false);
    }
  }, [goalSet, goalSetResponse?.data]);

  useEffect(() => {
    if (!isLoadingCycles && isArchivedCycle && !goalSet) {
      navigate(-1);
    }
  }, [isLoadingCycles, isArchivedCycle, goalSet, navigate]);

  // Warn on browser refresh / tab close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isModified) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isModified]);

  const safeNavigate = useCallback((target: string | number) => {
    if (isModified) {
      const ok = window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.');
      if (!ok) return;
    }
    if (typeof target === 'number') navigate(target);
    else navigate(target);
  }, [isModified, navigate]);

  const totalWeight = useMemo(() => localItems.reduce((sum, item) => sum + Number(item.weightPercent), 0), [localItems]);
  const overweightItems = useMemo(() => localItems.filter(item => Number(item.weightPercent) > 35), [localItems]);

  const filteredLibraries = libraries.filter(lib =>
    (lib.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUseTemplate = async (library: any) => {
    if (!resolvedCycleId) return;
    if (isInputDisabled) {
      toast.warning('Goals cannot be modified in the current state.');
      return;
    }
    setIsSubmitting(true);
    try {
      const overwrite = assignmentMode === 'replace';
      if (!goalSet || overwrite) {
        await assignLibrary({ employeeId: employeeId as any, libraryId: library.id, appraisalCycleId: resolvedCycleId, overwriteExisting: overwrite }).unwrap();
      } else {
        for (const detail of library.details) {
          await addGoalItem({ goalSetId: goalSet.id, data: { title: detail.goalTitle, unit: detail.unit || 'Percent', targetValue: detail.targetValue, weightPercent: detail.weightPercent, categoryId: detail.categoryId || 1 } }).unwrap();
        }
      }
      refetchGoals();
      toast.success(overwrite ? 'Goals replaced successfully!' : 'Template items appended successfully!');
    } catch (err: any) {
      toast.error('Failed to apply template. Check network/permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomGoal = () => {
    // Add a local-only placeholder row — nothing is saved until "Save Draft" is clicked
    const tempId = tempIdCounter;
    setTempIdCounter(prev => prev - 1);
    setLocalItems(prev => [...prev, {
      id: tempId,
      title: 'New Custom KPI',
      unit: 'Percent',
      targetValue: 0,
      weightPercent: 0,
      categoryId: (categories as any)?.[0]?.id || 1,
      categoryName: (categories as any)?.[0]?.name || '',
      _isNew: true,
    }]);
    setIsModified(true);
  };

  const handleLocalUpdate = (itemId: number, updates: any) => {
    setLocalItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
    setIsModified(true);
  };

  const handleSaveDraft = async () => {
    if (!resolvedCycleId) return;
    setIsSubmitting(true);
    try {
      let currentGoalSetId = goalSet?.id;

      // Step 1: If no goal set exists yet, create one first
      if (!currentGoalSetId) {
        if (localItems.length === 0) {
          toast.warning('Add at least one goal before saving.');
          setIsSubmitting(false);
          return;
        }
        const newGoalSet = await assignLibrary({
          employeeId: employeeId as any,
          appraisalCycleId: resolvedCycleId,
        }).unwrap();
        currentGoalSetId = newGoalSet.data.id;
      }

      // Step 2: For each new (temp) item, create it via API
      let savedItems = [...localItems];
      for (let i = 0; i < savedItems.length; i++) {
        const item = savedItems[i];
        if (item._isNew) {
          const created = await addGoalItem({
            goalSetId: currentGoalSetId!,
            data: {
              title: item.title,
              unit: item.unit,
              targetValue: item.targetValue === '' ? 0 : Number(item.targetValue),
              weightPercent: item.weightPercent === '' ? 0 : Number(item.weightPercent),
              categoryId: item.categoryId,
            }
          }).unwrap();
          // replace temp item with real one from API response
          // Use the last item returned by the API (newly appended) instead of matching by title
          const realItem = created.data?.items?.at(-1) || item;
          savedItems[i] = { ...realItem, _isNew: false };
        }
      }

      // Step 3: Bulk update all existing (non-new) items
      const existingItems = savedItems.filter(item => !item._isNew);
      if (existingItems.length > 0) {
        const cleanedItems = existingItems.map(item => ({
          id: item.id,
          title: item.title,
          unit: item.unit,
          targetValue: item.targetValue === '' ? 0 : Number(item.targetValue),
          weightPercent: item.weightPercent === '' ? 0 : Number(item.weightPercent),
          categoryId: item.categoryId,
        }));
        await bulkUpdateItems({ goalSetId: currentGoalSetId!, data: { items: cleanedItems } }).unwrap();
      }

      await refetchGoals();
      setIsModified(false);
      toast.success('Draft saved successfully!');
    } catch (err: any) {
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (!goalSet) return;
    setShowEditConfirm(true);
  };

  const handleEditConfirmed = async () => {
    if (!goalSet) return;
    setShowEditConfirm(false);
    setIsSubmitting(true);
    try { await revertToDraft(goalSet.id).unwrap(); }
    catch (err: any) { toast.error('Failed to revert. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  const confirmDeleteItem = (itemId: number) => {
    const item = localItems.find(i => i.id === itemId);
    if (!item) return;

    setDeleteConfirmModal({
      isOpen: true,
      title: 'Delete KPI Item',
      message: 'Delete this goal? This cannot be undone if progress records exist.',
      onConfirm: () => {
        deleteItemConfirmed(itemId);
      }
    });
  };

  const deleteItemConfirmed = async (itemId: number) => {
    const item = localItems.find(i => i.id === itemId);
    if (!item) return;

    if (item._isNew) {
      setLocalItems(prev => prev.filter(i => i.id !== itemId));
      setIsModified(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteGoalItem(itemId).unwrap();
      setLocalItems(prev => prev.filter(i => i.id !== itemId));
      await refetchGoals();
      toast.success('Goal deleted successfully.');
    } catch (err: any) {
      toast.error('Cannot delete: progress records exist for this goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!goalSet) return;
    if (totalWeight !== 100) { toast.warning('Total weight must be exactly 100% before approving.'); return; }
    if (isModified) { toast.warning('Please save your draft changes before approving.'); return; }
    if (overweightItems.length > 0) { toast.warning(`${overweightItems.length} item(s) exceed the 35% cap. Adjust before approving.`); return; }
    setIsSubmitting(true);
    try {
      await approveGoalSet(goalSet.id).unwrap();
      toast.success('Goals approved and locked!');
      const dest = isAdmin || isHR ? '/kpi/manage' : '/kpi/team';
      navigate(isHistoricalCycle ? `${dest}?cycleId=${resolvedCycleId}` : dest);
    } catch (err: any) { toast.error('Failed to approve. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  if (isLoadingActiveCycle) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Resolving active cycle…</div>
  );

  if (!resolvedCycleId) return (
    <div className="space-y-4 pb-8">
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '48px 24px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FCEBEB', color: '#791F1F', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Target size={24} />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: '#111827', marginBottom: 8 }}>No Cycle Specified</h2>
        <p style={{ fontSize: 13, color: '#9EA3B0', marginBottom: 20, lineHeight: 1.6 }}>An appraisal cycle is required to assign or view KPIs. Please contact your system administrator to open a new cycle or select a cycle to view.</p>
        <button onClick={() => navigate(-1)} style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500 }} className="hover:bg-[#1648C0] transition-colors">Go Back</button>
      </div>
    </div>
  );

  const ss = goalSet?.status ? (KPI_STATUS_STYLE[goalSet.status] || KPI_STATUS_FALLBACK) : null;

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => safeNavigate(-1)}
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070', flexShrink: 0 }}
          className="hover:bg-[#F5F6F8] transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Goal Assignment Workspace</h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>Assign and manage employee KPI goals.</p>
        </div>
      </div>

      {/* Header */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 20px' }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEF3FD', color: '#1A56DB', fontSize: 16, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {employee?.staffName?.[0]}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>{employee?.staffName}</h1>
              {ss && (
                <span style={{ fontSize: 10, fontWeight: 500, background: ss.bg, color: ss.text, border: `0.5px solid ${ss.border}`, borderRadius: 20, padding: '2px 8px' }}>
                  {ss?.label}
                </span>
              )}
              {!goalSet && (
                <span style={{ fontSize: 10, fontWeight: 500, background: '#F5F6F8', color: '#9EA3B0', border: '0.5px solid #E0E2E8', borderRadius: 20, padding: '2px 8px' }}>Not Assigned</span>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 2 }}>{employee?.employeeCode} &bull; {employee?.positionName} &bull; Cycle: {cycleName}</p>
          </div>
          <button onClick={() => navigate(`/kpi/history/${employeeId}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500 }}
            className="hover:bg-[#E0E2E8] transition-colors">
            <History size={13} /> View History
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {!isHistoricalCycle && isPrivileged && (() => {
            const readOnlyStatuses = ['LOCKED', 'SCORED', 'ARCHIVED'];
            if (goalSet && readOnlyStatuses.includes(goalSet.status)) {
              // Terminal/read-only states: no buttons
              return null;
            }
            if (goalSet?.status === 'APPROVED') {
              // APPROVED: can revert to edit
              return (
                <button onClick={handleEdit} disabled={isSubmitting}
                  style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
                  className="disabled:opacity-50 hover:bg-[#1648C0] transition-colors">
                  <Edit3 size={13} /> Edit Goals
                </button>
              );
            }
            // DRAFT or no goalSet: show save + approve
            return (
              <>
                <button onClick={handleSaveDraft} disabled={isSubmitting || !isModified}
                  style={{ background: isModified ? '#1A56DB' : '#F5F6F8', color: isModified ? '#FFFFFF' : '#9EA3B0', border: isModified ? 'none' : '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
                  className="disabled:opacity-50">
                  <Save size={13} /> {isModified ? 'Save Draft' : 'Draft Saved'}
                </button>
                <button onClick={handleApprove} disabled={isSubmitting || totalWeight !== 100 || isModified}
                  style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
                  className="disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1648C0] transition-colors">
                  <Lock size={13} /> Approve Goal Set
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {isHistoricalCycle && (
        <div style={{
          background: isArchivedCycle ? '#F5F6F8' : '#FFFBEB',
          border: `0.5px solid ${isArchivedCycle ? '#E0E2E8' : '#FCD34D'}`,
          borderRadius: 12,
          padding: '10px 14px',
          color: isArchivedCycle ? '#6B7280' : '#B45309',
          fontSize: 13,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {isArchivedCycle ? (
            <>
              <Archive size={14} />
              This appraisal cycle has been archived — all data is read-only.
            </>
          ) : (
            <>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#B45309' }}></span>
              Viewing historical cycle — no assignments can be made
            </>
          )}
        </div>
      )}

      {isArchivedCycle && !goalSet && (
        <div style={{ background: '#FFFFFF', border: '0.5px dashed #E0E2E8', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <Archive size={24} style={{ color: '#E0E2E8', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>
            No goals were assigned for this cycle
          </p>
          <p style={{ fontSize: 12, color: '#9EA3B0' }}>
            This appraisal cycle is archived. Goals can no longer be created or modified.
          </p>
        </div>
      )}

      {/* Assignment Info Callout */}
      {goalSet && (
        <div style={{ background: '#F8FAFC', border: '0.5px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '16px 24px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Manager</span>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>
              {goalSet.managerName
                ? <>{goalSet.managerName} <span style={{ color: '#94A3B8', fontWeight: 400 }}>(ID: {goalSet.managerId})</span></>
                : <span style={{ color: '#94A3B8', fontWeight: 400 }}>Not Assigned</span>}
            </p>
          </div>
          {goalSet.assignedByName && (
            <>
              <div style={{ width: 1, height: 24, background: '#E2E8F0', alignSelf: 'center' }} />
              <div>
                <span style={{ fontSize: 10, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned By</span>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>{goalSet.assignedByName} <span style={{ color: '#94A3B8', fontWeight: 400 }}>(ID: {goalSet.assignedBy})</span></p>
              </div>
            </>
          )}
          {goalSet.assignedAt && (
            <>
              <div style={{ width: 1, height: 24, background: '#E2E8F0', alignSelf: 'center' }} />
              <div>
                <span style={{ fontSize: 10, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned At</span>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>{formatRelativeTime(goalSet.assignedAt)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {!(isArchivedCycle && !goalSet) && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Sidebar */}
        {!isHistoricalCycle && isPrivileged && !isInputDisabled && (
          <aside style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px' }} className="w-full lg:w-72 shrink-0">
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>KPI Templates</p>
              <LayoutTemplate size={13} style={{ color: '#9EA3B0' }} />
            </div>

            {goalSet && (
              <div style={{ marginBottom: 12, width: '100%' }}>
                <div style={{ display: 'flex', width: '100%', background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: 4 }} role="tablist" aria-label="Assignment mode">
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('append')}
                    aria-pressed={assignmentMode === 'append'}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      background: assignmentMode === 'append' ? '#EAF3DE' : '#FFFFFF',
                      color: assignmentMode === 'append' ? '#27500A' : '#111827',
                      border: assignmentMode === 'append' ? 'none' : '0.5px solid #E4E6EC',
                      cursor: 'pointer',
                    }}
                  >
                    Append
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('replace')}
                    aria-pressed={assignmentMode === 'replace'}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      background: assignmentMode === 'replace' ? '#FAEEDA' : '#FFFFFF',
                      color: assignmentMode === 'replace' ? '#633806' : '#111827',
                      border: assignmentMode === 'replace' ? 'none' : '0.5px solid #E4E6EC',
                      cursor: 'pointer',
                    }}
                  >
                    Replace
                  </button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: '#9EA3B0', margin: 0 }}>
                    {assignmentMode === 'replace' ? 'Replace will archive existing draft goals and create a new set.' : 'Append will add template items to the current draft without overwriting.'}
                  </p>
                </div>
              </div>
            )}

            <div className="relative" style={{ marginBottom: 12 }}>
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
              <input type="text" placeholder="Search templates…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 10px 7px 28px', fontSize: 12, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div style={{ maxHeight: 380, overflowY: 'auto' }} className="space-y-2">
              {filteredLibraries.map(lib => (
                <div key={lib.id} onClick={() => {
                    if (assignmentMode === 'replace' && goalSet) {
                      setPendingTemplate(lib);
                    } else {
                      handleUseTemplate(lib);
                    }
                  }}
                  style={{ border: '0.5px solid #E4E6EC', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}
                  className="hover:border-[#1A56DB] hover:bg-[#EEF3FD] transition-colors">
                  <div className="flex justify-between items-start" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 500, background: '#F5F6F8', color: '#9EA3B0', border: '0.5px solid #E0E2E8', borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase' }}>{lib.positionName || 'General'}</span>
                    <Plus size={12} style={{ color: '#1A56DB' }} />
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{lib.title}</p>
                </div>
              ))}
            </div>

            {pendingTemplate && (
              <div style={{ marginTop: 18, padding: 14, border: '0.5px solid #E4E6EC', borderRadius: 12, background: '#FEF3C7' }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#92400E', marginBottom: 8 }}>
                  Replace existing draft goals with “{pendingTemplate.title}”? This will archive the current draft and create a new goal set.
                </p>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <button onClick={() => {
                      handleUseTemplate(pendingTemplate);
                      setPendingTemplate(null);
                    }}
                    style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 500 }}>
                    Confirm Replace
                  </button>
                  <button onClick={() => setPendingTemplate(null)}
                    style={{ background: '#F5F6F8', color: '#475569', border: '0.5px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 500 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button onClick={handleAddCustomGoal}
              style={{ width: '100%', marginTop: goalSet ? 16 : 8, padding: '9px', border: '0.5px dashed #B5D4F4', borderRadius: 8, fontSize: 11, fontWeight: 500, color: '#0C447C', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              className="hover:bg-[#EEF3FD] transition-colors">
              <Plus size={12} /> Add Custom Goal
            </button>
          </aside>
        )}

        {/* Goal Table */}
        <main className="flex-1 min-w-0">
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
            <div className="flex items-center justify-between" style={{ padding: '10px 16px', background: '#FAFBFF', borderBottom: '0.5px solid #E4E6EC' }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal Assignments</p>
              <span style={{ fontSize: 11, color: '#9EA3B0' }}>{localItems.length} KPI items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 600, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFBFF', borderBottom: '0.5px solid #E4E6EC' }}>
                    {['Goal Title', 'Category', 'Target', 'Unit', 'Weight', ''].map((h, i) => (
                      <th key={i} style={{ padding: '9px 14px', fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i >= 2 && i <= 4 ? 'center' : i === 5 ? 'center' : 'left', borderBottom: '0.5px solid #E4E6EC', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {localItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: idx < localItems.length - 1 ? '0.5px solid #F0F2F6' : 'none' }} className="hover:bg-[#FAFBFF] transition-colors">
                      <td style={{ padding: '10px 14px' }}>
                        <input type="text"
                          style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 13, fontWeight: 500, color: '#111827', outline: 'none', width: '100%' }}
                          value={item.title}
                          onChange={e => handleLocalUpdate(item.id, { title: e.target.value })}
                          disabled={isInputDisabled} />
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <select
                          style={{ fontSize: 11, background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '3px 6px', color: '#5A6070', outline: 'none' }}
                          value={item.categoryId}
                          onChange={e => handleLocalUpdate(item.id, { categoryId: Number(e.target.value) })}
                          disabled={isInputDisabled}>
                          {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <input type="number" min="0"
                          style={{ width: 64, background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '4px 6px', textAlign: 'right', fontSize: 12, fontWeight: 500, color: '#111827', outline: 'none' }}
                          value={item.targetValue === undefined || item.targetValue === null || item.targetValue === '' ? '' : item.targetValue}
                          onKeyDown={e => {
                            if (e.key === '-') {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => {
                            const val = e.target.value;
                            handleLocalUpdate(item.id, { targetValue: val === '' ? '' : Math.max(0, Number(val)) });
                          }}
                          disabled={isInputDisabled} />
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <input type="text"
                          style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 12, color: '#5A6070', textAlign: 'center', outline: 'none', width: '100%' }}
                          value={item.unit}
                          onChange={e => handleLocalUpdate(item.id, { unit: e.target.value })}
                          disabled={isInputDisabled} />
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" min="0" max="35"
                            style={{ width: 56, background: Number(item.weightPercent) > 35 ? '#FCEBEB' : '#EEF3FD', border: `0.5px solid ${Number(item.weightPercent) > 35 ? '#F5BFBF' : '#B5D4F4'}`, borderRadius: 6, padding: '4px 6px', textAlign: 'right', fontSize: 12, fontWeight: 500, color: Number(item.weightPercent) > 35 ? '#791F1F' : '#0C447C', outline: 'none' }}
                            value={item.weightPercent === undefined || item.weightPercent === null || item.weightPercent === '' ? '' : item.weightPercent}
                            onKeyDown={e => {
                              if (e.key === '-') {
                                e.preventDefault();
                              }
                            }}
                            onChange={e => {
                              const val = e.target.value;
                              handleLocalUpdate(item.id, { weightPercent: val === '' ? '' : Math.max(0, Number(val)) });
                            }}
                            disabled={isInputDisabled} />
                          <span style={{ fontSize: 11, color: Number(item.weightPercent) > 35 ? '#791F1F' : '#0C447C' }}>%</span>
                        </div>
                        {Number(item.weightPercent) > 35 && (
                          <p style={{ fontSize: 9, color: '#791F1F', marginTop: 2, textAlign: 'center' }}>Max 35%</p>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button onClick={() => confirmDeleteItem(item.id)} disabled={isInputDisabled}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E0E2E8', padding: 4 }}
                          className="hover:text-[#791F1F] transition-colors disabled:opacity-0">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isHistoricalCycle && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, borderTop: '0.5px solid #F0F2F6' }}>
                        <button onClick={handleAddCustomGoal}
                          style={{ width: '100%', padding: '10px', fontSize: 12, fontWeight: 500, color: '#1A56DB', background: '#FAFBFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                          className="hover:bg-[#EEF3FD] transition-colors">
                          <Plus size={13} /> Add New Goal Row
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', background: '#FFFFFF', borderTop: '0.5px solid #E4E6EC', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Aggregate Weight</p>
                <div className="flex items-center gap-3">
                  <div style={{ width: 160, height: 6, background: '#EEF0F6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, transition: 'width 0.5s', width: `${Math.min(totalWeight, 100)}%`, background: totalWeight === 100 ? '#27500A' : totalWeight > 100 ? '#F87171' : '#1A56DB' }} />
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>{totalWeight}%</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: totalWeight === 100 && overweightItems.length === 0 ? '#B8DCA0' : totalWeight > 100 || overweightItems.length > 0 ? '#F87171' : '#111827' }}>
                  {totalWeight === 100 && overweightItems.length === 0 ? 'Verified' : totalWeight > 100 ? `Exceeded by ${totalWeight - 100}%` : `${100 - totalWeight}% Remaining`}
                </p>
                {overweightItems.length > 0 && (
                  <p style={{ fontSize: 10, color: '#F87171', marginTop: 4 }}>
                    {overweightItems.length} item{overweightItems.length > 1 ? 's' : ''} exceed{overweightItems.length === 1 ? 's' : ''} 35% cap
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      )}

      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.5)' }}>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '24px', maxWidth: 400, width: '100%' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} style={{ color: '#991B1B' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{deleteConfirmModal.title}</p>
            </div>
            <p style={{ fontSize: 13, color: '#5A6070', marginBottom: 20 }}>{deleteConfirmModal.message}</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false })}
                className="flex-1 transition-colors"
                style={{ background: '#F5F6F8', color: '#111827', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={() => { deleteConfirmModal.onConfirm(); setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false }); }}
                className="flex-1 transition-colors"
                style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Edit3 size={22} color="#D97706" />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', textAlign: 'center', marginBottom: 8 }}>Edit Goals</h2>
            <p style={{ fontSize: 13, color: '#5A6070', textAlign: 'center', marginBottom: 16, lineHeight: 1.6 }}>
              This will revert the goal set back to <strong>DRAFT</strong> status so you can make changes.
            </p>
            <div style={{ background: '#FEF9EC', border: '0.5px solid #FCD34D', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: '#92400E', fontWeight: 500, marginBottom: 6 }}>This action will:</p>
              <ul style={{ fontSize: 12, color: '#92400E', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                <li>Revert status from APPROVED → DRAFT</li>
                <li>Allow goal items to be edited or added</li>
                <li>Require re-approval before scoring</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEditConfirm(false)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '0.5px solid #E0E2E8', background: '#F5F6F8', color: '#374151', fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleEditConfirmed} disabled={isSubmitting}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#D97706', color: '#FFFFFF', fontSize: 13, fontWeight: 500 }}
                className="disabled:opacity-50 hover:bg-[#B45309] transition-colors">
                {isSubmitting ? 'Reverting…' : 'Revert to Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalAssignmentWorkspace;
