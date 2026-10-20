import { useState } from 'react'
import Brand from '../../../components/Brand'
import PixelCluster from '../../../components/PixelCluster'
import {
  ChatIcon,
  GridIcon,
  MoreVerticalIcon,
  PlusCircleIcon,
  SearchIcon,
} from '../../../components/Icons'
import styles from './Sidebar.module.scss'

/* Static mock history (UI only) */
const HISTORY = [
  {
    label: 'Today',
    items: ['Explain how gravity works', 'Create a travel itinerary'],
  },
  {
    label: 'Yesterday',
    items: ['What is a black hole?', 'How does a neural network...', 'Plan a trip to Japan'],
  },
  {
    label: 'Older',
    items: ['Compare SQL vs NoSQL', 'Write a Python scraper', 'Best laptop for developers', 'Explain quantum computing'],
  },
]

const ACTIVE_CHAT = 'Explain how gravity works'

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('sidebar_collapsed', String(next))
      } catch(err) {
        console.log(err)
      }
      return next
    })
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <span className={styles.dotsTop} aria-hidden />
      <span className={styles.dotsMid} aria-hidden />
      <PixelCluster variant="fade" cell={8} className={styles.pixels} />

      <div className={styles.top}>
        <div className={styles.brandWrap}>
          <Brand size="sm" />
        </div>
        <button
          type="button"
          id="sidebar-apps-btn"
          className={styles.iconBtn}
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <GridIcon size={20} />
        </button>
      </div>

      <button
        type="button"
        id="new-chat-btn"
        className={styles.newChat}
        title="New Chat"
        aria-label="New Chat"
      >
        <PlusCircleIcon size={22} />
        <span>New Chat</span>
      </button>

      <button
        type="button"
        id="sidebar-search-btn"
        className={styles.search}
        title="Search"
        aria-label="Search"
      >
        <SearchIcon size={18} />
        <span>Search</span>
      </button>

      <nav className={styles.history} aria-label="Chat history">
        {HISTORY.map((group) => (
          <div key={group.label} className={styles.group}>
            <h4 className={styles.groupLabel}>{group.label}</h4>
            <ul>
              {group.items.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    title={item}
                    aria-label={item}
                    className={`${styles.item} ${item === ACTIVE_CHAT ? styles.active : ''}`}
                  >
                    <ChatIcon size={17} />
                    <span>{item}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.account}>
        <div className={styles.avatar} title="Sourav Giri (girisourav702939@gmail.com)">
          S
        </div>
        <div className={styles.userInfo}>
          <strong>Sourav Giri</strong>
          <span>girisourav702939@gmail.com</span>
        </div>
        <button
          type="button"
          id="account-menu-btn"
          className={`${styles.iconBtn} ${styles.accountMenuBtn}`}
          aria-label="Account menu"
          title="Account menu"
        >
          <MoreVerticalIcon size={18} />
        </button>
      </div>

      <footer className={styles.footer}>
        <a href="#">Terms of Use</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Cookies</a>
      </footer>
    </aside>
  )
}

export default Sidebar

