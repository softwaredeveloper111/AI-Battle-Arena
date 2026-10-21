import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Brand from '../../../components/Brand'
import PixelCluster from '../../../components/PixelCluster'
import {
  PillarLogo,
  BoltIcon,
  BrainIcon,
  NodesIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
} from '../../../components/Icons'
import {
  GoogleButton,
  LanguageSelect,
  OrDivider,
  SwitchAuth,
} from '../components/AuthElements'
import landscape from '../../../assets/login-landscape.jpg'
import styles from './LoginPage.module.scss'
import SpinnerLoader from '../../../components/SpinnerLoader'
import useAuth from '../hooks/useAuth'
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from '../schemas/auth.schema'
import ResendVerificationModal from '../components/ResendVerificationModal'


const FEATURES = [
  { icon: BoltIcon, title: 'Multi-Agent Battles', text: 'Pit AI agents against each other' },
  { icon: BrainIcon, title: 'Smart Agents', text: 'Solve complex problems with AI' },
  { icon: NodesIcon, title: 'Build & Explore', text: 'Discover, experiment, and create' },
]

const LoginPage = () => {

  const { isLoading, loginUserHandler } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showResendModal, setShowResendModal] = useState(false);
   
   const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    const { email, password } = data;

    if (email && password) {
      const res = await loginUserHandler(email, password);

      if (res) {
        reset();
        navigate("/", { replace: true });
      }
    }
  };

  const onError = (errors) => {
    const firstError = Object.values(errors)[0];

    if (firstError?.message) {
      toast.error(firstError.message);
    }
  };

  if (isLoading) {
    return <SpinnerLoader />
  }

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

          <form className={styles.form} onSubmit={handleSubmit(onSubmit, onError)} noValidate>
            {/* Email input field */}
            <div className={styles.field}>
              <label htmlFor="login-email" className={styles.label}>
                Email
              </label>
              <div className={styles.inputWrap}>
                <MailIcon size={17} className={styles.leadIcon} />
                <input
                  {...register("email")}
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className={styles.input}
                  autoComplete="email"
                  required
                />
              </div>
              {errors.email && <span className={styles.errors}>{errors.email.message}</span>}
            </div>

            {/* Password input field with eye toggle */}
            <div className={styles.field}>
              <label htmlFor="login-password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrap}>
                <LockIcon size={17} className={styles.leadIcon} />
                <input
                  {...register("password")}
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={styles.input}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.eye}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeIcon size={17} /> : <EyeOffIcon size={17} />}
                </button>
              </div>
              {errors.password && <span className={styles.errors}>{errors.password.message}</span>}
            </div>

            <div className={styles.forgotRow}>
              <Link to="#" id="forgot-password-link" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            <div className={styles.submitRow}>
              <button type="submit" id="login-submit-btn" className={styles.submit}>
                <span>Sign in</span>
                <ArrowRightIcon size={18} className={styles.submitArrow} />
              </button>
            </div>
          </form>

          <SwitchAuth text="Don't have an account?" linkText="Sign up" to="/signup" />

          <div className={styles.verificationWrap}>
            <p className={styles.verificationText}>Didn&apos;t receive verification email?</p>
            <button type="button" onClick={() => setShowResendModal(true)}  className={styles.verificationLink}>
              Resend verification email
            </button>
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

      
      {showResendModal && (
        <ResendVerificationModal onClose={() => setShowResendModal(false)} />
      )}
    </main>
  )
}

export default LoginPage
