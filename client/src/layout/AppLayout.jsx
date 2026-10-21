import { Outlet } from 'react-router-dom'

/* Auth pages own their full-screen designs; this is just the route wrapper */
const AppLayout = () =>{
    
  return (
    <main className="app-layout">
      <Outlet/>
    </main>
  )
}

export default AppLayout
