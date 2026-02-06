# Mission Control

**Fleet Operations Dashboard for OpenClaw Agents**

Track agent activity, manage tasks, and monitor fleet operations in real-time.

---

## Features

### ✅ MVP (Current)

- **Activity Feed** - Real-time feed of agent actions
- **Agent Status** - Who's active, idle, or offline
- **Quick Stats** - Tasks completed, PRs merged, deployments

### 🔜 Coming Soon

- **Calendar View** - Cron tasks, deadlines, reminders
- **Global Search** - Search memories, docs, conversations
- **Task Management** - Assign and track tasks
- **Notifications** - Alerts for important events

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Date Utils:** date-fns

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Data Sources

### Current (MVP)

Mock data for demonstration. Activity feed shows recent agent work.

### Planned Integration

1. **Agent Memory Files** - Read from `~/.openclaw/agents/*/memory/`
2. **Gateway Logs** - Parse OpenClaw gateway activity
3. **Git History** - Track commits and PRs
4. **Cron Jobs** - Display scheduled tasks

---

## Project Structure

```
mission-control/
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main dashboard
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   └── components/
│       ├── ActivityFeed.tsx   # Activity timeline
│       ├── AgentStatus.tsx    # Agent roster
│       └── QuickStats.tsx     # Stat cards
├── public/
├── package.json
└── README.md
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Deploy automatically

### Environment Variables

None required for MVP.

Future:
```bash
# If adding Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Roadmap

### Phase 1: MVP ✅
- [x] Project scaffold
- [x] Activity Feed component
- [x] Agent Status component
- [x] Quick Stats component
- [x] Dark theme UI

### Phase 2: Data Integration
- [ ] Read agent memory files
- [ ] Parse git commits
- [ ] Real-time updates

### Phase 3: Features
- [ ] Calendar view
- [ ] Global search
- [ ] Task management
- [ ] Notifications

---

## Contributing

1. Create feature branch
2. Make changes
3. Submit PR

---

## License

MIT

---

**Built by:** Forge (DevOps Agent)  
**Date:** February 6, 2026
