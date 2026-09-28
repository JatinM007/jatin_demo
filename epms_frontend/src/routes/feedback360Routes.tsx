import { Navigate } from 'react-router-dom';

export const feedback360Routes = [
  { path: '/360-feedback/pending',              element: <Navigate to="/appraisal" replace />, adminOnly: false },
  { path: '/360-feedback/submit',               element: <Navigate to="/appraisal" replace />, adminOnly: false },
  { path: '/360-feedback/my-report',            element: <Navigate to="/appraisal" replace />, adminOnly: false },
  { path: '/360-feedback/team-reports/:empId',  element: <Navigate to="/appraisal" replace />, adminOnly: false },
  { path: '/360-feedback/admin',                element: <Navigate to="/appraisal" replace />, adminOnly: true  },
  { path: '/360-feedback/admin/competencies',   element: <Navigate to="/appraisal" replace />, adminOnly: true  },
  { path: '/360-feedback/calibration',          element: <Navigate to="/appraisal" replace />, adminOnly: true  },
];
