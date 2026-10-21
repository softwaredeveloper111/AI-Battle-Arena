import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AuthLayout from '../../layout/AuthLayout'
import AppLayout from '../../layout/AppLayout'
import LoginPage from '../../features/auth/pages/LoginPage'
import SignupPage from '../../features/auth/pages/SignupPage'
import Dashboard from '../../features/dashboard/pages/Dashboard'
import ResetPasswordPage from "../../features/auth/pages/ResetPasswordPage"

import ProtectedRoute from "../../components/ProtectedRoute";
import PublicRoute from "../../components/PublicRoute";

import PrivacyPage from "../../features/user's concern/pages/PrivacyPolicyPage"
import TermsPage from "../../features/user's concern/pages/Terms&ConditionPage"
import CookiePolicyPage from "../../features/user's concern/pages/CookiePolicyPage"

import NotFound from "../../components/NotFound"







const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/chat/:chatId', element: <Dashboard /> },
          { path: '/new', element: <Dashboard /> },
        ],
      },
    ],
  },
  {
    element: <PublicRoute />,
    children: [
      {
        element:<AuthLayout/>,
        children:[
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
          {path:"/reset-password" , element:<ResetPasswordPage/>}
        ]
      }
    ],
  },
    {
    element: <AuthLayout />,
    children: [
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/terms", element: <TermsPage /> },
      { path: "/cookie-policy", element: <CookiePolicyPage /> },
    ],
  },
  { path: '*', element: <NotFound/> },
])

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
