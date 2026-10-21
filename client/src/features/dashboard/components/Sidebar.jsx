import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useMatch, Link } from 'react-router-dom'
import SearchModal from './SearchModal'
import RenameModal from './RenameModal'
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
import { LoaderCircle, Pin, Pencil, Trash2 } from 'lucide-react'
import useAuth from '../../auth/hooks/useAuth'
import useBattle from '../hooks/useBattle'
import styles from './Sidebar.module.scss';
import SpinnerLoader from "../../../components/SpinnerLoader";

const Sidebar = () => {
  const { user, logoutHandler , isLoading } = useAuth()
  const {
    chatSessions,
    chatSessionsLoading,
    isCreatingNewChat,
    fetchChatSessionsHandler,
    pinChatHandler,
    renameChatHandler,
    deleteChatHandler,
  } = useBattle()

  useEffect(() => {
    fetchChatSessionsHandler()
  }, [fetchChatSessionsHandler])

  const groupedSessions = useMemo(() => {
    const groups = groupChatSessionsByDate(chatSessions)
    if (isCreatingNewChat) {
      const todayGroup = groups.find((g) => g.label === 'Today')
      if (!todayGroup) {
        const pinnedIndex = groups.findIndex((g) => g.label === 'Pinned')
        const newToday = { label: 'Today', items: [] }
        if (pinnedIndex !== -1) {
          groups.splice(pinnedIndex + 1, 0, newToday)
        } else {
          groups.unshift(newToday)
        }
      }
    }
    return groups
  }, [chatSessions, isCreatingNewChat])
  
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setMenuPos(null)
    setChatMenuState(null)
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
  const [chatMenuState, setChatMenuState] = useState(null) // { chatId, chatTitle, isPinned, left, top } | null
  const [renameModalChat, setRenameModalChat] = useState(null) // { id, title } | null

  const openMenu = (e) => {
    if (menuPos) return setMenuPos(null)
    const r = e.currentTarget.getBoundingClientRect()
    setMenuPos({ left: r.right + 10, bottom: window.innerHeight - r.bottom })
  }

  // close account menu on outside click / Escape
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

  // close chat actions popup on outside click / Escape
  useEffect(() => {
    if (!chatMenuState) return
    const onDown = (e) => {
      if (!e.target.closest('[data-chat-actions-menu]')) {
        setChatMenuState(null)
      }
    }
    const onKey = (e) => e.key === 'Escape' && setChatMenuState(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [chatMenuState])

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
    setChatMenuState(null)
    navigate(`/chat/${id}`)
  }

  const handleOpenChatMenu = (e, chat) => {
    e.stopPropagation()
    const id = chat._id || chat.id
    if (chatMenuState?.chatId === id) {
      setChatMenuState(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const top = rect.top + 130 > window.innerHeight ? rect.bottom - 130 : rect.top
    setChatMenuState({
      chatId: id,
      chatTitle: chat.title || 'Untitled Battle',
      isPinned: !!chat.isPinned,
      left: rect.right + 6,
      top,
    })
  }

  const handlePinClick = async () => {
    if (!chatMenuState) return
    const id = chatMenuState.chatId
    setChatMenuState(null)
    await pinChatHandler(id)
  }

  const handleRenameClick = () => {
    if (!chatMenuState) return
    const { chatId, chatTitle } = chatMenuState
    setChatMenuState(null)
    setRenameModalChat({ id: chatId, title: chatTitle })
  }

  const handleDeleteClick = async () => {
    if (!chatMenuState) return
    const id = chatMenuState.chatId
    setChatMenuState(null)
    await deleteChatHandler(id)
    if (activeId === id) {
      navigate('/new')
    }
  }

  const username = user?.username || user?.email?.split('@')[0] || 'User'
  const email = user?.email || ''
  const initial = username.charAt(0).toUpperCase()

  return (
    <>
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
        {chatSessionsLoading ? (
          <div className={styles.loadingState}>
            <LoaderCircle size={20} strokeWidth={2.2} />
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
                {group.label === 'Today' && isCreatingNewChat && (
                  <li key="loading-new-chat-title">
                    <div className={`${styles.item} ${styles.active} ${styles.titleLoadingItem}`}>
                      <div className={styles.itemMain}>
                        <ChatIcon size={17} className={styles.chatIcon} />
                        <span className={styles.titleLoadingText}>Generating title...</span>
                        <LoaderCircle size={14} className={styles.titleLoader} />
                      </div>
                    </div>
                  </li>
                )}
                {group.items.map((chat) => {
                  const id = chat._id || chat.id
                  const title = chat.title || 'Untitled Battle'
                  const isActive = id === activeId
                  const isMenuOpen = chatMenuState?.chatId === id

                  return (
                    <li key={id}>
                      <div className={`${styles.item} ${isActive ? styles.active : ''}`}>
                        <button
                          type="button"
                          title={title}
                          aria-label={title}
                          onClick={() => openChat(id)}
                          className={styles.itemMain}
                        >
                          <ChatIcon size={17} className={styles.chatIcon} />
                          <span>{title}</span>
                          {chat.isPinned && <Pin size={12} className={styles.pinIcon} />}
                        </button>
                        <button
                          type="button"
                          data-chat-actions-menu
                          aria-label="Chat options"
                          title="Chat options"
                          onClick={(e) => handleOpenChatMenu(e, chat)}
                          className={`${styles.chatMenuBtn} ${isMenuOpen ? styles.menuOpen : ''}`}
                        >
                          <MoreVerticalIcon size={16} />
                        </button>
                      </div>
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

      {/* Account Popup */}
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

      {/* Chat Actions Popup (Pinned, Rename, Delete) */}
      {chatMenuState && (
        <div
          className={styles.chatActionsPopup}
          data-chat-actions-menu
          role="menu"
          style={{ left: chatMenuState.left, top: chatMenuState.top }}
        >
          <button
            type="button"
            role="menuitem"
            className={styles.chatActionItem}
            onClick={handlePinClick}
          >
            <Pin size={14} />
            <span>{chatMenuState.isPinned ? 'Unpin chat' : 'Pinned chat'}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.chatActionItem}
            onClick={handleRenameClick}
          >
            <Pencil size={14} />
            <span>Rename chat</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${styles.chatActionItem} ${styles.deleteAction}`}
            onClick={handleDeleteClick}
          >
            <Trash2 size={14} />
            <span>Delete chat</span>
          </button>
        </div>
      )}

      {/* Rename Modal */}
      <RenameModal
        open={!!renameModalChat}
        title={renameModalChat?.title}
        onClose={() => setRenameModalChat(null)}
        onSave={async (newTitle) => {
          if (renameModalChat?.id) {
            await renameChatHandler(renameModalChat.id, newTitle)
          }
          setRenameModalChat(null)
        }}
      />

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
    {isLoading && <SpinnerLoader />}
  </>
  )
}

export default Sidebar
