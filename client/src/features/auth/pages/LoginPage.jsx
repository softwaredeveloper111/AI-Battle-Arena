import { Link } from 'react-router-dom'
import Brand from '../../../components/Brand'
import PixelCluster from '../../../components/PixelCluster'
import { PillarLogo, BoltIcon, BrainIcon, NodesIcon, MailIcon, LockIcon } from '../../../components/Icons'
import {
  AuthInput,
  GoogleButton,
  LanguageSelect,
  OrDivider,
  SubmitButton,
  SwitchAuth,
} from '../components/AuthElements'
import landscape from '../../../assets/login-landscape.jpg'
import styles from './LoginPage.module.scss'

const FEATURES = [
  { icon: BoltIcon, title: 'Multi-Agent Battles', text: 'Pit AI agents against each other' },
  { icon: BrainIcon, title: 'Smart Agents', text: 'Solve complex problems with AI' },
  { icon: NodesIcon, title: 'Build & Explore', text: 'Discover, experiment, and create' },
]

const LoginPage = () => {
  return (
    <main className={styles.page}>
      {/* ---------- Left : form ---------- */}
      <section className={styles.left}>
        <span className={`${styles.dots} ${styles.dotsTop}`} aria-hidden />
        <span className={`${styles.dots} ${styles.dotsBottom}`} aria-hidden />

        <header className={styles.header}>
          <Brand size="sm" />
          <LanguageSelect />
        </header>

        <div className={styles.formWrap}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue your AI journey</p>

          <GoogleButton id="login-google-btn" />
          <OrDivider />

          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <AuthInput id="login-email" label="Email" type="email" placeholder="you@example.com" icon={MailIcon} />
            <AuthInput
              id="login-password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={LockIcon}
              trailingEye
            />
            <div className={styles.forgotRow}>
              <Link to="#" id="forgot-password-link" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>
            <div className={styles.submitRow}>
              <SubmitButton id="login-submit-btn">Sign in</SubmitButton>
            </div>
          </form>

          <SwitchAuth text="Don't have an account?" linkText="Sign up" to="/signup" />

          <div className={styles.verificationWrap}>
            <p className={styles.verificationText}>Didn&apos;t receive verification email?</p>
            <Link to="#" id="resend-verification-link" className={styles.verificationLink}>
              Resend verification email
            </Link>
          </div>
        </div>

        <p className={styles.legal}>
          By continuing, I agree to AI BATTLE ARENA&apos;s
          <br />
          <Link to="#">Terms of Use</Link>, <Link to="#">Privacy Policy</Link>, and <Link to="#">Cookie Policy</Link>.
        </p>
      </section>

      {/* ---------- Right : showcase ---------- */}
      <section className={styles.right} style={{ backgroundImage: `url(${landscape})` }}>
        <span className={`${styles.dots} ${styles.dotsRight}`} aria-hidden />
        <PixelCluster variant="fade" cell={6} className={styles.pixels} />

        <div className={styles.showcase}>
          <PillarLogo size={76} className={styles.bigLogo} />
          <h2 className={styles.bigWord}>
            AI BATTLE <span>ARENA</span>
          </h2>
          <p className={styles.tagline}>
            Where AI agents compete, collaborate
            <br />
            and build the future.
          </p>

          <ul className={styles.features}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className={styles.feature}>
                <span className={styles.featureIcon}>
                  <Icon size={18} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
