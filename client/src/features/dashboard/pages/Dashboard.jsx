import { Navigate, useMatch, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import Composer from '../components/Composer'
import ResponseCard from '../components/ResponseCard'
import JudgePanel from '../components/JudgePanel'
import { SwordsIcon } from '../../../components/Icons'
import { CONVERSATIONS, DEFAULT_CHAT_ID, getConversation } from '../data/conversations'
import styles from './Dashboard.module.scss'

const SUGGESTIONS = CONVERSATIONS.slice(0, 4)

/* Empty "New Chat" content */
const NewChatContent = () => {
  const navigate = useNavigate()

  return (
    <section className={styles.dashboard}>
      <Topbar title="New Chat" />

      <div className={styles.newChat}>
        <span className={styles.newChatIcon}>
          <SwordsIcon size={30} />
        </span>
        <h1>What do you want to battle today?</h1>
        <p>Ask anything and watch two AI models compete while a judge picks the winner.</p>

        <div className={styles.suggestions}>
          {SUGGESTIONS.map((c) => (
            <button key={c.id} type="button" className={styles.suggestion} onClick={() => navigate(`/chat/${c.id}`)}>
              {c.prompt}
            </button>
          ))}
        </div>
      </div>

      <Composer placeholder="Ask anything to start a battle..." />
    </section>
  )
}

const Dashboard = () => {
  const { chatId } = useParams()
  const isNew = !!useMatch('/new')
  const chat = getConversation(chatId || DEFAULT_CHAT_ID)

  if (!isNew && !chat) return <Navigate to="/" replace />

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        {isNew ? (
          <NewChatContent />
        ) : (
          <section className={styles.dashboard}>
            <Topbar title={chat.title} />

            <div className={styles.battleConversation} key={chat.id}>
              <div className={styles.promptRow}>
                <p className={styles.prompt}>{chat.prompt}</p>
              </div>

              <div className={styles.responses}>
                <ResponseCard label="Response A" paragraphs={chat.responseA} />
                <ResponseCard label="Response B" paragraphs={chat.responseB} />
              </div>

              <JudgePanel judge={chat.judge} />
            </div>

            <Composer placeholder="Ask a follow-up..." />
          </section>
        )}
      </main>
    </div>
  )
}

export default Dashboard
