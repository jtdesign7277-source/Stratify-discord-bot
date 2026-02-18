# Stratify Discord Bot

Full community management bot for the Stratify Trading Discord.

## Features

- **Slash Commands**: `/price`, `/strategy`, `/papertrade`, `/leaderboard`, `/alert`, `/help`
- **Auto-Welcome**: Greets new members with getting-started guide
- **Cashtag Detection**: Mention `$AAPL` and get an instant price reply
- **Market Crons**: Pre-market (9:25 AM ET) and close (4:05 PM ET) snapshots
- **Price Alerts**: Set alerts, get DM'd when triggered
- **Reaction Roles**: React to get channel roles
- **Mission Control API**: REST endpoints to read/write Discord from Mission Control

## API Endpoints (for Mission Control)

All endpoints require `Authorization: Bearer <DISCORD_NOTIFY_SECRET>`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Bot status |
| `/api/channels` | GET | List channels |
| `/api/messages/:channel` | GET | Fetch messages |
| `/api/members` | GET | Member list |
| `/api/stats` | GET | Server stats |
| `/api/send` | POST | Send message |

## Deploy to Railway

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add env vars (see .env.example)
4. Run `node deploy-commands.js` once to register slash commands
