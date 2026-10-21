import { Outlet } from 'react-router-dom'

/* Auth pages own their full-screen designs; this is just the route wrapper */
const AuthLayout = () => {
  return (
    <main className="auth-layout">
        <Outlet/>
    </main>
  )
}

export default AuthLayout
