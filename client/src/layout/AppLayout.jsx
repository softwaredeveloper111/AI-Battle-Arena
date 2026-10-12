import { Outlet } from 'react-router-dom'
import Sidebar from '../features/dashboard/components/Sidebar'
import styles from './AppLayout.module.scss'

/* Dashboard shell: sidebar on the left, active mode screen on the right */
const AppLayout = () => (
  <div className={styles.shell}>
    <Sidebar />
    <main className={styles.main}>
      <Outlet />
    </main>
  </div>
)

export default AppLayout
