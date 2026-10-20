import { useEffect, useState } from 'react'
import { useNavigate, useMatch } from 'react-router-dom'
import SearchModal from './SearchModal'
import { DEFAULT_CHAT_ID, groupConversations } from '../data/conversations'
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

const HISTORY = groupConversations()

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

  const navigate = useNavigate()
  const [menuPos, setMenuPos] = useState(null) // { left, bottom } | null

  const openMenu = (e) => {
    if (menuPos) return setMenuPos(null)
    const r = e.currentTarget.getBoundingClientRect()
    setMenuPos({ left: r.right + 10, bottom: window.innerHeight - r.bottom })
  }

  // close on outside click / Escape
  useEffect(() => {
    if (!menuPos) return
    const onDown = (e) => {
      if (!e.target.closest('[data-account-menu]')) setMenuPos(null)
    }
    const onKey = (e) => e.key === 'Escape' && setMenuPos(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuPos])

  // close when sidebar toggles
  useEffect(() => setMenuPos(null), [collapsed])

  const handleSignOut = () => {
    setMenuPos(null)
    navigate('/login')
  }
  const [searchOpen, setSearchOpen] = useState(false)
  const chatMatch = useMatch('/chat/:chatId')
  const activeId = chatMatch ? chatMatch.params.chatId : DEFAULT_CHAT_ID

  const openChat = (id) => {
    setSearchOpen(false)
    navigate(`/chat/${id}`)
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
        onClick={() => setSearchOpen(true)}
      >
        <SearchIcon size={18} />
        <span>Search</span>
      </button>

      <nav className={styles.history} aria-label="Chat history">
        {HISTORY.map((group) => (
          <div key={group.label} className={styles.group}>
            <h4 className={styles.groupLabel}>{group.label}</h4>
            <ul>
              {group.items.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    title={chat.title}
                    aria-label={chat.title}
                    onClick={() => openChat(chat.id)}
                    className={`${styles.item} ${chat.id === activeId ? styles.active : ''}`}
                  >
                    <ChatIcon size={17} />
                    <span>{chat.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.account}>
        <button
          type="button"
          className={styles.avatar}
          data-account-menu
          onClick={collapsed ? openMenu : undefined}
          title="Sourav Giri (girisourav702939@gmail.com)"
          aria-label="Account"
          aria-haspopup={collapsed ? 'menu' : undefined}
        >
          S
        </button>
        <div className={styles.userInfo}>
          <strong>Sourav Giri</strong>
          <span>girisourav702939@gmail.com</span>
        </div>
        <button
          type="button"
          id="account-menu-btn"
          data-account-menu
          className={`${styles.iconBtn} ${styles.accountMenuBtn}`}
          onClick={openMenu}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={!!menuPos}
          title="Account menu"
        >
          <MoreVerticalIcon size={18} />
        </button>
      </div>

      {menuPos && (
        <div
          className={styles.accountPopup}
          data-account-menu
          role="menu"
          style={{ left: menuPos.left, bottom: menuPos.bottom }}
        >
          <button type="button" role="menuitem" className={styles.signOut} onClick={handleSignOut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      )}

      <footer className={styles.footer}>
        <a href="#">Terms of Use</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Cookies</a>
      </footer>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={openChat}
        activeId={activeId}
      />
    </aside>
  )
}

export default Sidebar

