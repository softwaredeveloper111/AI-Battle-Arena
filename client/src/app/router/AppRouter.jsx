import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthLayout from '../../layout/AuthLayout'
import AppLayout from '../../layout/AppLayout'
import LoginPage from '../../features/auth/pages/LoginPage'
import SignupPage from '../../features/auth/pages/SignupPage'
import BattlePage from '../../features/battle mode/pages/BattlePage'
import AgentPage from '../../features/agent mode/pages/AgentPage'

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: '/battle', element: <BattlePage /> },
      { path: '/agent', element: <AgentPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default router
