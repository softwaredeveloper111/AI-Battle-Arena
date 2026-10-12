import { NavLink } from 'react-router-dom'
import PixelCluster from '../../../components/PixelCluster'
import { ChevronDownIcon, RobotIcon, SwordsIcon } from '../../../components/Icons'
import styles from './Topbar.module.scss'

/**
 * Top bar with chat title + Battle / Agent mode switch.
 * Mode switch only navigates between the two static screens.
 */
const Topbar = ({ title, subtitle }) => {
  return (
    <header className={styles.topbar}>
      <span className={styles.dots} aria-hidden />

      <div className={styles.titleBlock}>
        <button type="button" id="chat-title-btn" className={styles.title}>
          <span>{title}</span>
          <ChevronDownIcon size={18} />
        </button>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.switch} role="tablist" aria-label="Mode">
        <NavLink
          to="/battle"
          id="mode-battle-tab"
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
        >
          <SwordsIcon size={17} />
          <span>Battle</span>
        </NavLink>
        <NavLink
          to="/agent"
          id="mode-agent-tab"
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
        >
          <RobotIcon size={17} />
          <span>Agent</span>
        </NavLink>
      </div>

      <PixelCluster variant="corner" cell={7} className={styles.pixels} />
    </header>
  )
}

export default Topbar
