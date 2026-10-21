import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthLayout from '../../layout/AuthLayout'
import AppLayout from '../../layout/AppLayout'
import LoginPage from '../../features/auth/pages/LoginPage'
import SignupPage from '../../features/auth/pages/SignupPage'
import Dashboard from '../../features/dashboard/pages/Dashboard'
import ResetPasswordPage from "../../features/auth/pages/ResetPasswordPage"

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/chat/:chatId', element: <Dashboard /> },
      { path: '/new', element: <Dashboard /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      {path:"/reset-password" , element:<ResetPasswordPage/>}
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default router
