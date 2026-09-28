import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useCreateLibraryMutation,
  useUpdateLibraryMutation,
  useGetKpiCategoriesQuery,
  useGetLibraryByIdQuery
} from '../../services/kpiApi';
import { useGetPositionsQuery } from '../../features/org/positionApi';
import { useGetJobLevelsQuery } from '../../features/org/jobLevelApi';
import { validateKpiWeights } from '../../utils/kpiCalculations';
import type { KpiLibraryDetailRequest } from '../../features/kpi/kpiTypes';
import React from 'react';
import { ChevronLeft } from 'lucide-react';

import LibraryBasicInfo from '../../components/kpi/LibraryBasicInfo';
import LibraryKpiTable from '../../components/kpi/LibraryKpiTable';
import LibrarySyncInfo from '../../components/kpi/LibrarySyncInfo';

interface FormKpiDetail extends KpiLibraryDetailRequest {
  _savedTargetValue?: number;
}

const KpiLibraryEntry: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [createLibrary, { isLoading: isCreating }] = useCreateLibraryMutation();
  const [updateLibrary, { isLoading: isUpdating }] = useUpdateLibraryMutation();

  const { data: libraryData, isLoading: libraryLoading } = useGetLibraryByIdQuery(parseInt(id || '0'), { skip: !isEdit });
  const { data: positions = [] } = useGetPositionsQuery();
  const { data: jobLevels = [] } = useGetJobLevelsQuery();
  const { data: categoriesResponse } = useGetKpiCategoriesQuery();
  const categories = categoriesResponse?.data || [];

  const [formData, setFormData] = useState({ title: '', description: '', positionId: 0, targetLevelId: 0 });
  const [details, setDetails] = useState<FormKpiDetail[]>([
    { goalTitle: '', unit: '', targetValue: 1, weightPercent: 5, categoryId: 0, isCompliance: false }
  ]);

  useEffect(() => {
    if (isEdit && libraryData?.data) {
      const lib = libraryData.data;

      setFormData({
        title: lib.title || '',
        description: lib.description || '',
        positionId: Number(lib.positionId) || 0,
        targetLevelId: Number(lib.targetLevelId) || 0,
      });

      if (lib.details && lib.details.length > 0) {
        setDetails(lib.details.map(d => ({
          goalTitle: d.goalTitle || '',
          unit: d.unit || '',
          targetValue: Number(d.targetValue) || 0,
          weightPercent: Number(d.weightPercent) || 0,
          categoryId: Number(d.categoryId) || 0,
          isCompliance: d.isCompliance || false
        })));
      }
    }
  }, [isEdit, libraryData, positions.length]);

  const { totalWeight, isValid, errors } = validateKpiWeights(details);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name.endsWith('Id') ? parseInt(value) : value });
  };

  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...details];

    let updatedItem: FormKpiDetail = {
      ...newDetails[index],
      [field]: field === 'categoryId' ? parseInt(value) || 0
        : field === 'isCompliance' ? !!value
          : ['targetValue', 'weightPercent'].includes(field as string) ? (value === '' ? '' : parseFloat(value) || 0)
            : value
    } as FormKpiDetail;

    if (field === 'isCompliance') {
      if (value === true) {
        // Save current target so it can be restored when toggled off, then lock to 1
        updatedItem._savedTargetValue = Number(newDetails[index].targetValue) || 1;
        updatedItem.targetValue = 1;
        if (!updatedItem.unit) updatedItem.unit = 'Score';
      } else {
        // Restore the value that existed before compliance was switched on
        updatedItem.targetValue = newDetails[index]._savedTargetValue ?? 1;
        updatedItem._savedTargetValue = undefined;
      }
    }

    newDetails[index] = updatedItem;
    setDetails(newDetails);
  };

  const addRow = () => {
    setDetails([...details, { goalTitle: '', unit: '', targetValue: 1, weightPercent: 10, categoryId: 0, isCompliance: false }]);
  };

  const removeRow = (index: number) => {
    if (details.length > 1) {
      setDetails(details.filter((_, i) => i !== index));
    }
  };

  const buildPayload = () => ({
    ...formData,
    details: details.map(({ _savedTargetValue: _saved, ...d }) => ({
      ...d,
      targetValue: (d.targetValue as any) === '' ? 1 : Math.max(1, Number(d.targetValue)),
      weightPercent: (d.weightPercent as any) === '' ? 0 : d.weightPercent,
    })),
  });

  const handleSave = async () => {
    if (!formData.title.trim()) { toast.warning('Please enter a Template Title.'); return; }
    if (formData.positionId === 0) { toast.warning('Please select a Target Position.'); return; }
    for (let i = 0; i < details.length; i++) {
      const d = details[i];
      if (!d.goalTitle.trim()) { toast.warning(`Goal card ${i + 1}: Please enter a goal title.`); return; }
      if (d.categoryId === 0) { toast.warning(`Goal card ${i + 1}: Please select a Category.`); return; }
      if (((d.targetValue as any) === '' ? 0 : Number(d.targetValue)) < 1) { toast.warning(`Goal card ${i + 1}: Target value must be at least 1.`); return; }
      if (!d.unit?.trim()) { toast.warning(`Goal card ${i + 1}: Please enter a Unit.`); return; }
    }
    if (!isValid) { toast.error(errors.join('\n')); return; }
    try {
      const payload = buildPayload();
      if (isEdit) { await updateLibrary({ id: parseInt(id!), data: payload }).unwrap(); }
      else { await createLibrary(payload).unwrap(); }
      navigate('/kpi/library');
    } catch (err: any) {
      toast.error('Failed to save template. Please check your inputs.');
    }
  };

  if (isEdit && libraryLoading) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading library entry…</div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ paddingBottom: 14, borderBottom: '0.5px solid #E4E6EC' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070', flexShrink: 0 }}
            className="hover:bg-[#F5F6F8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>KPI Library Entry</h1>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>{isEdit ? 'Edit template goals and weights.' : 'Create a reusable KPI template.'}</p>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => navigate(-1)}
            style={{ background: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500 }}
            className="hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isCreating || isUpdating}
            style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500 }}
            className="disabled:opacity-50 hover:opacity-90 transition-opacity">
            {isCreating || isUpdating ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <LibraryBasicInfo formData={formData} positions={positions} jobLevels={jobLevels} onChange={handleInputChange} />
        <LibrarySyncInfo />
        <LibraryKpiTable
          details={details}
          categories={categories}
          onDetailChange={handleDetailChange}
          onAddRow={addRow}
          onRemoveRow={removeRow}
          totalWeight={totalWeight}
        />
      </div>
    </div>
  );
};

export default KpiLibraryEntry;
