import LegalPage from "./Legalpage";
import { APP_NAME, CONTACT_EMAIL, UPDATED } from "../config/legal.config";

const sections = [
  {
    h: "1. What are cookies?",
    p: [
      "Cookies are small text files placed on your computer or mobile device when you browse websites. They are widely used to make websites work efficiently, remember your preferences, and maintain secure logged-in sessions.",
      `This Cookie Policy explains how ${APP_NAME} uses cookies and similar technologies (such as local storage) when you access our platform.`,
    ],
  },
  {
    h: "2. How we use cookies",
    p: [
      `${APP_NAME} adheres to a privacy-first approach. We strictly use cookies necessary for operating the service securely.`,
    ],
    list: [
      "We do not use tracking or advertising cookies.",
      "We do not sell your data or share your browsing habits with ad networks.",
      "All cookies set directly by our platform are strictly necessary for core functionality and security.",
    ],
  },
  {
    h: "3. Cookies and technologies we use",
    list: [
      "Authentication Token (token): A secure, HTTP-only cookie that keeps you signed in to your account. Because it is marked HttpOnly and Secure, it cannot be accessed or stolen by malicious client-side scripts.",
      "Session Security & CSRF: Used to protect your account against cross-site request forgery and unauthorized API access.",
      "Local Storage (Preferences): We may store non-sensitive UI settings (such as theme preferences, sidebar state, or active conversation layout) directly in your browser's local storage so your experience remains seamless across page refreshes.",
    ],
  },
  {
    h: "4. Third-party integrations",
    p: [
      "If you choose to authenticate via Google Sign-In or connect external Google services (such as Gmail, Google Calendar, or Google Drive), Google may use cookies on their domains to manage your authentication session.",
      "These third-party cookies are governed by the respective provider's privacy policy and cookie settings. We do not control or access Google's cookies.",
    ],
  },
  {
    h: "5. How to control or disable cookies",
    p: [
      "You can manage or delete cookies at any time through your browser settings. You can configure your browser to block all cookies or to alert you when cookies are being sent.",
      "Please note: Because our authentication relies on a secure session cookie, blocking all cookies will prevent you from signing in and accessing authenticated features on the platform.",
    ],
  },
  {
    h: "6. Updates to this policy",
    p: [
      "We may update this Cookie Policy from time to time to reflect operational or security changes. We encourage you to review this page periodically to stay informed.",
    ],
  },
  {
    h: "7. Contact us",
    p: [
      `If you have any questions about our use of cookies or your privacy rights, please reach out to us at: ${CONTACT_EMAIL}`,
    ],
  },
];

export default function CookiePolicyPage() {
  return <LegalPage title="Cookie Policy" updated={UPDATED} sections={sections} />;
}