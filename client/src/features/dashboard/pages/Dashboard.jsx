import { Navigate, useParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import Composer from '../components/Composer'
import ResponseCard from '../../battle mode/components/ResponseCard'
import JudgePanel from '../../battle mode/components/JudgePanel'
import { DEFAULT_CHAT_ID, getConversation } from '../data/conversations'
import styles from './Dashboard.module.scss'

const Dashboard = () => {
  const { chatId } = useParams()
  const chat = getConversation(chatId || DEFAULT_CHAT_ID)

  if (!chat) return <Navigate to="/" replace />

  return (
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
  )
}

export default Dashboard
