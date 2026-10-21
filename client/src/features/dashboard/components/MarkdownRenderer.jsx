import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import { CopyIcon, CheckIcon } from '../../../components/Icons'
import styles from './MarkdownRenderer.module.scss'

const CodeBlock = ({ language, codeString }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  let highlighted = ''
  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(codeString, { language }).value
    } else {
      highlighted = hljs.highlightAuto(codeString).value
    }
  } catch {
    highlighted = codeString
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.languageBadge}>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={styles.copyBtn}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <CheckIcon size={13} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon size={13} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className={styles.pre}>
        <code
          className={`hljs ${language ? `language-${language}` : ''}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  )
}

const MarkdownRenderer = ({ content }) => {
  if (!content) return null

  return (
    <div className={styles.markdownContainer}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const codeString = String(children).replace(/\n$/, '')
            const isMultiline = codeString.includes('\n')

            if (match || isMultiline) {
              return (
                <CodeBlock
                  language={match ? match[1] : ''}
                  codeString={codeString}
                />
              )
            }

            return (
              <code className={styles.inlineCode} {...props}>
                {children}
              </code>
            )
          },
          pre({ children }) {
            return <>{children}</>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default React.memo(MarkdownRenderer)
