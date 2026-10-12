import {
  CalendarIcon,
  DocsIcon,
  DriveIcon,
  GithubIcon,
  GmailIcon,
  LinearIcon,
  NotionIcon,
} from '../../../components/Icons'
import styles from './IntegrationBar.module.scss'

const INTEGRATIONS = [
  { id: 'github', label: 'GitHub', icon: GithubIcon },
  { id: 'drive', label: 'Drive', icon: DriveIcon },
  { id: 'docs', label: 'Docs', icon: DocsIcon },
  { id: 'notion', label: 'Notion', icon: NotionIcon },
  { id: 'gmail', label: 'Gmail', icon: GmailIcon },
  { id: 'linear', label: 'Linear', icon: LinearIcon },
  { id: 'calendar', label: 'Cal', icon: CalendarIcon },
]

const IntegrationBar = () => (
  <div className={styles.bar}>
    {INTEGRATIONS.map(({ id, label, icon: Icon }) => (
      <button key={id} type="button" id={`integration-${id}-btn`} className={styles.chip}>
        <Icon size={18} />
        <span>{label}</span>
      </button>
    ))}
  </div>
)

export default IntegrationBar
