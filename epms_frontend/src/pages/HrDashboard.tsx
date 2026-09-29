import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Users, UserCheck, UserX, UserPlus, UploadCloud, Download,
  Award, Search, ExternalLink, ShieldCheck, CheckSquare,
  BarChart3, X, GraduationCap, Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';

// ----------------------------------------------------
// SIMPLE DATA TYPES
// ----------------------------------------------------

export interface Intern {
  id: string;
  name: string;
  email: string;
  code?: string;
  cohort: string;
  batch: string;
  subBatch: string;
  section: string;
  subSection: string;
  mentor: string;
  evaluator: string;
  score: number;
  classification: 'Achieved' | 'Progressing' | 'Focus Required';
  status: 'ACTIVE' | 'DEACTIVATED';
  published: boolean;
  joiningDate: string;
}

export interface Mentor {
  id: string;
  name: string;
  email: string;
  department: string;
  specialization: string;
  menteeCount: number;
  maxCapacity: number;
}

export interface Cohort {
  id: string;
  name: string;
  period: string;
  cycleName: string;
  count: number;
}

export interface EvaluationCycle {
  id: string;
  name: string;
  quarter: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'PUBLISHED' | 'DRAFT';
}

export interface Goal {
  id: string;
  internName: string;
  title: string;
  category: string;
  section: string;
  dueDate: string;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface Evidence {
  id: string;
  internName: string;
  title: string;
  goalTitle: string;
  link: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES';
  note?: string;
}

export interface Feedback {
  id: string;
  fromName: string;
  fromRole: string;
  toName: string;
  type: 'PRAISE' | 'SUGGESTION';
  message: string;
  date: string;
}

export interface Question {
  id: string;
  section: string;
  question: string;
  type: string;
  weight: number;
}

export interface AuditItem {
  id: string;
  time: string;
  user: string;
  action: string;
  details: string;
}

// ----------------------------------------------------
// DEFAULT SEED DATA (Clean & Simple to Explain)
// ----------------------------------------------------

const INITIAL_INTERNS: Intern[] = [
  {
    id: 'emp-1',
    name: 'Alex Chen',
    email: 'alex.chen@college.edu',
    code: 'INT-101',
    cohort: 'MIRAI Cohort 1',
    batch: 'Batch A',
    subBatch: 'A1',
    section: 'Engineering',
    subSection: 'Backend',
    mentor: 'Marcus Vance',
    evaluator: 'Marcus Vance',
    score: 92.8,
    classification: 'Achieved',
    status: 'ACTIVE',
    published: true,
    joiningDate: '2026-09-26'
  },
  {
    id: 'emp-2',
    name: 'Jordan Rivera',
    email: 'jordan.rivera@college.edu',
    code: 'INT-102',
    cohort: 'MIRAI Cohort 1',
    batch: 'Batch A',
    subBatch: 'A2',
    section: 'Engineering',
    subSection: 'Frontend',
    mentor: 'Elena Rostova',
    evaluator: 'Elena Rostova',
    score: 87.5,
    classification: 'Achieved',
    status: 'ACTIVE',
    published: false,
    joiningDate: '2026-09-26'
  },
  {
    id: 'emp-3',
    name: 'Taylor Kim',
    email: 'taylor.kim@college.edu',
    code: 'INT-103',
    cohort: 'MIRAI Cohort 1',
    batch: 'Batch B',
    subBatch: 'B1',
    section: 'Product & Design',
    subSection: 'UI/UX',
    mentor: 'Sarah Jenkins',
    evaluator: 'Sarah Jenkins',
    score: 78.4,
    classification: 'Progressing',
    status: 'ACTIVE',
    published: false,
    joiningDate: '2026-09-26'
  },
  {
    id: 'emp-4',
    name: 'Samira Patel',
    email: 'samira.patel@college.edu',
    code: 'INT-104',
    cohort: 'MIRAI Cohort 1',
    batch: 'Batch B',
    subBatch: 'B2',
    section: 'Engineering',
    subSection: 'Cloud/DevOps',
    mentor: 'David Kim',
    evaluator: 'David Kim',
    score: 64.0,
    classification: 'Focus Required',
    status: 'ACTIVE',
    published: false,
    joiningDate: '2026-09-26'
  },
  {
    id: 'emp-5',
    name: 'Liam O’Connor',
    email: 'liam.oconnor@college.edu',
    code: 'INT-105',
    cohort: 'MIRAI Cohort 1',
    batch: 'Batch C',
    subBatch: 'C1',
    section: 'QA & Testing',
    subSection: 'Automation',
    mentor: 'Marcus Vance',
    evaluator: 'Marcus Vance',
    score: 81.2,
    classification: 'Progressing',
    status: 'ACTIVE',
    published: false,
    joiningDate: '2026-09-26'
  },
  {
    id: 'emp-6',
    name: 'Chloe Dubois',
    email: 'chloe.dubois@college.edu',
    code: 'INT-106',
    cohort: 'MIRAI Cohort 1',
    batch: 'Batch D',
    subBatch: 'D1',
    section: 'Operations',
    subSection: 'Project Ops',
    mentor: 'Priya Patel',
    evaluator: 'Priya Patel',
    score: 68.5,
    classification: 'Focus Required',
    status: 'DEACTIVATED',
    published: false,
    joiningDate: '2026-09-26'
  }
];

const INITIAL_MENTORS: Mentor[] = [
  { id: 'm-1', name: 'Marcus Vance', email: 'marcus@college.edu', department: 'Engineering', specialization: 'Backend & APIs', menteeCount: 2, maxCapacity: 4 },
  { id: 'm-2', name: 'Elena Rostova', email: 'elena@college.edu', department: 'Engineering', specialization: 'React & Frontend', menteeCount: 1, maxCapacity: 3 },
  { id: 'm-3', name: 'Sarah Jenkins', email: 'sarah@college.edu', department: 'Product & Design', specialization: 'UI/UX & Figma', menteeCount: 1, maxCapacity: 3 },
  { id: 'm-4', name: 'David Kim', email: 'david@college.edu', department: 'Engineering', specialization: 'Cloud & Docker', menteeCount: 1, maxCapacity: 3 },
  { id: 'm-5', name: 'Priya Patel', email: 'priya@college.edu', department: 'Operations', specialization: 'Agile & Management', menteeCount: 1, maxCapacity: 4 }
];

const INITIAL_COHORTS: Cohort[] = [
  { id: 'c-1', name: 'MIRAI Cohort 1', period: 'Sep 26 – Dec 26', cycleName: 'MIRAI Cohort 1 Evaluation', count: 6 }
];

const INITIAL_CYCLES: EvaluationCycle[] = [
  { id: 'cy-1', name: 'MIRAI Cohort 1', quarter: 'Sep 26 – Dec 26', startDate: '2026-09-26', endDate: '2026-12-26', status: 'ACTIVE' }
];

const INITIAL_GOALS: Goal[] = [
  { id: 'g-1', internName: 'Alex Chen', title: 'Build User Login & JWT Authentication', category: 'Technical Goal', section: 'Engineering', dueDate: '2026-02-15', progress: 95, status: 'Completed' },
  { id: 'g-2', internName: 'Alex Chen', title: 'Write Automated Test Suite', category: 'Quality Goal', section: 'Engineering', dueDate: '2026-02-28', progress: 85, status: 'In Progress' },
  { id: 'g-3', internName: 'Jordan Rivera', title: 'Design Interactive Dashboard UI', category: 'Design Goal', section: 'Engineering', dueDate: '2026-02-20', progress: 90, status: 'In Progress' },
  { id: 'g-4', internName: 'Taylor Kim', title: 'Create Wireframes in Figma', category: 'Design Goal', section: 'Product & Design', dueDate: '2026-03-01', progress: 75, status: 'In Progress' },
  { id: 'g-5', internName: 'Samira Patel', title: 'Setup Docker Container Pipeline', category: 'DevOps Goal', section: 'Engineering', dueDate: '2026-02-10', progress: 60, status: 'In Progress' }
];

const INITIAL_EVIDENCE: Evidence[] = [
  { id: 'ev-1', internName: 'Alex Chen', goalTitle: 'Build User Login & JWT Authentication', title: 'GitHub PR #42 - Authentication Code', link: 'https://github.com/example/auth-pr', type: 'GitHub PR', status: 'APPROVED', note: 'Clean code and good test coverage!' },
  { id: 'ev-2', internName: 'Jordan Rivera', goalTitle: 'Design Interactive Dashboard UI', title: 'Figma UI Prototype Screens', link: 'https://figma.com/file/dashboard-ui', type: 'Figma Link', status: 'PENDING' },
  { id: 'ev-3', internName: 'Samira Patel', goalTitle: 'Setup Docker Container Pipeline', title: 'Docker Compose Architecture Document', link: 'https://docs.example.com/docker-setup', type: 'Document', status: 'NEEDS_CHANGES', note: 'Please add instructions for Windows users.' }
];

const INITIAL_FEEDBACK: Feedback[] = [
  { id: 'fb-1', fromName: 'Marcus Vance', fromRole: 'Mentor', toName: 'Alex Chen', type: 'PRAISE', message: 'Alex did a fantastic job understanding Django database queries quickly.', date: '2026-02-16' },
  { id: 'fb-2', fromName: 'Sarah Jenkins', fromRole: 'HR Admin', toName: 'Samira Patel', type: 'SUGGESTION', message: 'Keep asking questions during mentor syncs, you are making good steady progress.', date: '2026-02-18' }
];

const INITIAL_QUESTIONS: Question[] = [
  // Technical Capability (60%)
  { id: 'q-1', section: 'Technical Capability (60%)', question: 'Technical Proficiency: Knowledge, application of concepts, tools, and technologies', type: 'Rating (1 to 5)', weight: 20 },
  { id: 'q-2', section: 'Technical Capability (60%)', question: 'Problem Solving: Problem understanding, analysis, solution development, and judgement', type: 'Rating (1 to 5)', weight: 20 },
  { id: 'q-3', section: 'Technical Capability (60%)', question: 'Quality & Execution: Accuracy, completeness, reliability, and delivery', type: 'Rating (1 to 5)', weight: 20 },
  // Behavioral Capability (40%)
  { id: 'q-4', section: 'Behavioral Capability (40%)', question: 'Learning Agility: Learning speed, feedback application, and adaptability', type: 'Rating (1 to 5)', weight: 8 },
  { id: 'q-5', section: 'Behavioral Capability (40%)', question: 'Ownership & Accountability: Responsibility, commitment, follow-through, and proactive action', type: 'Rating (1 to 5)', weight: 8 },
  { id: 'q-6', section: 'Behavioral Capability (40%)', question: 'Professionalism & Discipline: Reliability, preparedness, responsiveness, and workplace conduct', type: 'Rating (1 to 5)', weight: 8 },
  { id: 'q-7', section: 'Behavioral Capability (40%)', question: 'Communication & Collaboration: Clarity, listening, teamwork, and stakeholder interaction', type: 'Rating (1 to 5)', weight: 8 },
  { id: 'q-8', section: 'Behavioral Capability (40%)', question: 'Adaptability & Maturity: Handling ambiguity, changing priorities, and professional judgement', type: 'Rating (1 to 5)', weight: 8 }
];

const INITIAL_AUDIT: AuditItem[] = [
  { id: 'aud-1', time: '2026-02-20 18:30', user: 'HR Admin', action: 'Publish Results', details: 'Published evaluation score for Alex Chen (92.8%)' },
  { id: 'aud-2', time: '2026-02-19 11:20', user: 'HR Admin', action: 'Assign Mentor', details: 'Assigned Marcus Vance as mentor to Liam O’Connor' },
  { id: 'aud-3', time: '2026-02-18 16:45', user: 'HR Admin', action: 'Launch MIRAI Batch', details: 'Launched MIRAI Q1 2026 Evaluation' },
  { id: 'aud-4', time: '2026-02-15 09:12', user: 'HR Admin', action: 'Deactivate Account', details: 'Deactivated intern Chloe Dubois' }
];

const COHORTS = ['MIRAI Cohort 1', 'MIRAI Cohort 2'];
const BATCHES = ['Batch A', 'Batch B', 'Batch C', 'Batch D'];
const SUB_BATCH_MAP: Record<string, string[]> = {
  'Batch A': ['A1', 'A2'],
  'Batch B': ['B1', 'B2'],
  'Batch C': ['C1', 'C2'],
  'Batch D': ['D1', 'D2']
};
const ALL_SUB_BATCHES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'];
const SECTIONS = ['Engineering', 'Product & Design', 'QA & Testing', 'Operations'];

// ----------------------------------------------------
// MAIN SIMPLIFIED COLLEGE DASHBOARD
// ----------------------------------------------------

const HrDashboard: React.FC = () => {
  const { user } = useAuth();
  const hrName =
    (user?.staffName && !["administrator", "admin", "superadmin"].includes(user.staffName.toLowerCase()))
      ? user.staffName
      : (user as any)?.profile?.full_name ||
        (user as any)?.firstName ||
        (user as any)?.first_name ||
        (user as any)?.name ||
        ((user as any)?.username && !["admin", "superadmin"].includes((user as any).username.toLowerCase()) ? (user as any).username : null) ||
        "Sarah Jenkins";

  // 4 Clear Main Tabs (College Project Structure)
  const [activeTab, setActiveTab] = useState<'interns' | 'goals' | 'grading' | 'reports'>('interns');

  // State
  const [interns, setInterns] = useState<Intern[]>(INITIAL_INTERNS);
  const [mentors, setMentors] = useState<Mentor[]>(INITIAL_MENTORS);
  const [cohorts, setCohorts] = useState<Cohort[]>(INITIAL_COHORTS);
  const [cycles, setCycles] = useState<EvaluationCycle[]>(INITIAL_CYCLES);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>(INITIAL_EVIDENCE);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>(INITIAL_FEEDBACK);
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>(INITIAL_AUDIT);

  // Capability Weights (Technical 60% + Behavioral 40% = 100%)
  const [techCapabilityWeight, setTechCapabilityWeight] = useState(60);
  const [behavioralCapabilityWeight, setBehavioralCapabilityWeight] = useState(40);

  // Feature 15: Visibility
  const [internCanSeeScoreBeforePublish, setInternCanSeeScoreBeforePublish] = useState(false);

  // Feature 18: Selection for Publishing
  const [selectedForPublish, setSelectedForPublish] = useState<string[]>([]);

  // Feature 22: Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedSubBatch, setSelectedSubBatch] = useState('ALL');
  const [selectedMentor, setSelectedMentor] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');

  // Modals
  const [showAddInternModal, setShowAddInternModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showAddMentorModal, setShowAddMentorModal] = useState(false);
  const [showAddCohortModal, setShowAddCohortModal] = useState(false);
  const [showAddCycleModal, setShowAddCycleModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [gradingIntern, setGradingIntern] = useState<Intern | null>(null);
  const [historyIntern, setHistoryIntern] = useState<Intern | null>(null);
  const [internToDelete, setInternToDelete] = useState<Intern | null>(null);
  const [mentorToDelete, setMentorToDelete] = useState<Mentor | null>(null);

  // Form states
  const [newInternName, setNewInternName] = useState('');
  const [newInternEmail, setNewInternEmail] = useState('');
  const [newInternCohort, setNewInternCohort] = useState('MIRAI Cohort 1');
  const [newInternBatch, setNewInternBatch] = useState('Batch A');
  const [newInternSubBatch, setNewInternSubBatch] = useState('A1');
  const [newInternMentor, setNewInternMentor] = useState('Marcus Vance');

  const [newMentorName, setNewMentorName] = useState('');
  const [newMentorEmail, setNewMentorEmail] = useState('');
  const [newMentorDept, setNewMentorDept] = useState('Engineering');
  const [newMentorSpec, setNewMentorSpec] = useState('');

  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortPeriod, setNewCohortPeriod] = useState('');

  const [newCycleName, setNewCycleName] = useState('');
  const [newCycleQuarter, setNewCycleQuarter] = useState('Q2 2026');

  const [newGoalIntern, setNewGoalIntern] = useState('Alex Chen');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Technical Goal');

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionSection, setNewQuestionSection] = useState('Technical Capability (60%)');

