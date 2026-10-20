import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthLayout from '../../layout/AuthLayout'
import AppLayout from '../../layout/AppLayout'
import LoginPage from '../../features/auth/pages/LoginPage'
import SignupPage from '../../features/auth/pages/SignupPage'
import Dashboard from '../../features/dashboard/pages/Dashboard'

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/chat/:chatId', element: <Dashboard /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default router
