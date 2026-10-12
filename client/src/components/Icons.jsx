/* Inline SVG icon set used across the UI (stroke icons inherit currentColor). */

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
})

const make = (paths) => {
  const Icon = ({ size = 18, ...rest }) => (
    <svg {...base(size)} {...rest}>
      {paths}
    </svg>
  )
  return Icon
}

/* ---------- Brand ---------- */
export const PillarLogo = ({ size = 32, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="currentColor" aria-hidden {...rest}>
    <rect x="4" y="5" width="32" height="3.2" rx="1.2" />
    <path d="M6 9.5h28c0 2.6-2.1 4.6-4.7 4.6H10.7C8.1 14.1 6 12.1 6 9.5Z" />
    <circle cx="8.3" cy="12.4" r="3" />
    <circle cx="31.7" cy="12.4" r="3" />
    <circle cx="8.3" cy="12.4" r="1.1" fill="#0a0a0a" />
    <circle cx="31.7" cy="12.4" r="1.1" fill="#0a0a0a" />
    <rect x="11" y="16" width="3" height="17" rx="1" />
    <rect x="16.3" y="16" width="3" height="17" rx="1" />
    <rect x="21.6" y="16" width="3" height="17" rx="1" />
    <rect x="26.9" y="16" width="3" height="17" rx="1" />
    <rect x="8" y="34" width="24" height="2.6" rx="1" />
  </svg>
)

/* ---------- Generic ---------- */
export const GlobeIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>,
)
export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />)
export const ArrowRightIcon = make(<path d="M5 12h14M13 6l6 6-6 6" />)
export const MailIcon = make(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </>,
)
export const LockIcon = make(
  <>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <circle cx="12" cy="15.5" r="1" />
  </>,
)
export const EyeOffIcon = make(
  <>
    <path d="M10.6 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.4 8 2.8 10.2 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.5 4.8-1.3" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </>,
)
export const UserIcon = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </>,
)
export const CheckIcon = make(<path d="m5 12.5 4.5 4.5L19 7.5" />)
export const BoltIcon = make(<path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2Z" />)
export const BrainIcon = make(
  <>
    <path d="M9 4.5a3 3 0 0 0-5 2.2 3 3 0 0 0-1 5.3 3 3 0 0 0 2 4.8A3 3 0 0 0 9 19.5V4.5Z" />
    <path d="M15 4.5a3 3 0 0 1 5 2.2 3 3 0 0 1 1 5.3 3 3 0 0 1-2 4.8 3 3 0 0 1-4 2.7V4.5Z" />
    <path d="M9 9H7M9 14H6.5M15 9h2M15 14h2.5" />
  </>,
)
export const NodesIcon = make(
  <>
    <rect x="3" y="3" width="6" height="6" rx="1.2" />
    <rect x="15" y="3" width="6" height="6" rx="1.2" />
    <rect x="3" y="15" width="6" height="6" rx="1.2" />
    <rect x="15" y="15" width="6" height="6" rx="1.2" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </>,
)
export const GridIcon = make(
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </>,
)
export const PlusCircleIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </>,
)
export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </>,
)
export const ChatIcon = make(
  <>
    <path d="M12 3.5c5 0 9 3.4 9 7.7s-4 7.7-9 7.7c-1 0-2-.1-2.9-.4L4 20.5l1.3-3.8C3.9 15.3 3 13.4 3 11.2 3 6.9 7 3.5 12 3.5Z" />
    <path d="M8.5 11.3h.01M12 11.3h.01M15.5 11.3h.01" strokeWidth="2.4" />
  </>,
)
export const MoreVerticalIcon = make(
  <path d="M12 5h.01M12 12h.01M12 19h.01" strokeWidth="3" />,
)
export const MoreHorizontalIcon = make(
  <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />,
)
export const SwordsIcon = make(
  <>
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
    <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
    <path d="M14.5 6.5 18 3h3v3l-3.5 3.5" />
    <path d="m5 14 4 4M7 17l-3 3M3 19l2 2" />
  </>,
)
export const RobotIcon = make(
  <>
    <rect x="4" y="8" width="16" height="12" rx="4" />
    <path d="M12 4v4M9.5 4h5" />
    <circle cx="9" cy="14" r="1.3" fill="currentColor" />
    <circle cx="15" cy="14" r="1.3" fill="currentColor" />
    <path d="M2 13v3M22 13v3" />
  </>,
)
export const CopyIcon = make(
  <>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </>,
)
export const ThumbUpIcon = make(
  <>
    <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Z" />
    <path d="M7 10 11 3a2.5 2.5 0 0 1 2.5 2.8L13 9.5h5.6a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.3 21H7" />
  </>,
)
export const ThumbDownIcon = make(
  <>
    <path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3Z" />
    <path d="m17 14-4 7a2.5 2.5 0 0 1-2.5-2.8l.5-3.7H5.4a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 6.7 3H17" />
  </>,
)
export const RefreshIcon = make(
  <>
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
    <path d="M4 3.5V8h4.5M4 13a8 8 0 0 0 14.3 4.9L20 16" />
    <path d="M20 20.5V16h-4.5" />
  </>,
)
export const PaperclipIcon = make(
  <path d="m20.5 11.5-8.3 8.3a5.3 5.3 0 0 1-7.5-7.5L13 4a3.5 3.5 0 0 1 5 5l-8.3 8.3a1.8 1.8 0 0 1-2.5-2.5L15 7" />,
)
export const ScanIcon = make(
  <>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M8 12h8" />
  </>,
)
export const SendIcon = make(<path d="M21 3 3 10.5l7 2.5 2.5 7L21 3ZM10 13l4-4" />)
export const ScaleIcon = make(
  <>
    <path d="M12 3v18M7 21h10M5 7h14M12 5V3" />
    <path d="m5 7-3 7a3.5 3.5 0 0 0 6 0L5 7ZM19 7l-3 7a3.5 3.5 0 0 0 6 0l-3-7Z" />
  </>,
)
export const TrophyIcon = ({ size = 24, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...rest}>
    <path d="M7 3h10v2h3.5v2.5A4.5 4.5 0 0 1 16.7 12 5.5 5.5 0 0 1 13 15.1V18h3v3H8v-3h3v-2.9A5.5 5.5 0 0 1 7.3 12 4.5 4.5 0 0 1 3.5 7.5V5H7V3Zm0 4H5.5v.5A2.5 2.5 0 0 0 7.1 9.8 7 7 0 0 1 7 8.5V7Zm10 0v1.5c0 .5 0 .9-.1 1.3a2.5 2.5 0 0 0 1.6-2.3V7H17Z" />
  </svg>
)

