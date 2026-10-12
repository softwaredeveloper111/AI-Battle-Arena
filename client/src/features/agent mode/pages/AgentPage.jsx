import Topbar from '../../dashboard/components/Topbar'
import Composer from '../../dashboard/components/Composer'
import { RobotIcon } from '../../../components/Icons'
import AgentMessage from '../components/AgentMessage'
import IntegrationBar from '../components/IntegrationBar'
import styles from './AgentPage.module.scss'

const AgentPage = () => {
  return (
    <section className={styles.page}>
      <Topbar title="General Agent" subtitle="Your personal AI agent for research, creation and more" />

      <div className={styles.conversation}>
        <div className={styles.userRow}>
          <p className={styles.userBubble}>hello</p>
        </div>

        <AgentMessage>Hello! What can I help you with today?</AgentMessage>
      </div>

      <Composer placeholder="Ask anything to your agent..." modeIcon={RobotIcon} modeLabel="Agent" withCaret>
        <IntegrationBar />
      </Composer>
    </section>
  )
}

export default AgentPage
