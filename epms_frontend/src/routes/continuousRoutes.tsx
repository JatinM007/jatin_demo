import FeedbackPage from "../pages/continuous/FeedbackPage";
import PerformanceHistoryAdminPage from "../pages/continuous/PerformanceHistoryAdminPage";
import PerformanceHistoryManagerPage from "../pages/continuous/PerformanceHistoryManagerPage";

export const continuousRoutes = [
  { path: "/continuous-feedback", element: <FeedbackPage /> },
  { path: "/performance-history/admin", element: <PerformanceHistoryAdminPage /> },
  { path: "/performance-history/manager", element: <PerformanceHistoryManagerPage /> },
];