/* ---------- Brand / Integrations (multi-color) ---------- */
export const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
  </svg>
)

export const GithubIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden>
    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
  </svg>
)

export const DriveIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#0066DA" d="m2 17.2 1.1 1.9c.2.4.5.7.9.9l3.6-6.2H.4c0 .4.1.9.3 1.3L2 17.2Z" />
    <path fill="#00AC47" d="M12 8.3 8.4 2.1c-.4.2-.7.5-.9.9L.7 14.8c-.2.4-.3.8-.3 1.2h7.2L12 8.3Z" />
    <path fill="#EA4335" d="M20 20c.4-.2.7-.5.9-.9l.4-.7 2-3.4c.2-.4.3-.8.3-1.2h-7.2l1.5 3 2.1 3.2Z" />
    <path fill="#00832D" d="m12 8.3 3.6-6.2c-.4-.2-.8-.3-1.2-.3H9.6c-.4 0-.9.1-1.2.3L12 8.3Z" />
    <path fill="#2684FC" d="M16.4 13.8H7.6L4 20c.4.2.8.3 1.2.3h13.6c.4 0 .9-.1 1.2-.3l-3.6-6.2Z" />
    <path fill="#FFBA00" d="m19.9 8.7-3.3-5.8c-.2-.4-.5-.7-.9-.9L12 8.3l4.4 7.6h7.2c0-.4-.1-.9-.3-1.3l-3.4-5.9Z" />
  </svg>
)

export const DocsIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
    <path fill="#A1C2FA" d="M14.5 2v5.5H20L14.5 2Z" />
    <path fill="#fff" d="M8 11h8v1.4H8zM8 14h8v1.4H8zM8 17h5.5v1.4H8z" />
  </svg>
)

export const NotionIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" />
    <path fill="#111" d="M8 7.5h2l4.3 6.6V7.5H16v9h-1.9L9.7 9.9v6.6H8z" />
  </svg>
)

export const GmailIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M2 6.5v11.3c0 .7.5 1.2 1.2 1.2H6V10L2 6.5Z" />
    <path fill="#34A853" d="M18 19h2.8c.7 0 1.2-.5 1.2-1.2V6.5L18 10v9Z" />
    <path fill="#FBBC04" d="M18 5.2V10l4-3.5V5.6c0-1.6-1.8-2.5-3-1.5l-1 1.1Z" />
    <path fill="#EA4335" d="M6 10V5.2l6 4.6 6-4.6V10l-6 4.6L6 10Z" />
    <path fill="#C5221F" d="M2 5.6v.9L6 10V5.2L5 4.1C3.8 3.1 2 4 2 5.6Z" />
  </svg>
)

export const LinearIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <defs>
      <linearGradient id="linGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7C83FF" />
        <stop offset="1" stopColor="#5E6AD2" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="9.5" fill="url(#linGrad)" />
    <path stroke="#111" strokeWidth="1.3" d="M4 13.5 10.5 20M3.6 10.5l9.9 9.9M4.6 7.5l11.9 11.9M6.5 5.2 18.8 17.5" />
  </svg>
)

export const CalendarIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="2.5" fill="#fff" />
    <path fill="#4285F4" d="M3 5.5A2.5 2.5 0 0 1 5.5 3H18.5A2.5 2.5 0 0 1 21 5.5V7H3z" />
    <path fill="#EA4335" d="M17 21h1.5a2.5 2.5 0 0 0 2.5-2.5V17h-4z" />
    <path fill="#34A853" d="M3 17v1.5A2.5 2.5 0 0 0 5.5 21H7v-4z" />
    <path fill="#FBBC04" d="M17 7h4v10h-4z" />
    <text x="11" y="16.3" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="#1A73E8" fontFamily="Arial">31</text>
  </svg>
)
