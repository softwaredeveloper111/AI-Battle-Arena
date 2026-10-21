import { Menu } from 'lucide-react'
import PixelCluster from '../../../components/PixelCluster'
import { ChevronDownIcon, SwordsIcon } from '../../../components/Icons'
import styles from './Topbar.module.scss'

/**
 * Top bar with chat title and Battle mode badge.
 */
const Topbar = ({ title, subtitle, onRename, onToggleSidebar }) => {
  return (
    <header className={styles.topbar}>
      <span className={styles.dots} aria-hidden />

      <div className={styles.leftGroup}>
        <button
          type="button"
          id="mobile-sidebar-toggle-btn"
          className={styles.mobileMenuBtn}
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
          title="Toggle menu"
        >
          <Menu size={18} />
        </button>

        <div className={styles.titleBlock}>
          <button
            type="button"
            id="chat-title-btn"
            className={styles.title}
            onClick={onRename}
            disabled={!onRename}
            title={onRename ? 'Click to rename chat' : undefined}
          >
            <span>{title}</span>
            <ChevronDownIcon size={18} />
          </button>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      <div className={styles.switch} aria-label="Mode">
        <span className={`${styles.tab} ${styles.tabActive}`}>
          <SwordsIcon size={17} />
          <span>Battle</span>
        </span>
      </div>

      <PixelCluster variant="corner" cell={7} className={styles.pixels} />
    </header>
  )
}

export default Topbar

