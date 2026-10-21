import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useMatch, Link } from 'react-router-dom'
import SearchModal from './SearchModal'
import { groupChatSessionsByDate } from '../data/conversations'
import Brand from '../../../components/Brand'
import PixelCluster from '../../../components/PixelCluster'
import {
  ChatIcon,
  GridIcon,
  MoreVerticalIcon,
  PlusCircleIcon,
  SearchIcon,
} from '../../../components/Icons'
import useAuth from '../../auth/hooks/useAuth'
import useBattle from '../hooks/useBattle'
import styles from './Sidebar.module.scss'

const Sidebar = () => {
  const { user, logoutHandler } = useAuth()
  const { chatSessions, chatSessionsLoading, fetchChatSessionsHandler } = useBattle()

  useEffect(() => {
    fetchChatSessionsHandler()
  }, [fetchChatSessionsHandler])

  const groupedSessions = useMemo(() => {
    return groupChatSessionsByDate(chatSessions)
  }, [chatSessions])
  
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setMenuPos(null)
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('sidebar_collapsed', String(next))
      } catch (err) {
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

  const handleSignOut = async () => {
    setMenuPos(null)
    try {
      await logoutHandler()
    } catch (err) {
      console.error(err)
    }
    navigate('/login')
  }

  const [searchOpen, setSearchOpen] = useState(false)
  const chatMatch = useMatch('/chat/:chatId')
  const isNewChat = !!useMatch('/new')
  const activeId = chatMatch ? chatMatch.params.chatId : null

  const openChat = (id) => {
    setSearchOpen(false)
    navigate(`/chat/${id}`)
  }

  const username = user?.username || user?.email?.split('@')[0] || 'User'
  const email = user?.email || ''
  const initial = username.charAt(0).toUpperCase()

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
        className={`${styles.newChat} ${isNewChat ? styles.active : ''}`}
        title="New Chat"
        aria-label="New Chat"
        onClick={() => navigate('/new')}
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
        {chatSessionsLoading && (!chatSessions || chatSessions.length === 0) ? (
          <div className={styles.loadingState}>
            <span>Loading history...</span>
          </div>
        ) : groupedSessions.length === 0 ? (
          <div className={styles.emptyState}>
            <span>No previous chats</span>
          </div>
        ) : (
          groupedSessions.map((group) => (
            <div key={group.label} className={styles.group}>
              <h4 className={styles.groupLabel}>{group.label}</h4>
              <ul>
                {group.items.map((chat) => {
                  const id = chat._id || chat.id
                  const title = chat.title || 'Untitled Battle'
                  const isActive = id === activeId

                  return (
                    <li key={id}>
                      <button
                        type="button"
                        title={title}
                        aria-label={title}
                        onClick={() => openChat(id)}
                        className={`${styles.item} ${isActive ? styles.active : ''}`}
                      >
                        <ChatIcon size={17} />
                        <span>{title}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className={styles.account}>
        <button
          type="button"
          className={styles.avatar}
          data-account-menu
          onClick={collapsed ? openMenu : undefined}
          title={`${username} (${email})`}
          aria-label="Account"
          aria-haspopup={collapsed ? 'menu' : undefined}
        >
          {initial}
        </button>
        <div className={styles.userInfo}>
          <strong>{username}</strong>
          <span>{email}</span>
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
        <Link to="/terms">Terms of Use</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/cookie-policy">Cookies</Link>
      </footer>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={openChat}
        activeId={activeId}
        sessions={chatSessions}
      />
    </aside>
  )
}

export default Sidebar
