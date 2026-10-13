# AI Battle ARENA --- Software Requirements Specification (SRS)

**Purpose:** A compact product and implementation guide for the
developer and AI coding agents.\
**Status:** Requirements agreed; implementation details may be refined
when needed.

## 1. Product Overview

AI Battle ARENA is an AI application with two modes:

-   **Battle Mode:** Two backend-selected LLMs independently answer the
    user's request. An AI Judge scores and compares both answers, then
    declares a winner.
-   **Agent Mode:** A general-purpose AI agent handles tasks and decides
    which available tools or integrations to use.

Users must log in. Conversations are saved and shown in the left
sidebar.

## 2. Technology Stack

-   **Frontend:** React, React Router DOM, SCSS Modules
-   **Backend:** Node.js, Express, MongoDB (MERN)
-   **AI orchestration:** LangGraph.js and LangChain.js
-   Use the existing project conventions where available; avoid
    unnecessary abstractions.

## 3. UI / UX Requirements

Use the **finalized black-and-gold AI Battle ARENA mockup** as the
visual reference.

-   Keep the same overall structure: left sidebar, top bar with
    Battle/Agent switch, conversation area, and bottom composer.
-   Use the black background with gold/yellow accents, clear contrast,
    rounded panels, and consistent spacing.
-   Sidebar: New Chat, Search, grouped chat history, user account, and a
    small footer with **Terms of Use, Privacy Policy, Cookies**.
-   The user's prompt appears above the AI response area as **plain text
    only**---no avatar, logo, timestamp, or double ticks.
-   Do not add a tool/mode dropdown to the composer. The selected mode
    determines the workflow; the system chooses tools automatically.
-   Keep the interface responsive and readable on smaller screens.

## 4. Battle Mode

1.  User submits a text prompt or supported file.
2.  Two hidden backend LLMs independently process the same request. Do
    not reveal their actual model names to the user.
3.  Each LLM may decide to call relevant available tools, such as web
    search, code execution, or file analysis.
4.  Display the answers side by side as **Response A** and **Response
    B**.
5.  Show a copy icon on each response card.
6.  Send both answers to the AI Judge.
7.  Display the judge result in the format defined below. Do **not**
    show user voting/feedback buttons.

### AI Judge output and UI

Expected judge data:

-   `solution_1_score`
-   `solution_2_score`
-   `solution_1_reasoning`
-   `solution_2_reasoning`

Judge panel layout:

1.  Header: judge icon + **AI Judge**
2.  Winner row: trophy icon + **Response A is winner** or **Response B
    is winner**
3.  Two columns:
    -   **Solution 1 Score** (`solution_1_score` / 10) + **Reasoning**
        (`solution_1_reasoning`)
    -   **Solution 2 Score** (`solution_2_score` / 10) + **Reasoning**
        (`solution_2_reasoning`)

Use the higher score to determine the winner. If scores tie, show a tie
rather than inventing a winner. The reasoning must explain why each
answer received its score.

## 5. Agent Mode

-   Provide one general-purpose agent for research, writing, coding,
    file-based tasks, and other supported requests.
-   The agent chooses tools automatically based on the task; users do
    not need to select tools from a dropdown.
-   Show one assistant response in the conversation.
-   Provide access to the supported AI tools and external integrations
    listed below.

## 6. Tools and Integrations

### AI tools

-   Web search
-   Code execution / coding assistance
-   File analysis

Models/agents may choose tools when useful. Do not call tools
unnecessarily.

### External integrations

Include the integrations shown in the approved UI:

-   GitHub
-   Google Drive
-   Google Docs
-   Notion
-   Gmail
-   Linear
-   Google Calendar

Also support **Slack** as an external integration, even though it is not
shown in the current mockup. Do not add a Slack button to the UI unless
the UI requirements are updated.

Integrations must be connected and authorized by the user before
accessing their data or performing actions. Respect each provider's
permissions and available API capabilities.

## 7. Accounts, History, and Uploads

-   Login is required to use the application.
-   Save conversations to the authenticated user's account and show them
    in the sidebar, grouped by date.
-   Support uploads of images, PDFs, text files, and code files.
-   Allow users to start a new chat and reopen saved conversations.
-   Keep each user's conversations and connected integrations private to
    that user.

## 8. Essential Behavior and Quality

-   Handle loading states, tool activity, empty states, and readable
    errors.
-   Prevent one user's history or integration data from being exposed to
    another user.
-   Keep secrets and provider API keys on the server, never in frontend
    code.
-   Validate uploaded files and enforce reasonable file-size/type
    limits.
-   Show scores and reasoning returned by the judge; do not fabricate
    them.
-   Prefer simple, maintainable implementation over unnecessary
    features.

## 9. Out of Scope for the Initial Version

-   User voting buttons such as "A is better" or "Both are good".
-   User-facing model selection or model-name disclosure in Battle Mode.
-   Image and video generation as dedicated Battle Mode options.
-   Extra mode/tool dropdowns in the composer.

## 10. Acceptance Checklist

-   [ ] Login is required and chats persist per user.
-   [ ] User prompt appears as plain text above the responses.
-   [ ] Battle Mode shows two anonymous responses side by side, each
    with a copy action.
-   [ ] AI Judge shows both scores, both reasoning fields, and the
    winner/tie.
-   [ ] Agent Mode shows one general-purpose agent response and can
    select tools automatically.
-   [ ] Supported AI tools and approved integrations are
    permission-gated.
-   [ ] Sidebar includes Terms of Use, Privacy Policy, and Cookies.
-   [ ] UI follows the finalized black-and-gold mockup and works
    responsively.







arena.techy.fun
ARENA BATTLE AI frontend — Vercel


arena-api.techy.fun
ARENA BATTLE AI backend — Render


techy.fun
Resend se verification emails