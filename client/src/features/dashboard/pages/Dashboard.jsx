import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useMatch } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import Composer from '../components/Composer'
import ResponseCard from '../components/ResponseCard'
import JudgePanel from '../components/JudgePanel'
import RenameModal from '../components/RenameModal'
import { SwordsIcon } from '../../../components/Icons'
import useBattle from '../hooks/useBattle'
import styles from './Dashboard.module.scss'

const SUGGESTIONS = [
  'Explain how gravity works simply',
  'Write a Python script to scrape a website',
  'Compare SQL vs NoSQL databases',
  'Plan a 3-day travel itinerary for Tokyo',
]

const Dashboard = () => {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const isNew = !!useMatch('/new')
  const chatContainerRef = useRef(null)
  const [renameOpen, setRenameOpen] = useState(false)

  const {
    messages,
    messagesLoading,
    activeSession,
    isBattleRunning,
    streamStatus,
    streamingProblem,
    streamingSolution1,
    streamingSolution2,
    modelErrors,
    connectBattleSocket,
    executeBattleHandler,
    fetchMessagesHandler,
    renameChatHandler,
    clearMessages,
  } = useBattle()

  // Connect socket.io once for live LLM token streaming
  useEffect(() => {
    const cleanup = connectBattleSocket()
    return cleanup
  }, [connectBattleSocket])

  // Load chat messages when chatId param changes
  useEffect(() => {
    if (chatId) {
      fetchMessagesHandler(chatId)
    } else {
      clearMessages()
    }
  }, [chatId, fetchMessagesHandler, clearMessages])

  // Auto scroll to bottom when new tokens or messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, streamingSolution1, streamingSolution2, isBattleRunning])

  const handleSend = async (problemText) => {
    if (!problemText?.trim() || isBattleRunning) return
    const result = await executeBattleHandler(problemText.trim(), chatId || null)
    if (result?.data?.chatId && !chatId) {
      navigate(`/chat/${result.data.chatId}`, { replace: true })
    }
  }

  const showWelcome = (!chatId || isNew) && messages.length === 0 && !isBattleRunning
  const title =
    activeSession?.title ||
    (messages[0]?.problem ? messages[0].problem : isNew ? 'New Battle' : 'Battle Arena')

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <section className={styles.dashboard}>
          <Topbar
            title={title}
            onRename={chatId && activeSession ? () => setRenameOpen(true) : undefined}
          />

          {messagesLoading && messages.length === 0 && !isBattleRunning ? (
            <div className={styles.centerLoading}>
              <LoaderCircle size={28} />
              <span>Loading battle...</span>
            </div>
          ) : showWelcome ? (
            <div className={styles.newChat}>
              <span className={styles.newChatIcon}>
                <SwordsIcon size={30} />
              </span>
              <h1>What do you want to battle today?</h1>
              <p>Ask anything and watch two AI models compete while an AI judge picks the winner.</p>

              <div className={styles.suggestions}>
                {SUGGESTIONS.map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.suggestion}
                    onClick={() => handleSend(promptText)}
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.battleConversation} ref={chatContainerRef}>
              {/* Completed turns from database */}
              {messages.map((turn, index) => (
                <div key={turn._id || index} className={styles.turnBlock}>
                  <div className={styles.promptRow}>
                    <p className={styles.prompt}>{turn.problem}</p>
                  </div>

                  <div className={styles.responses}>
                    <ResponseCard label="Assistant A" content={turn.solution_1} />
                    <ResponseCard label="Assistant B" content={turn.solution_2} />
                  </div>

                  {turn.judge && <JudgePanel judge={turn.judge} />}
                </div>
              ))}

              {/* In-progress streaming turn via Socket.IO */}
              {isBattleRunning && (
                <div className={styles.turnBlock}>
                  <div className={styles.promptRow}>
                    <p className={styles.prompt}>{streamingProblem}</p>
                  </div>

                  <div className={styles.responses}>
                    <ResponseCard
                      label="Assistant A"
                      content={streamingSolution1}
                      isStreaming={!streamingSolution1}
                      error={modelErrors?.solution_1}
                    />
                    <ResponseCard
                      label="Assistant B"
                      content={streamingSolution2}
                      isStreaming={!streamingSolution2}
                      error={modelErrors?.solution_2}
                    />
                  </div>

                  {streamStatus && (
                    <div className={styles.streamingStatus}>
                      <span className={styles.statusDot} />
                      <span>{streamStatus}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Composer
            placeholder={
              isBattleRunning
                ? 'AI models are battling...'
                : messages.length > 0
                  ? 'Ask a follow-up...'
                  : 'Ask anything to start a battle...'
            }
            onSend={handleSend}
            disabled={isBattleRunning}
          />

          <RenameModal
            open={renameOpen}
            title={activeSession?.title}
            onClose={() => setRenameOpen(false)}
            onSave={async (newTitle) => {
              if (chatId) {
                await renameChatHandler(chatId, newTitle)
              }
              setRenameOpen(false)
            }}
          />
        </section>
      </main>
    </div>
  )
}

export default Dashboard
