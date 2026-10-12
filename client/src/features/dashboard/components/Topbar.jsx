import PixelCluster from '../../../components/PixelCluster'
import { ChevronDownIcon, RobotIcon, SwordsIcon } from '../../../components/Icons'
import styles from './Topbar.module.scss'

/**
 * Top bar with chat title + Battle / Agent state switcher.
 */
const Topbar = ({ title, subtitle, mode = 'battle', onModeChange }) => {
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
        <button
          type="button"
          id="mode-battle-tab"
          onClick={() => onModeChange?.('battle')}
          className={`${styles.tab} ${mode === 'battle' ? styles.tabActive : ''}`}
          aria-selected={mode === 'battle'}
          role="tab"
        >
          <SwordsIcon size={17} />
          <span>Battle</span>
        </button>
        <button
          type="button"
          id="mode-agent-tab"
          onClick={() => onModeChange?.('agent')}
          className={`${styles.tab} ${mode === 'agent' ? styles.tabActive : ''}`}
          aria-selected={mode === 'agent'}
          role="tab"
        >
          <RobotIcon size={17} />
          <span>Agent</span>
        </button>
      </div>

      <PixelCluster variant="corner" cell={7} className={styles.pixels} />
    </header>
  )
}

export default Topbar
