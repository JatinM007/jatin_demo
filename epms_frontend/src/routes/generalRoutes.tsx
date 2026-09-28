import DashboardRouter from "../pages/DashboardRouter";
import ProfilePage from "../pages/ProfilePage";
import EditProfilePage from "../pages/EditProfilePage";
import NotificationsPage from "../pages/NotificationsPage";
import InternModule from "../modules/intern/InternModule";

export const generalRoutes = [
  { path: "/dashboard", element: <DashboardRouter /> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/profile/edit", element: <EditProfilePage /> },
  { path: "/notifications", element: <NotificationsPage /> },
  { path: "/intern", element: <InternModule /> },
];

