# AI Support Agent — Internal Tool

An AI-powered support agent built with **Node.js**, **TypeScript**, and **LangChain** that assists internal support teams by answering product questions, managing support tickets, and leveraging user context for intelligent decision-making.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLI Interface                  │
│          (src/index.ts — readline loop)          │
└──────────────────────┬──────────────────────────┘
                       │ user input + chat history
                       ▼
┌─────────────────────────────────────────────────┐
│              LangChain Agent Executor            │
│       (src/agent/agent.ts — orchestration)       │
│                                                  │
│  ┌─────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ System      │  │ Chat       │  │ Agent     │ │
│  │ Prompt      │  │ History    │  │ Scratchpad│ │
│  └─────────────┘  └────────────┘  └───────────┘ │
└──────────┬──────────────┬───────────────┬───────┘
           │              │               │
           ▼              ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  searchDocs  │ │ createTicket │ │getUserContext │
│              │ │              │ │              │
│ Keyword-     │ │ Generates    │ │ Returns plan,│
│ ranked doc   │ │ ticket ID,   │ │ role, recent │
│ search       │ │ validates    │ │ activity     │
└──────────────┘ └──────────────┘ └──────────────┘
   (mock KB)        (mock store)     (mock users)
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| CLI | `src/index.ts` | Interactive readline interface with chat history and tool call display |
| Agent | `src/agent/agent.ts` | LangChain agent executor with system prompt and tool binding |
| searchDocs | `src/tools/searchDocs.ts` | Keyword-ranked search over a mock knowledge base (7 articles) |
| createTicket | `src/tools/createTicket.ts` | Mock ticket creation with auto-generated IDs |
| getUserContext | `src/tools/getUserContext.ts` | Mock user lookup returning plan, role, and recent activity |

### Agent Loop Flow

1. User inputs a natural language message
2. The message (plus conversation history) is sent to the LangChain `AgentExecutor`
3. The LLM decides whether tools are needed based on the system prompt guidelines
4. If tools are needed, the agent calls them with structured arguments and receives results
5. The agent may chain multiple tool calls (e.g., fetch user context → search docs → create ticket)
6. A final natural language response is composed and returned to the user
7. Both the user message and agent response are appended to chat history for context continuity