  const [newFeedbackTo, setNewFeedbackTo] = useState('Alex Chen');
  const [newFeedbackMsg, setNewFeedbackMsg] = useState('');
  const [newFeedbackType, setNewFeedbackType] = useState<'PRAISE' | 'SUGGESTION'>('PRAISE');

  // The 8 Core Competencies Grading State (Image 2)
  // Technical Capability (60%)
  const [gradeTechProficiency, setGradeTechProficiency] = useState(4.5);
  const [gradeProblemSolving, setGradeProblemSolving] = useState(4.0);
  const [gradeQualityExecution, setGradeQualityExecution] = useState(4.5);

  // Behavioral Capability (40%)
  const [gradeLearningAgility, setGradeLearningAgility] = useState(4.0);
  const [gradeOwnership, setGradeOwnership] = useState(4.0);
  const [gradeProfessionalism, setGradeProfessionalism] = useState(4.5);
  const [gradeCommunication, setGradeCommunication] = useState(4.0);
  const [gradeAdaptability, setGradeAdaptability] = useState(4.0);

  // Backend Sync on mount
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/appraisals/', {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
      .then(res => res.json())
      .then(json => {
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setInterns(prev => {
            const updated = [...prev];
            json.data.forEach((app: any) => {
              const idx = updated.findIndex(i => i.name.toLowerCase() === (app.employeeName || '').toLowerCase());
              if (idx >= 0) {
                updated[idx].score = app.overallScore || updated[idx].score;
                updated[idx].published = app.status === 'PUBLISHED';
                updated[idx].classification = (app.overallScore >= 85 ? 'Achieved' : app.overallScore >= 70 ? 'Progressing' : 'Focus Required') as any;
              }
            });
            return updated;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Simple Helper to record audit log
  const addAudit = (action: string, details: string) => {
    const newItem: AuditItem = {
      id: `aud-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: 'HR Admin',
      action,
      details
    };
    setAuditLogs(prev => [newItem, ...prev]);
  };

  // ----------------------------------------------------
  // FILTERING LOGIC (Feature 22)
  // ----------------------------------------------------
  const filteredInterns = useMemo(() => {
    return interns.filter(intern => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!intern.name.toLowerCase().includes(q) && !intern.email.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedCohort !== 'ALL' && intern.cohort !== selectedCohort) return false;
      if (selectedBatch !== 'ALL' && intern.batch !== selectedBatch) return false;
      if (selectedSubBatch !== 'ALL' && intern.subBatch !== selectedSubBatch) return false;
      if (selectedMentor !== 'ALL' && intern.mentor !== selectedMentor) return false;
      if (selectedClass !== 'ALL' && intern.classification !== selectedClass) return false;
      return true;
    });
  }, [interns, searchQuery, selectedCohort, selectedBatch, selectedSubBatch, selectedMentor, selectedClass]);

  // Summary Metrics
  const totalCount = interns.length;
  const activeCount = interns.filter(i => i.status === 'ACTIVE').length;
  const achievedCount = interns.filter(i => i.classification === 'Achieved').length;
  const progressingCount = interns.filter(i => i.classification === 'Progressing').length;
  const focusCount = interns.filter(i => i.classification === 'Focus Required').length;
  const publishedCount = interns.filter(i => i.published).length;

  // ----------------------------------------------------
  // ACTION HANDLERS (24 Features)
  // ----------------------------------------------------

  // 1. Add Intern
  const handleAddIntern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternName) return;
    const newI: Intern = {
      id: `emp-${Date.now()}`,
      name: newInternName,
      email: newInternEmail || `${newInternName.toLowerCase().replace(/\s+/g, '')}@college.edu`,
      cohort: newInternCohort,
      batch: newInternBatch,
      subBatch: newInternSubBatch,
      section: 'MIRAI',
      subSection: 'Core',
      mentor: newInternMentor,
      evaluator: newInternMentor,
      score: 75.0,
      classification: 'Progressing',
      status: 'ACTIVE',
      published: false,
      joiningDate: '2026-09-26'
    };
    setInterns(prev => [newI, ...prev]);
    addAudit('Add Intern', `Added ${newI.name} - ${newI.cohort}, ${newI.batch} (${newI.subBatch}) with mentor ${newI.mentor}`);
    toast.success(`Intern "${newI.name}" added to ${newI.batch} (${newI.subBatch})!`);
    setShowAddInternModal(false);
    setNewInternName('');
    setNewInternEmail('');
    setNewInternBatch('Batch A');
    setNewInternSubBatch('A1');
  };

  // 2. Activate / Deactivate Toggle
  const handleToggleStatus = (intern: Intern) => {
    const nextStatus = intern.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    setInterns(prev => prev.map(i => i.id === intern.id ? { ...i, status: nextStatus } : i));
    addAudit('Status Change', `Changed ${intern.name} to ${nextStatus}`);
    toast.info(`${intern.name} is now ${nextStatus.toLowerCase()}`);
  };

  // Delete / Remove Intern Permanently
  const handleConfirmDelete = (intern: Intern) => {
    setInterns(prev => prev.filter(i => i.id !== intern.id));
    setGoals(prev => prev.filter(g => g.internName !== intern.name));
    setEvidenceList(prev => prev.filter(e => e.internName !== intern.name));
    addAudit('Remove Intern', `Permanently deleted intern ${intern.name}`);
    toast.success(`Intern "${intern.name}" has been removed.`);
    setInternToDelete(null);

    fetch(`http://127.0.0.1:8000/api/emp/${intern.id}/`, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    }).catch(() => {});
  };

  // Delete / Remove Mentor
  const handleConfirmDeleteMentor = (mentor: Mentor) => {
    setMentors(prev => prev.filter(m => m.id !== mentor.id));
    setInterns(prev => prev.map(i => i.mentor === mentor.name ? { ...i, mentor: 'Unassigned', evaluator: 'Unassigned' } : i));
    addAudit('Remove Mentor', `Removed mentor ${mentor.name} (${mentor.department})`);
    toast.success(`Mentor "${mentor.name}" has been removed.`);
    setMentorToDelete(null);
  };

  // 3. Bulk CSV Import
  const handleSampleCsv = () => {
    const csv = "data:text/csv;charset=utf-8,Name,Email,Cohort,Batch,SubBatch,Mentor\n" +
      "Devon Miller,devon@college.edu,MIRAI Cohort 1,Batch A,A1,Marcus Vance\n" +
      "Maya Lin,maya@college.edu,MIRAI Cohort 1,Batch B,B1,Sarah Jenkins\n";
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "sample_mirai_interns.csv";
    link.click();
    toast.success("Sample CSV template downloaded!");
  };

  const handleCsvImport = () => {
    const demoCsvInterns: Intern[] = [
      { id: `csv-1`, name: 'Devon Miller', email: 'devon@college.edu', code: 'INT-110', cohort: 'MIRAI Cohort 1', batch: 'Batch A', subBatch: 'A1', section: 'Engineering', subSection: 'Backend', mentor: 'Marcus Vance', evaluator: 'Marcus Vance', score: 80.0, classification: 'Progressing', status: 'ACTIVE', published: false, joiningDate: '2026-09-26' },
      { id: `csv-2`, name: 'Maya Lin', email: 'maya@college.edu', code: 'INT-111', cohort: 'MIRAI Cohort 1', batch: 'Batch B', subBatch: 'B1', section: 'Product & Design', subSection: 'UI/UX', mentor: 'Sarah Jenkins', evaluator: 'Sarah Jenkins', score: 88.0, classification: 'Achieved', status: 'ACTIVE', published: false, joiningDate: '2026-09-26' }
    ];
    setInterns(prev => [...demoCsvInterns, ...prev]);
    addAudit('CSV Import', 'Imported 2 MIRAI interns (Batch A/A1 & Batch B/B1) via CSV');
    toast.success("Imported 2 MIRAI interns with Batch & Sub-Batch from CSV!");
    setShowCsvModal(false);
  };

  // 4. Add Mentor
  const handleAddMentor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMentorName) return;
    const newM: Mentor = {
      id: `m-${Date.now()}`,
      name: newMentorName,
      email: newMentorEmail || `${newMentorName.toLowerCase().replace(/\s+/g, '')}@college.edu`,
      department: newMentorDept,
      specialization: newMentorSpec || 'General Mentorship',
      menteeCount: 0,
      maxCapacity: 4
    };
    setMentors(prev => [...prev, newM]);
    addAudit('Add Mentor', `Added mentor ${newM.name} (${newM.department})`);
    toast.success(`Mentor "${newM.name}" added!`);
    setShowAddMentorModal(false);
    setNewMentorName('');
    setNewMentorEmail('');
    setNewMentorSpec('');
  };

  // 5. Assign Mentor Inline
  const handleAssignMentor = (internId: string, mentorName: string) => {
    setInterns(prev => prev.map(i => i.id === internId ? { ...i, mentor: mentorName, evaluator: mentorName } : i));
    const target = interns.find(i => i.id === internId);
    addAudit('Assign Mentor', `Assigned ${mentorName} to ${target?.name}`);
    toast.success(`Assigned ${mentorName} as mentor!`);
  };

  // 6. Create Cohort / Batch
  const handleCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName) return;
    const newC: Cohort = {
      id: `c-${Date.now()}`,
      name: newCohortName,
      period: newCohortPeriod || 'Apr - Jul 2026',
      cycleName: 'MIRAI Q2 Evaluation',
      count: 0
    };
    setCohorts(prev => [...prev, newC]);
    addAudit('Create Batch', `Created ${newC.name}`);
    toast.success(`MIRAI Batch "${newC.name}" created!`);
    setShowAddCohortModal(false);
    setNewCohortName('');
    setNewCohortPeriod('');
  };

  // 7. Create Evaluation Quarter / Batch
  const handleCreateCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleName) return;
    const newCy: EvaluationCycle = {
      id: `cy-${Date.now()}`,
      name: newCycleName,
      quarter: newCycleQuarter,
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      status: 'ACTIVE'
    };
    setCycles(prev => [newCy, ...prev]);
    addAudit('Launch Term', `Launched ${newCy.name}`);
    toast.success(`MIRAI Evaluation Term "${newCy.name}" launched!`);
    setShowAddCycleModal(false);
    setNewCycleName('');
  };

  // 8. Assign Goal
  const handleAssignGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle) return;
    const newG: Goal = {
      id: `g-${Date.now()}`,
      internName: newGoalIntern,
      title: newGoalTitle,
      category: newGoalCategory,
      section: 'Engineering',
      dueDate: '2026-03-31',
      progress: 0,
      status: 'Not Started'
    };
    setGoals(prev => [newG, ...prev]);
    addAudit('Assign Goal', `Assigned "${newG.title}" to ${newG.internName}`);
    toast.success(`Goal assigned to ${newG.internName}!`);
    setShowAddGoalModal(false);
    setNewGoalTitle('');
  };

  // 10. Track Goal Progress (+10% / Complete)
  const handleProgressBump = (goalId: string, amount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const next = Math.min(100, g.progress + amount);
        return {
          ...g,
          progress: next,
          status: next === 100 ? 'Completed' : 'In Progress'
        };
      }
      return g;
    }));
    toast.info("Goal progress updated!");
  };

  // 12. Create Question
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText) return;
    const newQ: Question = {
      id: `q-${Date.now()}`,
      section: newQuestionSection,
      question: newQuestionText,
      type: 'Rating (1 to 5)',
      weight: 25
    };
    setQuestions(prev => [...prev, newQ]);
    addAudit('Add Question', `Added rubric question to ${newQ.section}`);
    toast.success("Question added to rubric!");
    setShowAddQuestionModal(false);
    setNewQuestionText('');
  };

  // 13. Save Capability Weights (60% Tech / 40% Behavioral)
  const handleSaveWeights = () => {
    const total = techCapabilityWeight + behavioralCapabilityWeight;
    if (total !== 100) {
      toast.error(`Weights must total 100%! Current sum: ${total}%`);
      return;
    }
    addAudit('Update Weights', `Competency Weights set: Technical ${techCapabilityWeight}%, Behavioral ${behavioralCapabilityWeight}%`);
    toast.success("Competency evaluation weights saved (100%)!");
  };

  // 16 & 17. Grade Intern & Classify on The 8 Core Competencies
  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingIntern) return;

    // Technical Capability (60%): 3 competencies
    const techAvg = (gradeTechProficiency + gradeProblemSolving + gradeQualityExecution) / 3;
    const techScore = (techAvg / 5) * techCapabilityWeight;

    // Behavioral Capability (40%): 5 competencies
    const behAvg = (gradeLearningAgility + gradeOwnership + gradeProfessionalism + gradeCommunication + gradeAdaptability) / 5;
    const behScore = (behAvg / 5) * behavioralCapabilityWeight;

    const finalScore = parseFloat((techScore + behScore).toFixed(1));

    // Feature 17: Automatic Classification Rule
    const classification: Intern['classification'] =
      finalScore >= 85 ? 'Achieved' : finalScore >= 70 ? 'Progressing' : 'Focus Required';

    setInterns(prev => prev.map(i => {
      if (i.id === gradingIntern.id) {
        return { ...i, score: finalScore, classification };
      }
      return i;
    }));

    addAudit('Graded Intern', `Graded ${gradingIntern.name}: ${finalScore}% (${classification}) [Tech: ${techScore.toFixed(1)}/60, Beh: ${behScore.toFixed(1)}/40]`);
    toast.success(`${gradingIntern.name} graded as "${classification}" (${finalScore}%)!`);
    setGradingIntern(null);
  };

  // 18. Review & Publish Selected
  const handleSelectAllPending = () => {
    const pending = interns.filter(i => !i.published).map(i => i.id);
    setSelectedForPublish(pending);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedForPublish(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePublishSelected = () => {
    if (selectedForPublish.length === 0) {
      toast.warning("Please select at least one intern to publish.");
      return;
    }
    setInterns(prev => prev.map(i => selectedForPublish.includes(i.id) ? { ...i, published: true } : i));
    addAudit('Publish Results', `Published results for ${selectedForPublish.length} interns`);
    toast.success(`Published results for ${selectedForPublish.length} interns!`);
    setSelectedForPublish([]);
  };

  const handleTogglePublishOne = (intern: Intern) => {
    const nextPub = !intern.published;
    setInterns(prev => prev.map(i => i.id === intern.id ? { ...i, published: nextPub } : i));
    addAudit(nextPub ? 'Publish Result' : 'Unpublish Result', `Toggled result for ${intern.name}`);
    toast.success(`${intern.name} result is now ${nextPub ? 'Published' : 'Draft'}`);
  };

  // 19. Evidence Approval
  const handleEvidenceAction = (id: string, status: Evidence['status']) => {
    setEvidenceList(prev => prev.map(ev => ev.id === id ? { ...ev, status } : ev));
    toast.info(`Evidence status: ${status}`);
  };

  // 20. Feedback
  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedbackMsg) return;
    const newFb: Feedback = {
      id: `fb-${Date.now()}`,
      fromName: 'Sarah HR',
      fromRole: 'HR Admin',
      toName: newFeedbackTo,
      type: newFeedbackType,
      message: newFeedbackMsg,
      date: 'Today'
    };
    setFeedbackList(prev => [newFb, ...prev]);
    toast.success(`Feedback sent to ${newFb.toName}!`);
    setShowFeedbackModal(false);
    setNewFeedbackMsg('');
  };

  // 21. Export CSV
  const handleExportCsv = () => {
    const headers = ['Name', 'Cohort', 'Batch', 'Sub-Batch', 'Mentor', 'Score', 'Classification', 'Status', 'Published'];
    const rows = interns.map(i => [
      `"${i.name}"`, `"${i.cohort}"`, `"${i.batch}"`, `"${i.subBatch}"`, `"${i.mentor}"`, i.score, i.classification, i.status, i.published ? 'Published' : 'Draft'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `mirai_cohort1_interns_report.csv`;
    link.click();
    toast.success("Downloaded MIRAI Interns PMS Report CSV!");
  };

  // Simple Chart Data
  const chartData = [
    { name: 'Achieved (85%+)', count: achievedCount, fill: '#10B981' },
    { name: 'Progressing (70-84%)', count: progressingCount, fill: '#3B82F6' },
    { name: 'Focus Req. (<70%)', count: focusCount, fill: '#EF4444' }
  ];

  return (
    <div className="space-y-6 pb-20 text-slate-800 max-w-7xl mx-auto px-2">
      
      {/* ----------------------------------------------------
          PROJECT HEADER & COLLEGE PRESENTATION BANNER
      ---------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <GraduationCap size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Hi, {hrName} 👋
                </span>
                <span className="text-xs text-slate-400">• MIRAI Cohort 1</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                MIRAI Interns PMS — HR & Mentor Administration
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage MIRAI student interns, mentors, evaluation quarters, rubrics, and result publishing.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Demo Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            <UploadCloud size={14} />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={() => setShowAddInternModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-xs"
          >
            <UserPlus size={14} />
            <span>+ Add Intern</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------
          5 SUMMARY CARDS (Easy to Explain at a Glance)
      ---------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Interns</div>
          <div className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{activeCount} Active • {publishedCount} Published</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Mentors</div>
          <div className="text-2xl font-bold text-slate-900 mt-0.5">{mentors.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{cohorts.length} Active Batches</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase">🌟 Achieved</div>
          <div className="text-2xl font-bold text-emerald-600 mt-0.5">{achievedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Score ≥ 85%</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase">📈 Progressing</div>
          <div className="text-2xl font-bold text-blue-600 mt-0.5">{progressingCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Score 70% – 84%</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-600 uppercase">⚠️ Focus Needed</div>
          <div className="text-2xl font-bold text-rose-600 mt-0.5">{focusCount}</div>
          <div className="text-[11px] text-rose-500 mt-0.5">Score &lt; 70% (PIP)</div>
        </div>
      </div>

      {/* ----------------------------------------------------
          FEATURE 22: SIMPLE SEARCH & FILTER BAR
      ---------------------------------------------------- */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by intern name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <select
          value={selectedCohort}
          onChange={(e) => setSelectedCohort(e.target.value)}
          className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
        >
          <option value="ALL">All Cohorts</option>
          {COHORTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={selectedBatch}
          onChange={(e) => {
            const b = e.target.value;
            setSelectedBatch(b);
            if (b !== 'ALL' && selectedSubBatch !== 'ALL') {
              const valid = SUB_BATCH_MAP[b] || [];
              if (!valid.includes(selectedSubBatch)) {
                setSelectedSubBatch('ALL');
              }
            }
          }}
          className="text-xs py-1.5 px-3 bg-purple-50/60 border border-purple-200 rounded-xl font-medium text-purple-900"
        >
          <option value="ALL">All Batches (A-D)</option>
          {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select
          value={selectedSubBatch}
          onChange={(e) => setSelectedSubBatch(e.target.value)}
          className="text-xs py-1.5 px-3 bg-teal-50/60 border border-teal-200 rounded-xl font-medium text-teal-900"
        >
          <option value="ALL">All Sub-Batches (A1-D1)</option>
          {(selectedBatch !== 'ALL' ? (SUB_BATCH_MAP[selectedBatch] || ALL_SUB_BATCHES) : ALL_SUB_BATCHES).map(sb => (
            <option key={sb} value={sb}>Sub-Batch {sb}</option>
          ))}
        </select>

        <select
          value={selectedMentor}
          onChange={(e) => setSelectedMentor(e.target.value)}
          className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl"
        >
          <option value="ALL">All Mentors</option>
          {mentors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl"
        >
          <option value="ALL">All Categories</option>
          <option value="Achieved">🌟 Achieved (85%+)</option>
          <option value="Progressing">📈 Progressing (70-84%)</option>
          <option value="Focus Required">⚠️ Focus Required (&lt;70%)</option>
        </select>

        {(searchQuery || selectedCohort !== 'ALL' || selectedBatch !== 'ALL' || selectedSubBatch !== 'ALL' || selectedMentor !== 'ALL' || selectedClass !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCohort('ALL');
              setSelectedBatch('ALL');
              setSelectedSubBatch('ALL');
              setSelectedMentor('ALL');
              setSelectedClass('ALL');
            }}
            className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ----------------------------------------------------
          5 CLEAR NAVIGATION TABS (College Presentation Style)
      ---------------------------------------------------- */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('interns')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'interns'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 border-x border-slate-200 -mb-px shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users size={15} />
          <span>1. Interns & Mentors</span>
        </button>

        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'goals'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 border-x border-slate-200 -mb-px shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CheckSquare size={15} />
          <span>2. MIRAI Batches & Goals</span>
        </button>

        <button
          onClick={() => setActiveTab('grading')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'grading'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 border-x border-slate-200 -mb-px shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Award size={15} />
          <span>3. Grading & Publishing</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 border-x border-slate-200 -mb-px shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 size={15} />
          <span>4. Analytics & History</span>
        </button>
      </div>

      {/* ----------------------------------------------------
          TAB 1: INTERNS & MENTORS (Features 1, 2, 3, 4, 5, 6)
      ---------------------------------------------------- */}
      {activeTab === 'interns' && (
        <div className="space-y-6">
          
          {/* Main Interns Table (Features 1, 2, 5) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Interns & Students Directory</h3>
                <p className="text-xs text-slate-500">Manage intern records, assign project mentors, and toggle account activation.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCsvModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Upload CSV
                </button>
                <button
                  onClick={() => setShowAddInternModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  + Add Intern
                </button>
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Intern Name</th>
                  <th className="py-3 px-2.5">Cohort</th>
                  <th className="py-3 px-2.5">Batch</th>
                  <th className="py-3 px-2.5">Sub-Batch</th>
                  <th className="py-3 px-3">Assigned Mentor (Item 5)</th>
                  <th className="py-3 px-3">Performance Grade</th>
                  <th className="py-3 px-3">Account Status (Item 2)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInterns.map(intern => (
                  <tr key={intern.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{intern.name}</div>
                      <div className="text-[11px] text-slate-400">{intern.email}</div>
                    </td>
                    <td className="py-3 px-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100 whitespace-nowrap">
                        {intern.cohort}
                      </span>
                    </td>
                    <td className="py-3 px-2.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200 whitespace-nowrap">
                        {intern.batch || 'Batch A'}
                      </span>
                    </td>
                    <td className="py-3 px-2.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold text-[11px] border border-teal-200 whitespace-nowrap">
                        {intern.subBatch || 'A1'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {/* Inline Mentor Assignment (Feature 5) */}
                      <select
                        value={intern.mentor}
                        onChange={(e) => handleAssignMentor(intern.id, e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
                      >
                        {mentors.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                        intern.classification === 'Achieved' ? 'bg-emerald-50 text-emerald-700' :
                        intern.classification === 'Progressing' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {intern.classification} ({intern.score}%)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {/* Active/Deactivate Toggle (Feature 2) */}
                      <button
                        onClick={() => handleToggleStatus(intern)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                          intern.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {intern.status === 'ACTIVE' ? <UserCheck size={12} /> : <UserX size={12} />}
                        <span>{intern.status === 'ACTIVE' ? 'Active' : 'Deactivated'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setHistoryIntern(intern)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                        title="View Performance Journey"
                      >
                        History
                      </button>
                      <button
                        onClick={() => setGradingIntern(intern)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                        title="Grade / Marks"
                      >
                        Grade
                      </button>
                      <button
                        type="button"
                        onClick={() => setInternToDelete(intern)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                        title={`Remove ${intern.name}`}
                        aria-label={`Remove intern ${intern.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mentors & Cohorts Grid (Features 4 & 6) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Mentors List (Feature 4) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Project Mentors (Item 4)</h3>
                  <p className="text-xs text-slate-500">Mentors assigned to guide interns on projects.</p>
                </div>
                <button
                  onClick={() => setShowAddMentorModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  + Add Mentor
                </button>
              </div>

              <div className="space-y-2">
                {mentors.map(m => {
                  const assigned = interns.filter(i => i.mentor === m.name);
                  return (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{m.name}</div>
                        <div className="text-[11px] text-slate-400">{m.department} • {m.specialization}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700">
                          {assigned.length} / {m.maxCapacity} Interns
                        </span>
                        <button
                          type="button"
                          onClick={() => setMentorToDelete(m)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Remove ${m.name}`}
                          aria-label={`Remove mentor ${m.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cohorts / Batches (Feature 6) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Batches & Cohorts (Item 6)</h3>
                  <p className="text-xs text-slate-500">Intern groups organized by academic period.</p>
                </div>
                <button
                  onClick={() => setShowAddCohortModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  + New Batch
                </button>
              </div>

              <div className="space-y-2">
                {cohorts.map(c => {
                  const count = interns.filter(i => i.cohort === c.name).length;
                  return (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{c.name}</div>
                        <div className="text-[11px] text-slate-400">{c.period} • Term: {c.cycleName}</div>
                      </div>
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg">
                        {count} Interns
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: MIRAI BATCHES & GOALS (Features 7, 8, 9, 10, 11)
      ---------------------------------------------------- */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          
          {/* Evaluation Cycles / Quarters (Feature 7) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">MIRAI Evaluation Terms & Quarters</h3>
                <p className="text-xs text-slate-500">Scheduled appraisal terms for MIRAI interns.</p>
              </div>
              <button
                onClick={() => setShowAddCycleModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                + Launch MIRAI Term
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cycles.map(cy => (
                <div key={cy.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">{cy.quarter}</span>
                    <h4 className="font-bold text-slate-900 text-sm">{cy.name}</h4>
                    <p className="text-slate-400 text-[11px]">{cy.startDate} to {cy.endDate}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    cy.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {cy.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Goals & Milestone Progress (Features 8, 10, 11) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assigned Goals & Progress Tracking (Items 8, 10, 11)</h3>
                <p className="text-xs text-slate-500">Track progress percentage, milestones, and project completion.</p>
              </div>
              <button
                onClick={() => setShowAddGoalModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                + Assign Goal
              </button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Intern</th>
                  <th className="py-3 px-3">Goal Title</th>
                  <th className="py-3 px-3">Goal Category (Item 11)</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3 w-48">Progress (Item 10)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {goals.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{g.internName}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{g.title}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                        {g.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{g.dueDate}</td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{g.progress}%</span>
                          <span className={g.status === 'Completed' ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                            {g.status}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${g.progress >= 90 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                            style={{ width: `${g.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleProgressBump(g.id, 10)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] cursor-pointer"
                      >
                        +10%
                      </button>
                      <button
                        onClick={() => handleProgressBump(g.id, 100)}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md font-semibold text-[11px] cursor-pointer"
                      >
                        Done
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: GRADING & PUBLISHING (8 Core Competencies Evaluation)
      ---------------------------------------------------- */}
      {activeTab === 'grading' && (
        <div className="space-y-6">
          
          {/* Main Review & Publishing Desk (Features 16, 17, 18) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Grading & Result Publishing Desk (Items 16, 17, 18)</h3>
                <p className="text-xs text-slate-500">Select graded interns and broadcast final results.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllPending}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Select All Pending
                </button>
                <button
                  onClick={handlePublishSelected}
                  disabled={selectedForPublish.length === 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl cursor-pointer shadow-xs"
                >
                  🚀 Publish Selected ({selectedForPublish.length})
                </button>
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-3">Intern</th>
                  <th className="py-3 px-2.5">Cohort</th>
                  <th className="py-3 px-2.5">Batch</th>
                  <th className="py-3 px-2.5">Sub-Batch</th>
                  <th className="py-3 px-3">Score (Item 16)</th>
                  <th className="py-3 px-3">Classification (Item 17)</th>
                  <th className="py-3 px-3">Status (Item 18)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInterns.map(intern => (
                  <tr key={intern.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedForPublish.includes(intern.id)}
                        onChange={() => handleToggleSelect(intern.id)}
                        disabled={intern.published}
                        className="w-4 h-4 accent-indigo-600 disabled:opacity-30 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{intern.name}</td>
                    <td className="py-3 px-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100 whitespace-nowrap">
                        {intern.cohort}
                      </span>
                    </td>
                    <td className="py-3 px-2.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200 whitespace-nowrap">
                        {intern.batch || 'Batch A'}
                      </span>
                    </td>
                    <td className="py-3 px-2.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold text-[11px] border border-teal-200 whitespace-nowrap">
                        {intern.subBatch || 'A1'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 text-sm">{intern.score}%</td>
                    <td className="py-3 px-3">
                      {/* Classification Badge (Feature 17) */}
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        intern.classification === 'Achieved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        intern.classification === 'Progressing' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {intern.classification === 'Achieved' && '🌟 '}
                        {intern.classification === 'Progressing' && '📈 '}
                        {intern.classification === 'Focus Required' && '⚠️ '}
                        {intern.classification}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                        intern.published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {intern.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setGradingIntern(intern)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                      >
                        Grade / Edit
                      </button>
                      <button
                        onClick={() => handleTogglePublishOne(intern)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                          intern.published ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {intern.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => setInternToDelete(intern)}
                        className="p-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer inline-flex items-center"
                        title="Remove / Delete Intern"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Submitted Evidence & Mentor Feedback (Features 19 & 20) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Submitted Evidence Desk (Feature 19) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Submitted Project Evidence (Item 19)</h3>
              <p className="text-xs text-slate-500">Student submissions (PRs, Figma links, reports) to review.</p>

              <div className="space-y-2.5 text-xs">
                {evidenceList.map(ev => (
                  <div key={ev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900">{ev.title}</div>
                        <div className="text-[11px] text-slate-400">By {ev.internName} • {ev.type}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        ev.status === 'NEEDS_CHANGES' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {ev.status}
                      </span>
                    </div>

                    <a href={ev.link} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium">
                      <span>Open Link</span>
                      <ExternalLink size={11} />
                    </a>

                    <div className="flex gap-2 pt-1 border-t border-slate-200/60">
                      <button
                        onClick={() => handleEvidenceAction(ev.id, 'APPROVED')}
                        className="flex-1 py-1 bg-emerald-600 text-white rounded font-semibold text-[11px] cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleEvidenceAction(ev.id, 'NEEDS_CHANGES')}
                        className="flex-1 py-1 bg-amber-500 text-white rounded font-semibold text-[11px] cursor-pointer"
                      >
                        Request Changes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback & Comments Feed (Feature 20) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Feedback & Comments (Item 20)</h3>
                  <p className="text-xs text-slate-500">Constructive feedback shared between mentors and interns.</p>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  + Add Feedback
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {feedbackList.map(fb => (
                  <div key={fb.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-800">{fb.fromName} ({fb.fromRole}) → <span className="text-indigo-600">{fb.toName}</span></span>
                      <span className="text-slate-400">{fb.date}</span>
                    </div>
                    <p className="text-slate-700 mt-1">{fb.message}</p>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 mt-1">
                      {fb.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 5: ANALYTICS, REPORTS & AUDIT (Features 21, 23, 24)
      ---------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          
          {/* Header & CSV Download */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Project Reports & Analytics</h3>
              <p className="text-xs text-slate-500">Download data sheets and view distribution charts.</p>
            </div>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-xs"
            >
              <Download size={14} />
              <span>Download Report CSV</span>
            </button>
          </div>

          {/* Simple Performance Distribution Chart (Feature 21) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Performance Grade Distribution (Item 21)
            </h4>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: ADD INTERN (Feature 1)
      ---------------------------------------------------- */}
      {showAddInternModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Student / Intern</h3>
              <button onClick={() => setShowAddInternModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddIntern} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text" required placeholder="e.g. Rahul Sharma"
                  value={newInternName}
                  onChange={(e) => setNewInternName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email" placeholder="rahul@college.edu"
                  value={newInternEmail}
                  onChange={(e) => setNewInternEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cohort</label>
                <select
                  value={newInternCohort}
                  onChange={(e) => setNewInternCohort(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-xl font-medium bg-indigo-50/30 text-indigo-900"
                >
                  {COHORTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* BATCH (A, B, C, D) & SUB-BATCH (A1 - D1) */}
              <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 space-y-2">
                <div className="text-[11px] font-bold text-purple-900 uppercase">
                  Batch & Sub-Batch Assignment
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Batch (A, B, C, D)</label>
                    <select
                      value={newInternBatch}
                      onChange={(e) => {
                        const b = e.target.value;
                        setNewInternBatch(b);
                        const defaultSub = SUB_BATCH_MAP[b]?.[0] || 'A1';
                        setNewInternSubBatch(defaultSub);
                      }}
                      className="w-full px-2.5 py-2 border border-purple-200 bg-white rounded-xl font-semibold text-purple-900"
                    >
                      {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sub-Batch (A1–D1)</label>
                    <select
                      value={newInternSubBatch}
                      onChange={(e) => setNewInternSubBatch(e.target.value)}
                      className="w-full px-2.5 py-2 border border-teal-200 bg-white rounded-xl font-semibold text-teal-900"
                    >
                      {(SUB_BATCH_MAP[newInternBatch] || ALL_SUB_BATCHES).map(sb => (
                        <option key={sb} value={sb}>Sub-Batch {sb}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-purple-700">
                  Interns are grouped by Cohort ➔ Batch (A, B, C, D) ➔ Sub-Batch (A1 through D1).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Mentor</label>
                <select
                  value={newInternMentor}
                  onChange={(e) => setNewInternMentor(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-xl"
                >
                  {mentors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowAddInternModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Save Intern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: BULK CSV IMPORT (Feature 3)
      ---------------------------------------------------- */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Upload Interns via CSV (Item 3)</h3>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Upload a spreadsheet with intern names, email addresses, and assigned mentors to import everyone at once.
              </p>

              <button
                onClick={handleSampleCsv}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl border border-indigo-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>Download Sample CSV Template</span>
              </button>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center space-y-2">
                <UploadCloud size={28} className="mx-auto text-indigo-600" />
                <div className="font-semibold text-slate-700">Select or Drag CSV file here</div>
                <input type="file" accept=".csv" className="text-xs text-slate-500 mx-auto block" />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowCsvModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCsvImport}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Import 2 Demo Interns
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: ADD MENTOR (Feature 4)
      ---------------------------------------------------- */}
      {showAddMentorModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Project Mentor</h3>
              <button onClick={() => setShowAddMentorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMentor} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mentor Name</label>
                <input
                  type="text" required placeholder="Prof. Anita Verma"
                  value={newMentorName}
                  onChange={(e) => setNewMentorName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email" placeholder="anita@college.edu"
                  value={newMentorEmail}
                  onChange={(e) => setNewMentorEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={newMentorDept}
                  onChange={(e) => setNewMentorDept(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-xl"
                >
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialization / Domain</label>
                <input
                  type="text" placeholder="Cloud & AI"
                  value={newMentorSpec}
                  onChange={(e) => setNewMentorSpec(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowAddMentorModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Save Mentor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: ADD COHORT / BATCH (Feature 6)
      ---------------------------------------------------- */}
      {showAddCohortModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Cohort / Batch</h3>
              <button onClick={() => setShowAddCohortModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCohort} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cohort Name</label>
                <input
                  type="text" required placeholder="Summer 2026 Batch"
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Time Period</label>
                <input
                  type="text" placeholder="May 2026 - Aug 2026"
                  value={newCohortPeriod}
                  onChange={(e) => setNewCohortPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowAddCohortModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: ADD CYCLE (Feature 7)
      ---------------------------------------------------- */}
      {showAddCycleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Launch MIRAI Evaluation Term</h3>
              <button onClick={() => setShowAddCycleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCycle} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Term / Evaluation Title</label>
                <input
                  type="text" required placeholder="MIRAI Q2 2026 Mid-Term Appraisal"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quarter / Term Period</label>
                <input
                  type="text" placeholder="Q2 2026"
                  value={newCycleQuarter}
                  onChange={(e) => setNewCycleQuarter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowAddCycleModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Launch Term
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: ASSIGN GOAL (Feature 8)
      ---------------------------------------------------- */}
      {showAddGoalModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Assign Project Goal</h3>
              <button onClick={() => setShowAddGoalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Intern</label>
                <select
                  value={newGoalIntern}
                  onChange={(e) => setNewGoalIntern(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  {interns.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Goal Title</label>
                <input
                  type="text" required placeholder="e.g. Implement Payment Gateway Integration"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newGoalCategory}
                  onChange={(e) => setNewGoalCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  <option value="Technical Goal">Technical Goal</option>
                  <option value="Design Goal">Design Goal</option>
                  <option value="Quality Goal">Quality Goal</option>
                  <option value="Soft Skills">Soft Skills</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowAddGoalModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Assign Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ----------------------------------------------------
          MODAL: GRADE INTERN (Features 16 & 17)
      ---------------------------------------------------- */}
      {gradingIntern && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Grade Intern: {gradingIntern.name}</h3>
                <p className="text-xs text-slate-400">{gradingIntern.cohort} • <span className="font-semibold text-purple-700">{gradingIntern.batch} ({gradingIntern.subBatch})</span> • Mentor: {gradingIntern.mentor}</p>
              </div>
              <button onClick={() => setGradingIntern(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4 text-xs">
              
              {/* Technical Capability (60%) */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex justify-between items-center border-b border-indigo-100/70 pb-2">
                  <span className="font-bold text-indigo-900 uppercase text-[11px] tracking-wide">
                    Technical Capability (60% Weight)
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600">
                    Subtotal: {(((gradeTechProficiency + gradeProblemSolving + gradeQualityExecution) / 3 / 5) * techCapabilityWeight).toFixed(1)} / 60 pts
                  </span>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">1. Technical Proficiency:</span>
                    <span className="font-bold text-indigo-600">{gradeTechProficiency} / 5</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">Knowledge, application of concepts, tools, and technologies</p>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeTechProficiency}
                    onChange={(e) => setGradeTechProficiency(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">2. Problem Solving:</span>
                    <span className="font-bold text-indigo-600">{gradeProblemSolving} / 5</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">Problem understanding, analysis, solution development, and judgement</p>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeProblemSolving}
                    onChange={(e) => setGradeProblemSolving(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">3. Quality & Execution:</span>
                    <span className="font-bold text-indigo-600">{gradeQualityExecution} / 5</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">Accuracy, completeness, reliability, and delivery</p>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeQualityExecution}
                    onChange={(e) => setGradeQualityExecution(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              {/* Behavioral Capability (40%) */}
              <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                <div className="flex justify-between items-center border-b border-purple-100/70 pb-2">
                  <span className="font-bold text-purple-900 uppercase text-[11px] tracking-wide">
                    Behavioral Capability (40% Weight)
                  </span>
                  <span className="text-[11px] font-bold text-purple-700">
                    Subtotal: {(((gradeLearningAgility + gradeOwnership + gradeProfessionalism + gradeCommunication + gradeAdaptability) / 5 / 5) * behavioralCapabilityWeight).toFixed(1)} / 40 pts
                  </span>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">4. Learning Agility:</span>
                    <span className="font-bold text-purple-700">{gradeLearningAgility} / 5</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">Learning speed, feedback application, and adaptability</p>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeLearningAgility}
                    onChange={(e) => setGradeLearningAgility(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">5. Ownership & Accountability:</span>
                    <span className="font-bold text-purple-700">{gradeOwnership} / 5</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">Responsibility, commitment, follow-through, and proactive action</p>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeOwnership}
                    onChange={(e) => setGradeOwnership(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">6. Professionalism & Discipline:</span>
                    <span className="font-bold text-purple-700">{gradeProfessionalism} / 5</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">Reliability, preparedness, responsiveness, and workplace conduct</p>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeProfessionalism}
                    onChange={(e) => setGradeProfessionalism(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">7. Communication & Collaboration:</span>
                    <span className="font-bold text-purple-700">{gradeCommunication} / 5</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">Clarity, listening, teamwork, and stakeholder interaction</p>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeCommunication}
                    onChange={(e) => setGradeCommunication(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">8. Adaptability & Maturity:</span>
                    <span className="font-bold text-purple-700">{gradeAdaptability} / 5</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">Handling ambiguity, changing priorities, and professional judgement</p>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeAdaptability}
                    onChange={(e) => setGradeAdaptability(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>

              {/* Automatic Calculation Preview (Feature 17) */}
              {(() => {
                const techAvg = (gradeTechProficiency + gradeProblemSolving + gradeQualityExecution) / 3;
                const techScore = (techAvg / 5) * techCapabilityWeight;
                const behAvg = (gradeLearningAgility + gradeOwnership + gradeProfessionalism + gradeCommunication + gradeAdaptability) / 5;
                const behScore = (behAvg / 5) * behavioralCapabilityWeight;
                const score = parseFloat((techScore + behScore).toFixed(1));
                const cat = score >= 85 ? 'Achieved' : score >= 70 ? 'Progressing' : 'Focus Required';
                return (
                  <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 font-semibold ${
                    cat === 'Achieved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    cat === 'Progressing' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                    'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span>Technical (60%): <strong>{techScore.toFixed(1)}</strong></span>
                      <span>Behavioral (40%): <strong>{behScore.toFixed(1)}</strong></span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5">
                      <span className="text-sm font-bold">Overall Marks: {score}%</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white font-bold shadow-xs">
                        {cat}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setGradingIntern(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: ADD FEEDBACK (Feature 20)
      ---------------------------------------------------- */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Mentor Feedback</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFeedback} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">To Intern</label>
                <select
                  value={newFeedbackTo}
                  onChange={(e) => setNewFeedbackTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  {interns.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Feedback Type</label>
                <select
                  value={newFeedbackType}
                  onChange={(e) => setNewFeedbackType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  <option value="PRAISE">Positive Praise</option>
                  <option value="SUGGESTION">Constructive Suggestion</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message</label>
                <textarea
                  rows={3} required placeholder="Write helpful feedback message..."
                  value={newFeedbackMsg}
                  onChange={(e) => setNewFeedbackMsg(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Post Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: INDIVIDUAL PERFORMANCE JOURNEY (Feature 24)
      ---------------------------------------------------- */}
      {historyIntern && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Performance Journey: {historyIntern.name}</h3>
                <p className="text-xs text-slate-400">{historyIntern.cohort} • <span className="font-semibold text-purple-700">{historyIntern.batch} ({historyIntern.subBatch})</span> • Mentor: {historyIntern.mentor}</p>
              </div>
              <button onClick={() => setHistoryIntern(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Current Marks</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{historyIntern.score}%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Classification</div>
                  <div className="text-xs font-bold text-emerald-600 mt-1">{historyIntern.classification}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Status</div>
                  <div className="text-xs font-bold text-slate-700 mt-1">{historyIntern.published ? 'Published' : 'Draft'}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[11px] mb-2">Previous Evaluation History</h4>
                <div className="space-y-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg flex justify-between">
                    <span>Spring 2025 Mid-Term Evaluation</span>
                    <strong className="text-emerald-700">92.8% (Achieved)</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg flex justify-between">
                    <span>Fall 2025 Project Review</span>
                    <strong className="text-blue-700">88.5% (Achieved)</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setHistoryIntern(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ----------------------------------------------------
          MODAL: REMOVE / DELETE INTERN
      ---------------------------------------------------- */}
      {internToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Trash2 size={18} />
                </span>
                <h3 className="text-base font-bold text-slate-900">Remove Intern</h3>
              </div>
              <button onClick={() => setInternToDelete(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">{internToDelete.name}</strong>?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Choose how to remove:</div>
                <div className="text-slate-600 space-y-1.5 text-[11px]">
                  <div>
                    <strong>1. Deactivate Account:</strong> Hides the intern from active evaluation while safely preserving their past grades and project evidence for records.
                  </div>
                  <div>
                    <strong>2. Permanently Delete:</strong> Completely removes this intern, their assigned goals, and their scores from the directory.
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleStatus(internToDelete);
                    setInternToDelete(null);
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl cursor-pointer"
                >
                  {internToDelete.status === 'ACTIVE' ? 'Deactivate Account Instead' : 'Activate Account'}
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmDelete(internToDelete)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Permanently Delete Intern</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInternToDelete(null)}
                  className="w-full py-1 text-slate-400 hover:text-slate-600 font-semibold cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: REMOVE MENTOR CONFIRMATION
      ---------------------------------------------------- */}
      {mentorToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Trash2 size={18} />
                </span>
                <h3 className="text-base font-bold text-slate-900">Remove Mentor</h3>
              </div>
              <button onClick={() => setMentorToDelete(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Are you sure you want to remove mentor <strong className="text-slate-900">{mentorToDelete.name}</strong> ({mentorToDelete.department} • {mentorToDelete.specialization})?
              </p>

              {interns.filter(i => i.mentor === mentorToDelete.name).length > 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1 text-amber-800 text-[11px]">
                  <div className="font-bold">Notice: Interns Assigned</div>
                  <div>
                    {interns.filter(i => i.mentor === mentorToDelete.name).length} intern(s) currently assigned to this mentor will have their mentor field set to <strong>Unassigned</strong>.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px]">
                  This mentor currently has 0 assigned interns and can be safely removed.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMentorToDelete(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteMentor(mentorToDelete)}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Remove Mentor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HrDashboard;
