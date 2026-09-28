import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  useCreateAppraisalFormMutation,
  useAddCategoryMutation,
  useAddQuestionMutation,
  useGetCyclesQuery,
  useGetAppraisalFormsQuery,
  useLazyGetAppraisalFormQuery,
  useUpdateAppraisalFormMutation,
} from "../../features/appraisal/appraisalApi";
import {
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  Layout,
  ListTodo,
  Settings,
  FileText,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import React from "react";

interface QuestionDraft {
  text: string;
  type: "RATING" | "TEXT" | "YESNO";
  secondaryType?: "RATING" | "TEXT" | "YESNO" | "NONE";
  isRequired: boolean;
}

interface CategoryDraft {
  name: string;
  questions: QuestionDraft[];
}

const inputStyle: React.CSSProperties = {
  background: "#F5F6F8",
  border: "0.5px solid #E0E2E8",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 13,
  color: "#111827",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: "#9EA3B0",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 5,
};

const AppraisalFormDesign: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: cycles = [] } = useGetCyclesQuery();

  const [createForm] = useCreateAppraisalFormMutation();
  const [addCategory] = useAddCategoryMutation();
  const [addQuestion] = useAddQuestionMutation();
  const { data: allForms = [], isLoading: formsLoading } =
    useGetAppraisalFormsQuery();
  const [fetchFormDetail] = useLazyGetAppraisalFormQuery();
  const [updateForm] = useUpdateAppraisalFormMutation();

  const queryParams = new URLSearchParams(location.search);
  const initialCycleId =
    queryParams.get("cycleId") || location.state?.cycleId || "";
  const initialType = queryParams.get("type") || "SELF_ASSESSMENT";
  const initialSetName = queryParams.get("setName")
    ? decodeURIComponent(queryParams.get("setName")!)
    : "";
  const isSetNameFromUrl = React.useMemo(
    () => !!initialSetName,
    [initialSetName],
  );
  const isEditMode = queryParams.get("edit") === "true";
  const existingFormId = queryParams.get("formId");

  const initialRelationship = (queryParams.get("relationship") || "") as string;

  const defaultFormName = () => {
    if (initialType === "MANAGER_EVALUATION")
      return "Manager Evaluation Template";
    if (initialType === "FEEDBACK") return "360° Feedback Template";
    return "Self Assessment Template";
  };

  const [formName, setFormName] = useState(defaultFormName());
  const [formType, setFormType] = useState(initialType);
  const [targetRelationship, setTargetRelationship] =
    useState<string>(initialRelationship);
  const [selectedCycleId, setSelectedCycleId] =
    useState<string>(initialCycleId);
  const [setName, setSetName] = useState<string>(initialSetName);
  const [categories, setCategories] = useState<CategoryDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);
  const [settings, setSettings] = useState({ mandatory: true });

  const FEEDBACK_DEFAULT_CATEGORIES: CategoryDraft[] = [
    {
      name: "Performance Evaluation",
      questions: [
        { text: "Communication Skills",        type: "RATING", secondaryType: "TEXT", isRequired: true },
        { text: "Teamwork & Collaboration",    type: "RATING", secondaryType: "TEXT", isRequired: true },
        { text: "Technical Skills",            type: "RATING", secondaryType: "TEXT", isRequired: true },
        { text: "Work Quality",                type: "RATING", secondaryType: "TEXT", isRequired: true },
        { text: "Accountability & Responsibility", type: "RATING", secondaryType: "TEXT", isRequired: true },
        { text: "Problem Solving",             type: "RATING", secondaryType: "TEXT", isRequired: true },
        { text: "Learning & Improvement",      type: "RATING", secondaryType: "TEXT", isRequired: true },
        { text: "Attitude & Professionalism",  type: "RATING", secondaryType: "TEXT", isRequired: true },
      ],
    },
    {
      name: "Additional Comments",
      questions: [
        {
          text: "Overall comments about this employee's performance",
          type: "TEXT",
          isRequired: false,
        },
      ],
    },
  ];

  React.useEffect(() => {
    const loadForm = async () => {
      if (isEditMode && existingFormId) {
        try {
          const fullForm = await fetchFormDetail(existingFormId).unwrap();
          setIsAssigned(fullForm.isAssigned ?? false);
          const parts = fullForm.formName.split(" | ");
          if (parts.length > 1) {
            setSetName(parts[0]);
            setFormName(parts[1]);
          } else setFormName(fullForm.formName);
          setFormType(fullForm.formType as string);
          if (fullForm.targetRelationship)
            setTargetRelationship(fullForm.targetRelationship);
          setSelectedCycleId(String(fullForm.cycleId));
          const sections = fullForm.sections || fullForm.categories || [];
          setCategories(
            sections.map((s: any) => ({
              name: s.categoryName || s.title || "Section",
              questions: (s.questions || []).map((q: any) => ({
                text: q.questionText || q.text || "",
                type: q.questionType || q.type || "RATING",
                secondaryType:
                  q.secondaryQuestionType || q.secondaryType || "NONE",
                isRequired: q.isRequired ?? q.required ?? true,
              })),
            })),
          );
        } catch (err) {
          console.error(err);
        }
      } else if (initialType === "FEEDBACK") {
        setCategories(FEEDBACK_DEFAULT_CATEGORIES);
      } else {
        setCategories([
          {
            name:
              initialType === "MANAGER_EVALUATION"
                ? "Management Skills"
                : "Technical Competencies",
            questions: [
              {
                text: "",
                type: "RATING",
                secondaryType:
                  initialType === "SELF_ASSESSMENT" ? "YESNO" : "NONE",
                isRequired: true,
              },
            ],
          },
        ]);
      }
    };
    loadForm();
  }, [isEditMode, existingFormId]);

  const libraryForms = allForms.filter((f) => {
    const fType = f.formType?.toString().toUpperCase().replace(/[\s_]/g, "");
    const targetType = formType?.toString().toUpperCase().replace(/[\s_]/g, "");
    return fType === targetType;
  });

  const applySystemTemplate = async (formId: number) => {
    try {
      const fullForm = await fetchFormDetail(String(formId)).unwrap();
      const sections = fullForm.sections || fullForm.categories || [];
      if (sections.length > 0) {
        setCategories(
          sections.map((s: any) => ({
            name: s.categoryName || s.title || "Section",
            questions: (s.questions || []).map((q: any) => ({
              text: q.questionText || q.text || "",
              type: q.questionType || q.type || "RATING",
              secondaryType:
                q.secondaryQuestionType || q.secondaryType || "NONE",
              isRequired: q.isRequired ?? q.required ?? true,
            })),
          })),
        );
      }
      setShowLibrary(false);
    } catch {
      toast.error("Could not load this template. Please try another.");
    }
  };

  const addNewCategory = () =>
    setCategories([...categories, { name: "New Section", questions: [] }]);
  const removeCategory = (index: number) =>
    setCategories(categories.filter((_, i) => i !== index));
  const addQuestionToCategory = (catIndex: number) => {
    const newCats = [...categories];
    const secondaryType = formType === "SELF_ASSESSMENT" ? "YESNO" : formType === "FEEDBACK" ? "TEXT" : "NONE";
    newCats[catIndex].questions.push({
      text: "",
      type: "RATING",
      secondaryType,
      isRequired: true,
    });
    setCategories(newCats);
  };
  const removeQuestion = (catIndex: number, qIndex: number) => {
    const newCats = [...categories];
    newCats[catIndex].questions = newCats[catIndex].questions.filter(
      (_, i) => i !== qIndex,
    );
    setCategories(newCats);
  };
  const updateQuestion = (
    catIndex: number,
    qIndex: number,
    updates: Partial<QuestionDraft>,
  ) => {
    const newCats = [...categories];
    newCats[catIndex].questions[qIndex] = {
      ...newCats[catIndex].questions[qIndex],
      ...updates,
    };
    setCategories(newCats);
  };

  const isFeedback = formType === "FEEDBACK";

  const loadDemoTemplate = () => {
    if (cycles && cycles.length > 0 && !selectedCycleId) {
      const activeC = cycles.find((c: any) => c.status === "ACTIVE" || c.isActive) || cycles[0];
      if (activeC) setSelectedCycleId(String(activeC.cycleId));
    }
    if (formType === "MANAGER_EVALUATION") {
      setFormName("Manager Leadership & Milestone Review");
      if (!setName) setSetName("Engineering & Tech Form Set");
      setCategories([
        {
          name: "Milestone Execution & Architecture",
          questions: [
            { text: "Successfully delivers technical features on roadmap schedule", type: "RATING", secondaryType: "TEXT", isRequired: true },
            { text: "Adheres to architectural standards, code reviews, and reliability requirements", type: "RATING", secondaryType: "TEXT", isRequired: true },
            { text: "Proactively identifies project blockers and resolves technical risks", type: "RATING", secondaryType: "TEXT", isRequired: true },
          ],
        },
        {
          name: "Team Leadership & Culture",
          questions: [
            { text: "Conducts regular syncs, actively coaches and mentors junior engineers", type: "RATING", secondaryType: "TEXT", isRequired: true },
            { text: "Demonstrates accountability, transparent communication, and team advocacy", type: "RATING", secondaryType: "TEXT", isRequired: true },
          ],
        },
      ]);
    } else {
      setFormName("Software Engineer Self-Assessment Template");
      if (!setName) setSetName("Engineering & Tech Form Set");
      setCategories([
        {
          name: "Core Technical Competencies",
          questions: [
            { text: "Code Quality, Architecture, and Clean Code Principles", type: "RATING", secondaryType: "YESNO", isRequired: true },
            { text: "System Scalability, Algorithmic Efficiency & Debugging", type: "RATING", secondaryType: "YESNO", isRequired: true },
            { text: "Automated Testing, CI/CD Standards, and Production Observability", type: "RATING", secondaryType: "YESNO", isRequired: true },
          ],
        },
        {
          name: "Collaboration & Impact",
          questions: [
            { text: "Cross-Functional Collaboration, Active Listening & Team Knowledge Sharing", type: "RATING", secondaryType: "TEXT", isRequired: true },
            { text: "Sprint Commitment Delivery, Ownership, and Problem Resolution", type: "RATING", secondaryType: "YESNO", isRequired: true },
          ],
        },
        {
          name: "Innovation & Growth",
          questions: [
            { text: "Continuous Learning, Innovation, and Adoption of Modern Technologies", type: "RATING", secondaryType: "TEXT", isRequired: false },
          ],
        },
      ]);
    }
    toast.success("Demo template loaded into Form Builder!");
  };

  const handleSaveForm = async () => {
    if (!selectedCycleId) {
      toast.warning("Please select an Appraisal Cycle first.");
      return;
    }
    if (!isFeedback && !setName.trim()) {
      toast.warning("Please provide a Form Set name.");
      return;
    }
    if (isFeedback && !targetRelationship) {
      toast.warning("Please select a Target Relationship for this 360° form.");
      return;
    }
    if (isAssigned) {
      toast.error(
        "This form is assigned to active appraisals and cannot be modified.",
      );
      return;
    }

    const prefixedFormName = isFeedback
      ? formName
      : `${setName.trim()} | ${formName}`;

    try {
      setIsSubmitting(true);
      let formId: number;
      if (isEditMode && existingFormId) {
        await updateForm({
          id: existingFormId,
          body: {
            formName: prefixedFormName,
            formType,
            cycleId: Number(selectedCycleId),
            ...(isFeedback && { targetRelationship }),
          },
        }).unwrap();
        formId = Number(existingFormId);
      } else {
        formId = await createForm({
          formName: prefixedFormName,
          formType,
          cycleId: Number(selectedCycleId),
          ...(isFeedback && { targetRelationship }),
          formSetId: queryParams.get("formSetId")
            ? Number(queryParams.get("formSetId"))
            : undefined,
        }).unwrap();
      }
      for (const cat of categories) {
        const catId = await addCategory({
          formId,
          categoryName: cat.name,
        }).unwrap();
        for (const q of cat.questions) {
          await addQuestion({
            categoryId: catId,
            questionText: q.text,
            questionType: q.type,
            secondaryQuestionType:
              q.secondaryType === "NONE" ? null : q.secondaryType,
            isRequired: q.isRequired,
          }).unwrap();
        }
      }
      toast.success(isEditMode ? "Form updated!" : "Form saved!");
      if (isFeedback) {
        navigate(`/360-feedback/admin?cycleId=${selectedCycleId}`);
      } else {
        const cycle = cycles.find(
          (c) => Number(c.cycleId) === Number(selectedCycleId),
        );
        navigate("/appraisal", {
          state: { activeTab: "forms", expandedCycle: cycle?.cycleName || "" },
        });
      }
    } catch (err: any) {
      toast.error(
        'Failed to save. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const miniOptionPreview = (type: string) => (
    <div className="flex gap-1">
      {type === "YESNO" &&
        ["Y", "N"].map((o) => (
          <div
            key={o}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: "0.5px solid #E0E2E8",
              background: "#F5F6F8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              color: "#9EA3B0",
              fontWeight: 500,
            }}
          >
            {o}
          </div>
        ))}
      {type === "RATING" &&
        [5, 4, 3, 2, 1].map((n) => (
          <div
            key={n}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: "0.5px solid #E0E2E8",
              background: "#F5F6F8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              color: "#9EA3B0",
              fontWeight: 500,
            }}
          >
            {n}
          </div>
        ))}
      {type === "TEXT" && (
        <div
          style={{
            width: 80,
            height: 12,
            border: "0.5px dashed #E0E2E8",
            background: "#F5F6F8",
            borderRadius: 3,
          }}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isFeedback) {
                navigate(
                  `/360-feedback/admin${selectedCycleId ? `?cycleId=${selectedCycleId}` : ""}`,
                );
              } else {
                const cycle = cycles.find(
                  (c) => Number(c.cycleId) === Number(selectedCycleId),
                );
                navigate("/appraisal", {
                  state: {
                    activeTab: "forms",
                    expandedCycle: cycle?.cycleName,
                    expandedSet: setName || "__unassigned__",
                  },
                });
              }
            }}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "0.5px solid #E4E6EC",
              borderRadius: 8,
              background: "#FFFFFF",
              color: "#5A6070",
            }}
            className="hover:bg-[#F5F6F8] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "#9EA3B0",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Templates / Builder
            </p>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>
              Form Template Builder
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {!isPreviewMode && (
            <button
              type="button"
              onClick={loadDemoTemplate}
              className="inline-flex items-center gap-1.5 transition-colors"
              title="Instantly load pre-built demo sections and questions"
              style={{
                background: "#EEF3FD",
                color: "#1A56DB",
                border: "0.5px solid #B5D4F4",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Sparkles size={13} style={{ color: "#1A56DB" }} />
              Load Demo Template
            </button>
          )}
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="inline-flex items-center gap-2 transition-colors"
            style={{
              background: isPreviewMode ? "#EEF3FD" : "#F5F6F8",
              color: isPreviewMode ? "#1A56DB" : "#5A6070",
              border: `0.5px solid ${isPreviewMode ? "#B5D4F4" : "#E0E2E8"}`,
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {isPreviewMode ? <ListTodo size={13} /> : <Layout size={13} />}
            {isPreviewMode ? "Back to Editor" : "Live Preview"}
          </button>
          {!isPreviewMode && (
            <button
              onClick={handleSaveForm}
              disabled={isSubmitting || isAssigned}
              className="inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{
                background: "#1A56DB",
                color: "#FFFFFF",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
              }}
            >
              <Save size={13} /> {isSubmitting ? "Saving…" : "Save Template"}
            </button>
          )}
        </div>
      </div>

      {/* Assigned warning */}
      {isAssigned && !isPreviewMode && (
        <div
          style={{
            background: "#FAEEDA",
            border: "0.5px solid #E8C98C",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={13} style={{ color: "#633806" }} />
            <p style={{ fontSize: 12, color: "#633806" }}>
              This form is <strong>Assigned</strong> to active appraisals.
              Structural changes may impact existing assessment data.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Metadata */}
          <div
            style={{
              background: "#FFFFFF",
              border: "0.5px solid #E4E6EC",
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <p style={{ ...labelStyle, marginBottom: 14 }}>Template Metadata</p>
            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Template Name</label>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. 2024 Engineering Appraisal"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Appraisal Type</label>
                <select
                  style={{
                    ...inputStyle,
                    opacity: 0.75,
                    cursor: "not-allowed",
                  }}
                  value={formType}
                  disabled
                >
                  <option value="SELF_ASSESSMENT">Self Assessment</option>
                  <option value="MANAGER_EVALUATION">Manager Evaluation</option>
                  <option value="FEEDBACK">360° Feedback</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Target Cycle</label>
                <select
                  style={{
                    ...inputStyle,
                    opacity: 0.75,
                    cursor: "not-allowed",
                  }}
                  value={selectedCycleId}
                  disabled
                >
                  <option value="">Select a Cycle…</option>
                  {cycles.map((c) => (
                    <option key={c.cycleId} value={c.cycleId}>
                      {c.cycleName}
                    </option>
                  ))}
                </select>
              </div>
              {isFeedback ? (
                <div>
                  <label style={labelStyle}>Target Relationship</label>
                  <select
                    style={{
                      ...inputStyle,
                      ...(isAssigned
                        ? { opacity: 0.75, cursor: "not-allowed" }
                        : {}),
                    }}
                    value={targetRelationship}
                    disabled={isAssigned}
                    onChange={(e) => setTargetRelationship(e.target.value)}
                  >
                    <option value="">Select who fills this form…</option>
                    <option value="DIRECT_MANAGER">
                      Manager evaluates target
                    </option>
                    <option value="PEER">Peer evaluates target</option>
                    <option value="SUBORDINATE">
                      Subordinate evaluates target
                    </option>
                    <option value="SELF">Self-assessment</option>
                  </select>
                  <p style={{ fontSize: 11, color: "#9EA3B0", marginTop: 4 }}>
                    Each relationship type needs its own form for targeted
                    questions.
                  </p>
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>Form Set Name</label>
                  {isSetNameFromUrl ? (
                    <div
                      className="flex items-center gap-2"
                      style={{
                        background: "#EEF3FD",
                        border: "0.5px solid #B5D4F4",
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      <Layers
                        size={13}
                        style={{ color: "#1A56DB", flexShrink: 0 }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#0C447C",
                          flex: 1,
                        }}
                      >
                        {setName}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 500,
                          color: "#1A56DB",
                          background: "#DCEEFF",
                          borderRadius: 4,
                          padding: "2px 6px",
                        }}
                      >
                        LOCKED
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder='e.g. "Software Engineer"'
                      value={setName}
                      readOnly={isAssigned}
                      onChange={(e) => setSetName(e.target.value)}
                    />
                  )}
                  <p style={{ fontSize: 11, color: "#9EA3B0", marginTop: 4 }}>
                    {isSetNameFromUrl
                      ? "Set from the Form Set you created."
                      : "Groups both form types as a Form Set."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div
            style={{
              background: "#FFFFFF",
              border: "0.5px solid #E4E6EC",
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <p style={{ ...labelStyle, marginBottom: 14 }}>Template Settings</p>
            <div
              onClick={() =>
                !isAssigned &&
                setSettings({ ...settings, mandatory: !settings.mandatory })
              }
              className="flex items-center justify-between transition-colors"
              style={{
                background: "#F5F6F8",
                border: "0.5px solid #E0E2E8",
                borderRadius: 8,
                padding: "10px 12px",
                cursor: isAssigned ? "not-allowed" : "pointer",
                opacity: isAssigned ? 0.75 : 1,
                marginBottom: 12,
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
                  Mandatory Completion
                </p>
                <p style={{ fontSize: 11, color: "#9EA3B0" }}>
                  Requires all items to be filled
                </p>
              </div>
              <div
                style={{
                  width: 36,
                  height: 18,
                  borderRadius: 9,
                  background: settings.mandatory ? "#1A56DB" : "#E0E2E8",
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    width: 12,
                    height: 12,
                    background: "#FFFFFF",
                    borderRadius: "50%",
                    transition: "left 0.2s",
                    left: settings.mandatory ? 21 : 3,
                  }}
                />
              </div>
            </div>
            <div style={{ paddingTop: 10, borderTop: "0.5px solid #F0F2F6" }}>
              <div
                className="flex items-center justify-between"
                style={{ marginBottom: 6 }}
              >
                <span style={{ fontSize: 11, color: "#9EA3B0" }}>
                  Overall Scoring Weight
                </span>
                <span
                  style={{ fontSize: 12, fontWeight: 500, color: "#1A56DB" }}
                >
                  100%
                </span>
              </div>
              <div
                style={{
                  background: "#F0F2F6",
                  borderRadius: 4,
                  height: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "#1A56DB",
                    width: "100%",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: "#9EA3B0",
                  marginTop: 5,
                  fontStyle: "italic",
                }}
              >
                Balanced across {categories.length}{" "}
                {categories.length === 1 ? "category" : "categories"}.
              </p>
            </div>
          </div>

          {/* Design guide */}
          <div
            style={{
              background: "#111827",
              borderRadius: 12,
              padding: "14px 16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#FFFFFF",
                  marginBottom: 6,
                }}
              >
                Design Guide
              </p>
              <p style={{ fontSize: 12, color: "#9EA3B0", lineHeight: 1.6 }}>
                Ensure all categories have at least 3 measurable indicators for
                statistical validity.
              </p>
            </div>
            <Settings
              size={64}
              style={{
                position: "absolute",
                right: -8,
                bottom: -8,
                color: "rgba(255,255,255,0.06)",
              }}
            />
          </div>
        </div>

        {/* Right: builder or preview */}
        <div className="lg:col-span-8 space-y-4">
          {isPreviewMode ? (
            /* Preview mode */
            <div className="space-y-4">
              {categories.map((cat, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#FFFFFF",
                    border: "0.5px solid #E4E6EC",
                    borderRadius: 12,
                    padding: "20px 24px",
                  }}
                >
                  <h3
                    className="flex items-center gap-2"
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: "#111827",
                      marginBottom: 18,
                      paddingBottom: 12,
                      borderBottom: "0.5px solid #E4E6EC",
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        height: 18,
                        background: "#1A56DB",
                        borderRadius: 2,
                        display: "inline-block",
                      }}
                    />
                    {cat.name}
                  </h3>
                  <div className="space-y-8">
                    {cat.questions.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-3">
                        <div className="flex items-start gap-2">
                          <span
                            style={{
                              fontSize: 11,
                              color: "#9EA3B0",
                              marginTop: 2,
                            }}
                          >
                            {qIdx + 1}.
                          </span>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#111827",
                            }}
                          >
                            {q.text || (
                              <em style={{ color: "#9EA3B0" }}>
                                Question text…
                              </em>
                            )}
                            {q.isRequired && (
                              <span style={{ color: "#791F1F", marginLeft: 3 }}>
                                *
                              </span>
                            )}
                          </p>
                        </div>
                        <div style={{ paddingLeft: 20 }} className="space-y-3">
                          {q.secondaryType && q.secondaryType !== "NONE" && (
                            <div>
                              <p
                                style={{
                                  fontSize: 9,
                                  color: "#9EA3B0",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  marginBottom: 6,
                                }}
                              >
                                Rating 1: {q.secondaryType}
                              </p>
                              {q.secondaryType === "RATING" && (
                                <div className="flex gap-2">
                                  {[5, 4, 3, 2, 1].map((n) => (
                                    <div
                                      key={n}
                                      style={{
                                        width: 40,
                                        height: 40,
                                        border: "0.5px solid #E0E2E8",
                                        borderRadius: 8,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 13,
                                        color: "#9EA3B0",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {n}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.secondaryType === "YESNO" && (
                                <div className="flex gap-2">
                                  {["Yes", "No"].map((o) => (
                                    <div
                                      key={o}
                                      style={{
                                        border: "0.5px solid #E0E2E8",
                                        borderRadius: 8,
                                        padding: "6px 18px",
                                        fontSize: 13,
                                        color: "#9EA3B0",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {o}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.secondaryType === "TEXT" && (
                                <div
                                  style={{
                                    height: 60,
                                    border: "0.5px dashed #E0E2E8",
                                    borderRadius: 8,
                                    background: "#F5F6F8",
                                  }}
                                />
                              )}
                            </div>
                          )}
                          <div>
                            <p
                              style={{
                                fontSize: 9,
                                color: "#9EA3B0",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                marginBottom: 6,
                              }}
                            >
                              Rating 2: {q.type}
                            </p>
                            {q.type === "RATING" && (
                              <div className="flex gap-2">
                                {[5, 4, 3, 2, 1].map((n) => (
                                  <div
                                    key={n}
                                    style={{
                                      width: 40,
                                      height: 40,
                                      border: "0.5px solid #E0E2E8",
                                      borderRadius: 8,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 13,
                                      color: "#9EA3B0",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {n}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === "YESNO" && (
                              <div className="flex gap-2">
                                {["Yes", "No"].map((o) => (
                                  <div
                                    key={o}
                                    style={{
                                      border: "0.5px solid #E0E2E8",
                                      borderRadius: 8,
                                      padding: "6px 18px",
                                      fontSize: 13,
                                      color: "#9EA3B0",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {o}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === "TEXT" && (
                              <div
                                style={{
                                  height: 80,
                                  border: "0.5px dashed #E0E2E8",
                                  borderRadius: 8,
                                  background: "#F5F6F8",
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Editor mode */
            <>
              {categories.map((cat, catIdx) => (
                <div
                  key={catIdx}
                  style={{
                    background: "#FFFFFF",
                    border: "0.5px solid #E4E6EC",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Category header */}
                  <div
                    className="flex items-center justify-between"
                    style={{
                      padding: "12px 18px",
                      borderBottom: "0.5px solid #E4E6EC",
                      background: "#FAFBFF",
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: "#F5F6F8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Layout size={14} style={{ color: "#9EA3B0" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => {
                              const n = [...categories];
                              n[catIdx].name = e.target.value;
                              setCategories(n);
                            }}
                            readOnly={isAssigned}
                            style={{
                              background: "transparent",
                              border: "none",
                              outline: "none",
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#111827",
                              width: "100%",
                              fontFamily: "inherit",
                            }}
                            placeholder="Category Name…"
                          />
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 500,
                              color: "#1A56DB",
                              background: "#EEF3FD",
                              border: "0.5px solid #B5D4F4",
                              borderRadius: 4,
                              padding: "2px 6px",
                              flexShrink: 0,
                            }}
                          >
                            {Math.floor(100 / categories.length)}% Weight
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 10,
                            color: "#9EA3B0",
                            marginTop: 1,
                          }}
                        >
                          Section Indicators
                        </p>
                      </div>
                    </div>
                    {!isAssigned && (
                      <button
                        onClick={() => removeCategory(catIdx)}
                        title="Remove section"
                        style={{
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#9EA3B0",
                          borderRadius: 6,
                        }}
                        className="hover:bg-[#FCEBEB] hover:text-[#791F1F] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Questions */}
                  <div
                    style={{
                      padding: "12px 18px",
                      background: "rgba(245,246,248,0.3)",
                    }}
                    className="space-y-3"
                  >
                    {cat.questions.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        style={{
                          background: "#FFFFFF",
                          border: "0.5px solid #E4E6EC",
                          borderRadius: 8,
                          padding: "12px 14px",
                        }}
                        className="hover:border-[#1A56DB] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              background: "#F5F6F8",
                              color: "#9EA3B0",
                              fontSize: 10,
                              fontWeight: 500,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            {qIdx + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <textarea
                              rows={1}
                              placeholder="What would you like to evaluate?"
                              style={{
                                background: "transparent",
                                border: "none",
                                outline: "none",
                                fontSize: 13,
                                fontWeight: 500,
                                color: "#111827",
                                width: "100%",
                                resize: "none",
                                fontFamily: "inherit",
                                marginBottom: 10,
                              }}
                              value={q.text}
                              readOnly={isAssigned}
                              onChange={(e) =>
                                updateQuestion(catIdx, qIdx, {
                                  text: e.target.value,
                                })
                              }
                            />

                            {formType === "FEEDBACK" ? (
                              <div className="flex flex-wrap items-center gap-3">
                                <div style={{ flex: 1, minWidth: 140 }}>
                                  <label
                                    style={{ ...labelStyle, marginBottom: 3 }}
                                  >
                                    Question Type
                                  </label>
                                  <select
                                    value={q.type}
                                    onChange={(e) =>
                                      updateQuestion(catIdx, qIdx, {
                                        type: e.target.value as any,
                                      })
                                    }
                                    style={{ ...inputStyle, fontSize: 11 }}
                                  >
                                    <option value="RATING">1–5 Rating</option>
                                    <option value="TEXT">Text Comment</option>
                                    <option value="YESNO">Yes / No</option>
                                  </select>
                                </div>
                                <label
                                  className="flex items-center gap-1.5 cursor-pointer"
                                  style={{
                                    fontSize: 11,
                                    color: "#5A6070",
                                    whiteSpace: "nowrap",
                                    marginTop: 14,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={q.isRequired}
                                    onChange={(e) =>
                                      updateQuestion(catIdx, qIdx, {
                                        isRequired: e.target.checked,
                                      })
                                    }
                                    style={{ accentColor: "#1A56DB" }}
                                  />
                                  Required
                                </label>
                              </div>
                            ) : formType === "SELF_ASSESSMENT" ? (
                              <div className="flex flex-wrap items-center gap-3">
                                <div style={{ flex: 1, minWidth: 120 }}>
                                  <label
                                    style={{ ...labelStyle, marginBottom: 3 }}
                                  >
                                    Rating 1
                                  </label>
                                  <select
                                    value={q.secondaryType || "NONE"}
                                    onChange={(e) =>
                                      updateQuestion(catIdx, qIdx, {
                                        secondaryType: e.target.value as any,
                                      })
                                    }
                                    style={{ ...inputStyle, fontSize: 11 }}
                                  >
                                    <option value="YESNO">Yes / No</option>
                                    <option value="TEXT">Text</option>
                                    <option value="RATING">1-5 Rating</option>
                                  </select>
                                </div>
                                <div style={{ flex: 1, minWidth: 120 }}>
                                  <label
                                    style={{ ...labelStyle, marginBottom: 3 }}
                                  >
                                    Rating 2
                                  </label>
                                  <select
                                    value={q.type}
                                    onChange={(e) =>
                                      updateQuestion(catIdx, qIdx, {
                                        type: e.target.value as any,
                                      })
                                    }
                                    style={{ ...inputStyle, fontSize: 11 }}
                                  >
                                    <option value="YESNO">Yes / No</option>
                                    <option value="TEXT">Text</option>
                                    <option value="RATING">1-5 Rating</option>
                                  </select>
                                </div>
                                <label
                                  className="flex items-center gap-1.5 cursor-pointer"
                                  style={{
                                    fontSize: 11,
                                    color: "#5A6070",
                                    whiteSpace: "nowrap",
                                    marginTop: 14,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={q.isRequired}
                                    onChange={(e) =>
                                      updateQuestion(catIdx, qIdx, {
                                        isRequired: e.target.checked,
                                      })
                                    }
                                    style={{ accentColor: "#1A56DB" }}
                                  />
                                  Required
                                </label>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-3">
                                <div style={{ flex: 1, minWidth: 140 }}>
                                  <label
                                    style={{ ...labelStyle, marginBottom: 3 }}
                                  >
                                    Question Type
                                  </label>
                                  <select
                                    value={q.type}
                                    onChange={(e) =>
                                      updateQuestion(catIdx, qIdx, {
                                        type: e.target.value as any,
                                      })
                                    }
                                    style={{ ...inputStyle, fontSize: 11 }}
                                  >
                                    <option value="RATING">1-5 Rating</option>
                                    <option value="YESNO">Yes / No</option>
                                    <option value="TEXT">Text Area</option>
                                  </select>
                                </div>
                                <label
                                  className="flex items-center gap-1.5 cursor-pointer"
                                  style={{
                                    fontSize: 11,
                                    color: "#5A6070",
                                    whiteSpace: "nowrap",
                                    marginTop: 14,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={q.isRequired}
                                    onChange={(e) =>
                                      updateQuestion(catIdx, qIdx, {
                                        isRequired: e.target.checked,
                                      })
                                    }
                                    style={{ accentColor: "#1A56DB" }}
                                  />
                                  Required
                                </label>
                              </div>
                            )}

                            {/* Mini preview */}
                            <div
                              style={{
                                paddingTop: 8,
                                marginTop: 8,
                                borderTop: "0.5px solid #F0F2F6",
                              }}
                              className="flex flex-col gap-2"
                            >
                              {q.secondaryType &&
                                q.secondaryType !== "NONE" && (
                                  <div className="flex items-center gap-3">
                                    <span
                                      style={{
                                        fontSize: 9,
                                        color: "#9EA3B0",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        flexShrink: 0,
                                      }}
                                    >
                                      Box 1: {q.secondaryType}
                                    </span>
                                    {miniOptionPreview(q.secondaryType)}
                                  </div>
                                )}
                              <div className="flex items-center gap-3">
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: "#9EA3B0",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                    flexShrink: 0,
                                  }}
                                >
                                  Box 2: {q.type}
                                </span>
                                {miniOptionPreview(q.type)}
                              </div>
                            </div>
                          </div>

                          {!isAssigned && (
                            <button
                              onClick={() => removeQuestion(catIdx, qIdx)}
                              title="Remove question"
                              style={{
                                width: 24,
                                height: 24,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#E0E2E8",
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                              className="hover:text-[#791F1F] transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {!isAssigned && (
                      <button
                        onClick={() => addQuestionToCategory(catIdx)}
                        className="w-full flex items-center justify-center gap-2 transition-colors"
                        style={{
                          padding: "8px",
                          border: "0.5px dashed #E0E2E8",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "#9EA3B0",
                          background: "#FFFFFF",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.borderColor = "#1A56DB";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "#1A56DB";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.borderColor = "#E0E2E8";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "#9EA3B0";
                        }}
                      >
                        <Plus size={12} /> Add Question to{" "}
                        {cat.name || "Section"}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!isAssigned && (
                <button
                  onClick={addNewCategory}
                  className="w-full flex flex-col items-center justify-center gap-2 transition-colors group"
                  style={{
                    padding: "24px",
                    border: "0.5px dashed #E0E2E8",
                    borderRadius: 12,
                    background: "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "#F5F6F8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    className="group-hover:bg-[#EEF3FD] transition-colors"
                  >
                    <Plus
                      size={18}
                      style={{ color: "#9EA3B0" }}
                      className="group-hover:text-[#1A56DB] transition-colors"
                    />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#5A6070",
                      }}
                    >
                      Create New Assessment Category
                    </p>
                    <p style={{ fontSize: 11, color: "#9EA3B0", marginTop: 2 }}>
                      Group indicators by competency area
                    </p>
                  </div>
                </button>
              )}

              {/* Library banner */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "0.5px solid #E4E6EC",
                  borderRadius: 12,
                  padding: "18px 20px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 3,
                    height: "100%",
                    background: "#1A56DB",
                  }}
                />
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{ paddingLeft: 12 }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#111827",
                        marginBottom: 4,
                      }}
                    >
                      Need to expedite template creation?
                    </p>
                    <p style={{ fontSize: 12, color: "#9EA3B0" }}>
                      Browse pre-configured industry-standard appraisal forms.
                    </p>
                  </div>
                  {!isAssigned && (
                    <button
                      onClick={() => setShowLibrary(true)}
                      style={{
                        background: "#F5F6F8",
                        color: "#5A6070",
                        border: "0.5px solid #E0E2E8",
                        borderRadius: 8,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                      className="hover:bg-[#EEF3FD] hover:text-[#1A56DB] transition-colors self-start sm:self-auto"
                    >
                      Explore Library
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Library modal */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(17,24,39,0.5)" }}
        >
          <div
            onClick={() => setShowLibrary(false)}
            className="absolute inset-0"
          />
          <div
            style={{
              position: "relative",
              background: "#FFFFFF",
              border: "0.5px solid #E4E6EC",
              borderRadius: 12,
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "0.5px solid #E4E6EC",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#111827",
                  marginBottom: 2,
                }}
              >
                Explore Appraisal Templates
              </p>
              <p style={{ fontSize: 12, color: "#9EA3B0" }}>
                Choose a pre-configured template to jumpstart your design.
              </p>
            </div>
            <div
              style={{ padding: "12px 18px", overflowY: "auto", flex: 1 }}
              className="space-y-2"
            >
              {formsLoading && (
                <p
                  style={{
                    textAlign: "center",
                    fontSize: 13,
                    color: "#9EA3B0",
                    padding: "24px 0",
                  }}
                >
                  Loading templates…
                </p>
              )}
              {!formsLoading && libraryForms.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <FileText
                    size={24}
                    style={{ color: "#E0E2E8", margin: "0 auto 10px" }}
                  />
                  <p style={{ fontSize: 13, color: "#9EA3B0" }}>
                    No {formType.replace("_", " ").toLowerCase()} templates
                    found.
                  </p>
                </div>
              )}
              {libraryForms.map((tpl) => (
                <div
                  key={tpl.formId}
                  onClick={() => applySystemTemplate(tpl.formId)}
                  className="flex items-center justify-between transition-colors cursor-pointer"
                  style={{
                    padding: "12px 14px",
                    border: "0.5px solid #E4E6EC",
                    borderRadius: 8,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "#F5F6F8";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "#FFFFFF";
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "#EEF3FD",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Layers size={16} style={{ color: "#1A56DB" }} />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#111827",
                        }}
                      >
                        {tpl.formName}
                      </p>
                      <p style={{ fontSize: 11, color: "#9EA3B0" }}>
                        {tpl.cycleName || "Template Library"} &bull; Click to
                        apply
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    style={{ color: "#9EA3B0", flexShrink: 0 }}
                  />
                </div>
              ))}
            </div>
            <div
              className="flex justify-end"
              style={{ padding: "12px 18px", borderTop: "0.5px solid #E4E6EC" }}
            >
              <button
                onClick={() => setShowLibrary(false)}
                style={{
                  background: "#F5F6F8",
                  color: "#5A6070",
                  border: "0.5px solid #E0E2E8",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Icon anchor to prevent unused import warnings */}
      <div style={{ display: "none" }}>
        <CheckCircle2 />
      </div>
    </div>
  );
};

export default AppraisalFormDesign;