## Setup

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- An **OpenAI API key** ([platform.openai.com](https://platform.openai.com))

### Installation

```bash
# Clone or navigate to the project directory
cd ai-agent-challenge

# Install dependencies
npm install

# Create your environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-...
```

### Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `OPENAI_API_KEY` | (required) | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |

## Usage

```bash
# Start the agent
npm start
```

Once running, type natural language messages at the `You:` prompt. The agent will display any tool calls it makes, then provide a response.

### Available Commands

| Command | Description |
|---------|-------------|
| `help` | Show available commands and example queries |
| `quit` | Exit the agent |

### Mock User IDs for Testing

| User ID | Name | Plan | Role |
|---------|------|------|------|
| `user-1` | Alice Johnson | Enterprise | Admin |
| `user-2` | Bob Smith | Free | Member |
| `user-3` | Carol Davis | Pro | Admin |
| `user-4` | Dan Martinez | Enterprise | Member |

## Example Executions

### 1. Simple Documentation Query

```
You: How do I reset my password?

  --- Agent Tool Calls ---
  [searchDocs] called with: {"query":"reset password"}
  Result (preview):
    { "results": [{ "id": "doc-1", "title": "Password Reset Guide", ... }], ... }
  ---

Agent: To reset your password, follow these steps:
  1. Go to **Settings > Security > Reset Password**
  2. Click **Send Reset Link**
  3. Check your email for the reset link (it expires in 24 hours)
  4. If you don't receive the email, check your spam folder

Note: After 5 failed login attempts, your account is temporarily locked for 30 minutes.
```

### 2. Issue Requiring a Ticket

```
You: The app keeps crashing after login.

  --- Agent Tool Calls ---
  [searchDocs] called with: {"query":"app crashing after login"}
  Result (preview):
    { "results": [{ "id": "doc-3", "title": "Troubleshooting Login & App Crashes", ... }], ... }
  ---

Agent: Here are some troubleshooting steps for app crashes after login:
  1. Clear your browser cache and cookies
  2. Try using incognito/private browsing mode
  3. Make sure you're using a supported browser (Chrome, Firefox, Edge, Safari)
  4. Check the service status page for any reported outages
  5. Try disabling browser extensions

If the issue persists after trying these steps, I can create a support ticket for further investigation. Would you like me to do that?
```

### 3. Urgent Issue with User Context

```
You: User user-1 is blocked from billing and this is urgent.

  --- Agent Tool Calls ---
  [getUserContext] called with: {"userId":"user-1"}
  Result (preview):
    { "found": true, "userId": "user-1", "name": "Alice Johnson",
      "plan": "enterprise", "role": "admin", ... }
  ---
  [searchDocs] called with: {"query":"billing blocked access"}
  Result (preview):
    { "results": [{ "id": "doc-2", "title": "Billing & Subscription Management", ... }], ... }
  ---
  [createTicket] called with: {"title":"Enterprise admin blocked from billing access","priority":"high"}
  Result (preview):
    { "success": true, "ticketId": "TKT-1001", "priority": "high", ... }
  ---

Agent: I've looked into this for Alice Johnson (Enterprise Admin). She has recent billing
activity, so this appears to be an ongoing issue. I've created a high-priority ticket:

  **Ticket ID**: TKT-1001
  **Priority**: High (Enterprise admin, urgent blocking issue)

In the meantime, Enterprise customers can also reach their dedicated account manager
for billing support. The billing section is under Settings > Billing.
```

### 4. Explicit Ticket Creation

```
You: Create a support ticket for this issue.

  --- Agent Tool Calls ---
  [createTicket] called with: {"title":"App crashing after login","priority":"medium"}
  Result (preview):
    { "success": true, "ticketId": "TKT-1002", ... }
  ---

Agent: I've created a support ticket for the login crash issue:

  **Ticket ID**: TKT-1002
  **Priority**: Medium

The support team will investigate and follow up. Is there anything else I can help with?
```

## Design Decisions & Trade-offs

### 1. LangChain's `createToolCallingAgent` over ReAct

**Decision**: Used `createToolCallingAgent` with OpenAI's native tool calling instead of a ReAct-style agent.

**Why**: OpenAI's tool calling API provides structured, reliable tool invocation with proper argument validation. ReAct relies on text parsing which is more error-prone. The trade-off is tighter coupling to OpenAI, but for a production system, reliability outweighs provider flexibility.

### 2. Keyword-Based Mock Search over Embeddings

**Decision**: Used weighted keyword matching for `searchDocs` instead of vector/embedding-based search.

**Why**: For a mock with 7 documents, keyword matching is deterministic, fast, and doesn't require an embedding model. In production, this would be replaced with a vector store (e.g., Pinecone, Chroma) for semantic search. The mock preserves the same tool interface, making the swap straightforward.

### 3. Stateful Chat History in Memory

**Decision**: Chat history is stored as an in-memory array of `HumanMessage`/`AIMessage` objects.

**Why**: Sufficient for a CLI session and keeps the implementation simple. In production, you'd use a persistent store (Redis, database) with session management. LangChain's `RunnableWithMessageHistory` could plug in directly.

### 4. System Prompt–Driven Priority Logic

**Decision**: Priority determination is guided by the system prompt rather than hard-coded rules.

**Why**: Letting the LLM reason about priority based on user context and urgency language is more flexible than rigid rules. It handles edge cases naturally (e.g., a free user with a critical blocking issue). The trade-off is less predictability — in production, you might combine LLM reasoning with rule-based guardrails.

### 5. Temperature 0 for Determinism

**Decision**: LLM temperature set to 0.

**Why**: For a support agent, consistent and predictable responses are more important than creative variation. This also makes testing and evaluation more reliable.

### 6. `maxIterations: 6` Safety Limit

**Decision**: The agent is limited to 6 tool-calling iterations per request.

**Why**: Prevents runaway loops if the LLM gets stuck in a cycle. For this use case, no request should need more than 3-4 tool calls (fetch context → search docs → create ticket → done). The limit of 6 provides headroom while keeping costs controlled.

## Potential Improvements

- **Vector search**: Replace keyword matching with embedding-based retrieval for semantic understanding
- **Streaming responses**: Use LangChain's streaming API for real-time token output
- **HTTP API**: Add an Express/Fastify server alongside the CLI for integration with other systems
- **Persistent memory**: Store conversation history in Redis or a database for multi-session continuity
- **Observability**: Add LangSmith tracing for monitoring agent decisions in production
- **Input validation**: Add middleware to sanitize and validate user input before agent processing
- **Rate limiting**: Per-user rate limiting for the API interface
- **Testing**: Unit tests for tools, integration tests for the agent loop with mocked LLM responses
