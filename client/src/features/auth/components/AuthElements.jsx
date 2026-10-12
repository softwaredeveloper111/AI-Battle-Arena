import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  ChevronDownIcon,
  EyeOffIcon,
  GlobeIcon,
  GoogleIcon,
} from '../../../components/Icons'
import styles from './AuthElements.module.scss'

/* Language selector (top-right) */
export const LanguageSelect = ({ className = '' }) => (
  <button type="button" id="language-select" className={`${styles.lang} ${className}`}>
    <GlobeIcon size={15} />
    <span>English</span>
    <ChevronDownIcon size={14} />
  </button>
)

/* "Continue with Google" gold-outlined button */
export const GoogleButton = ({ id = 'google-auth-btn' }) => (
  <button type="button" id={id} className={styles.google}>
    <GoogleIcon size={22} />
    <span>Continue with Google</span>
  </button>
)

/* ---- OR ---- divider */
export const OrDivider = () => (
  <div className={styles.divider}>
    <span>OR</span>
  </div>
)

/* Labelled input with leading icon and optional trailing eye icon */
export const AuthInput = ({ id, label, type = 'text', placeholder, icon: Icon, trailingEye = false }) => (
  <div className={styles.field}>
    <label htmlFor={id} className={styles.label}>
      {label}
    </label>
    <div className={styles.inputWrap}>
      {Icon && <Icon size={17} className={styles.leadIcon} />}
      <input id={id} type={type} placeholder={placeholder} className={styles.input} autoComplete="off" />
      {trailingEye && (
        <button type="button" className={styles.eye} aria-label="Toggle password visibility">
          <EyeOffIcon size={17} />
        </button>
      )}
    </div>
  </div>
)

/* Primary gold submit button with trailing arrow */
export const SubmitButton = ({ id, children }) => (
  <button type="submit" id={id} className={styles.submit}>
    <span>{children}</span>
    <ArrowRightIcon size={18} className={styles.submitArrow} />
  </button>
)

/* "Don't have an account? Sign up" line */
export const SwitchAuth = ({ text, linkText, to }) => (
  <p className={styles.switch}>
    {text} <Link to={to}>{linkText}</Link>
  </p>
)
