# BeachNap - AI-Powered Team Knowledge

> A Slack clone that transforms your team's chat into a searchable knowledge base with real-time AI synthesis.

**[Live Demo](https://beach-nap.vercel.app)** | **[GitHub](https://github.com/MattGaiser/BeachNap)** | **AskCodi Clone & Remix Week Submission** (Jan 26 - Feb 2, 2026)

*Built with the help of Claude Opus and kimi-k2.5:free*

## Why "BeachNap"?

The name is inspired by Slack—but asks the question: *why are you only slacking and not napping?*

The answer: poor communication habits. Repetitive questions interrupt your flow. Vague "hi" or "hello" messages demand your attention without providing any useful information. You're constantly context-switching instead of relaxing.

**BeachNap fixes this in two ways:**

1. **Never get bothered by answered questions** — Our AI surfaces answers from your team's chat history *before* the question is even sent. If it's been answered before, you're never interrupted at all.

2. **No more meaningless messages** — The Tone Check feature blocks incomplete messages like "hi", "hey", or "quick question?" that distract you but provide zero context. Every message that reaches you is actionable.

### Try It Out

**Knowledge Check** — Type these questions in the #engineering channel to see AI-synthesized answers:
- `How do I deploy?`
- `What database are we using?`
- `How long do auth tokens last?`

**Tone Check** — Try typing these incomplete messages to see the blocking warning:
- `hi`
- `hey`
- `quick question`
- `ping`

## The Clone & Twist

| | |
|---|---|
| **Cloned App** | Slack |
| **AI Twist** | "Preflight" knowledge synthesis - get answers from your team's chat history *before* you even send your question |

## Demo

![BeachNap Screenshot](https://via.placeholder.com/800x400?text=BeachNap+Screenshot)

### How It Works

1. **Type a question** in any channel
2. **AI detects** it's a question (hybrid regex + DeepSeek classification)
3. **Vector search** finds relevant conversations from your team's history
4. **Knowledge synthesis** combines fragmented messages into a clear answer
5. **See the answer** in a "Knowledge Found" card before sending

No more asking "has anyone solved this before?" and waiting hours for a response.

## AskCodi Integration

BeachNap uses **AskCodi's DeepSeek model** (`deepseek-chat`) for two core AI features:

### 1. Smart Question Detection
```typescript
// Hybrid approach: regex for obvious cases, AI for ambiguous ones
const completion = await askcodi.chat.completions.create({
  model: "deepseek-chat",
  messages: [{ role: "system", content: "Classify if this is a question..." }],
  max_tokens: 5,
  temperature: 0,
});
```

### 2. Knowledge Synthesis
```typescript
// Combines conversation fragments into coherent answers
const completion = await askcodi.chat.completions.create({
  model: "deepseek-chat",
  messages: [{ role: "system", content: "You are a knowledge synthesizer..." }],
  max_tokens: 300,
  temperature: 0.3,
});
```

**Why this matters**: Instead of just returning raw search results, BeachNap synthesizes answers that combine information from multiple conversations, note who said what, and highlight when knowledge evolved over time.

## Impact

Traditional team chat is a black hole - knowledge gets buried in endless scroll. BeachNap changes this by:

- **Instant answers**: No waiting for teammates to respond
- **Synthesized knowledge**: AI combines fragmented conversations into clear answers
- **Auto-documentation**: Q&A pairs are automatically saved for future reference
- **Source attribution**: Always know where answers came from

## Features

### Core Slack Features
- Channels with real-time messaging
- Direct messages between users
- Threaded replies
- User presence and avatars
- Click username to start DM

### AI-Powered Features
- Real-time question detection while typing
- Semantic search across all messages (pgvector)
- Knowledge synthesis with source attribution
- Auto-generated documentation library
- Non-blocking message queue

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Database | Supabase (PostgreSQL + pgvector) |
| Real-time | Supabase Realtime |
| AI Synthesis | AskCodi (DeepSeek) |
| Embeddings | OpenAI (text-embedding-3-small) |

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- AskCodi API key
- OpenAI API key (for embeddings)

### Installation

```bash
# Clone the repo
git clone https://github.com/MattGaiser/BeachNap.git
cd BeachNap

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your API keys in .env

# Run the development server
npm run dev
```

### Database Setup

1. Create a new Supabase project
2. Enable the `vector` extension in Database → Extensions
3. Run the schema from `supabase/schema.sql` in the SQL editor

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
ASKCODI_API_KEY=ak-your-askcodi-key
ASKCODI_BASE_URL=https://api.askcodi.com/v1
```

## Project Structure

```
BeachNap/
├── app/
│   ├── api/
│   │   ├── preflight/      # AI knowledge synthesis
│   │   ├── question-detect/ # AI question classification
│   │   ├── messages/       # Message CRUD
│   │   └── dm/             # Direct messages
│   └── (main)/
│       ├── channels/       # Channel views
│       ├── dm/             # DM views
│       └── docs/           # Documentation library
├── components/
│   ├── preflight-card.tsx  # AI answer preview
│   ├── message-input.tsx   # Input with preflight
│   └── ...
├── hooks/
│   ├── use-preflight.ts    # Preflight logic
│   └── use-messages.ts     # Real-time messages
├── lib/
│   ├── askcodi.ts          # AskCodi client
│   ├── embeddings.ts       # OpenAI embeddings
│   └── knowledge-search.ts # Vector search
└── supabase/
    └── schema.sql          # Database schema
```

## License

MIT

---

Built with [AskCodi](https://askcodi.com) for Clone & Remix Week 2026
