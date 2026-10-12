import {
  CopyIcon,
  MoreHorizontalIcon,
  RefreshIcon,
  RobotIcon,
  ThumbDownIcon,
  ThumbUpIcon,
} from '../../../components/Icons'
import styles from './AgentMessage.module.scss'

/* Assistant reply row: gold robot avatar, text and action icons */
const AgentMessage = ({ children }) => (
  <div className={styles.row}>
    <div className={styles.avatar}>
      <RobotIcon size={20} />
    </div>
    <div className={styles.body}>
      <p className={styles.text}>{children}</p>
      <div className={styles.actions}>
        <button type="button" aria-label="Copy">
          <CopyIcon size={15} />
        </button>
        <button type="button" aria-label="Good response">
          <ThumbUpIcon size={15} />
        </button>
        <button type="button" aria-label="Bad response">
          <ThumbDownIcon size={15} />
        </button>
        <button type="button" aria-label="Regenerate">
          <RefreshIcon size={15} />
        </button>
        <button type="button" aria-label="More">
          <MoreHorizontalIcon size={15} />
        </button>
      </div>
    </div>
  </div>
)

export default AgentMessage
