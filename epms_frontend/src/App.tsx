import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./hooks/reduxHooks";
import { useGetMeQuery } from "./features/auth/authApi";
import { setUser } from "./features/auth/authSlice";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./components/MainLayout";
// Routes
import {
  publicRoutes,
  appraisalRoutes,
  adminRoutes,
  generalRoutes,
  kpiRoutes,
  continuousRoutes,
  feedback360Routes,
} from "./routes";
import { ActiveCycleProvider } from "./context/ActiveCycleContext";
import KpiCategoryManager from './pages/kpi/KpiCategoryManager';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Specialized Manager Component (Temporary here, can be moved later)
const ApprovalPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Manager Approval Page</h1></div>;

const App = () => {
  const dispatch = useAppDispatch();
  const { accessToken, user } = useAppSelector((state) => state.auth);

  const { data: userData, isSuccess } = useGetMeQuery(undefined, {
    skip: !accessToken || !!user,
  });

  useEffect(() => {
    if (isSuccess && userData) {
      dispatch(setUser(userData));
    }
  }, [isSuccess, userData, dispatch]);

  // Sync logout across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken" && !e.newValue) {
        dispatch({ type: "auth/logout" });
        window.location.href = "/login";
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        {publicRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}

        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ActiveCycleProvider><MainLayout /></ActiveCycleProvider>}>
            {/* General Routes (Dashboard, Profile, etc.) */}
            {generalRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}

            {/* Continuous Feedback & Performance History Routes */}
            {continuousRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}

            {/* 360 Feedback — general (all authenticated users) */}
            {feedback360Routes.filter(r => !r.adminOnly).map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}

            {/* Appraisal Workflow Routes */}
            {appraisalRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}

            {/* KPI General Routes */}
            {kpiRoutes.filter(r => !['/kpi/library', '/kpi/manage', '/kpi/library/new', '/kpi/library/edit/:id', '/kpi/assign/:employeeId', '/kpi/team', '/kpi/org-history'].includes(r.path)).map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}

            {/* Manager & Admin/HR KPI Management Routes */}
            <Route element={<ProtectedRoute allowedRoles={["MANAGER", "ADMIN", "HR"]} />}>
              {kpiRoutes.filter(r => ['/kpi/team', '/kpi/manage', '/kpi/assign/:employeeId', '/kpi/org-history'].includes(r.path)).map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              {adminRoutes.filter(r => r.path === '/employees/:id/profile').map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Route>

            {/* HR/Admin Management Routes */}
            <Route element={<ProtectedRoute allowedRoles={["ADMIN", "HR"]} />}>
              {/* 360 Feedback Admin */}
              {feedback360Routes.filter(r => r.adminOnly).map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}

              {/* Shared HR + Admin routes (employees, departments, org, etc.) */}
              {adminRoutes.filter(r => !['/roles', '/permissions', '/permissions/matrix', '/permissions/assign', '/employees/:id/profile'].includes(r.path)).map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}

              {/* ADMIN-only routes — Roles & Permissions management */}
              <Route element={<ProtectedRoute requiredPermissions={["PERMISSION_MANAGE"]} />}>
                {adminRoutes.filter(r => ['/roles', '/permissions', '/permissions/matrix', '/permissions/assign'].includes(r.path)).map((route) => (
                  <Route key={route.path} path={route.path} element={route.element} />
                ))}
              </Route>

              {/* KPI Administrative Routes (Library Management) */}
              {kpiRoutes.filter(r => ['/kpi/library', '/kpi/library/new', '/kpi/library/edit/:id'].includes(r.path)).map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              <Route path="/kpi/categories" element={<KpiCategoryManager />} />
            </Route>

            {/* Approvals — requires calibrate permission */}
            <Route element={<ProtectedRoute requiredPermissions={["APPRAISAL_CALIBRATE"]} />}>
              <Route path="/approvals" element={<ApprovalPage />} />
            </Route>
          </Route>
        </Route>

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<div className="p-6 text-center mt-20 font-bold text-gray-400">404 | Page Not Found</div>} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </BrowserRouter>
  );
};

export default App;
