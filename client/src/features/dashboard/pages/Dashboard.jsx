import Topbar from '../components/Topbar'
import Composer from '../components/Composer'
import ResponseCard from '../../battle mode/components/ResponseCard'
import JudgePanel from '../../battle mode/components/JudgePanel'
import styles from './Dashboard.module.scss'

/* ---------- Mock data for Battle mode ---------- */
const BATTLE_PROMPT = 'Explain how gravity works'

const RESPONSE_A = [
  'Gravity is the force that attracts objects with mass toward each other. The more mass an object has, the stronger its gravitational pull, and the greater the distance between objects, the weaker the pull.',
  'On Earth, gravity pulls everything toward the center of the planet, which is why things fall down when dropped. The same force keeps the Moon in orbit around Earth and the planets in orbit around the Sun.',
  "In Einstein's theory of general relativity, gravity is not just a force but a result of massive objects bending the fabric of spacetime. Objects move along these curved paths, which we experience as gravity.",
]

const RESPONSE_B = [
  'Gravity is a fundamental force of nature that attracts any two objects with mass. Every object with mass creates a gravitational field, and other objects with mass are pulled toward it. The stronger the mass, the stronger the gravitational pull, and the farther apart the objects are, the weaker the pull.',
  "For example, Earth's gravity pulls you toward its center, which keeps you on the ground. The same force keeps the Moon orbiting Earth and the planets orbiting the Sun.",
  "Einstein's general relativity explains gravity as the curvature of spacetime caused by mass and energy. Massive objects like stars and planets bend spacetime, and other objects follow these curved paths, which we perceive as gravitational attraction.",
]

const JUDGE = {
  solution_1_score: 10,
  solution_2_score: 7,
  solution_1_reasoning:
    "Solution 1 provides a clear, comprehensive, and well-structured explanation of gravity. It covers the basic concept, everyday examples, and Einstein's general relativity, making it accurate, complete, and easy to understand.",
  solution_2_reasoning:
    "Solution 2 is also accurate but less detailed. It correctly explains the basic concept and includes examples, but the explanation is more concise and does not go as deep into Einstein's general relativity or provide as much context as Solution 1.",
}

const Dashboard = () => {
  return (
    <section className={styles.dashboard}>
      <Topbar title={BATTLE_PROMPT} />

      <div className={styles.battleConversation}>
        <div className={styles.promptRow}>
          <p className={styles.prompt}>{BATTLE_PROMPT}</p>
        </div>

        <div className={styles.responses}>
          <ResponseCard label="Response A" paragraphs={RESPONSE_A} />
          <ResponseCard label="Response B" paragraphs={RESPONSE_B} />
        </div>

        <JudgePanel judge={JUDGE} />
      </div>

      <Composer placeholder="Ask a follow-up..." />
    </section>
  )
}

export default Dashboard

