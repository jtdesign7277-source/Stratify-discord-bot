#!/usr/bin/env node
// Post announcements to Discord from CLI or cron
// Usage: node announce.js "Your announcement text" [channel-name]

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1473541777829925078';
const API = 'https://discord.com/api/v10';

const headers = {
  Authorization: `Bot ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function main() {
  const text = process.argv[2];
  const channelName = process.argv[3] || 'announcements';

  if (!text) {
    console.error('Usage: node announce.js "message" [channel-name]');
    process.exit(1);
  }

  // Get channels
  const res = await fetch(`${API}/guilds/${GUILD_ID}/channels`, { headers });
  const channels = await res.json();
  const channel = channels.find((c) => c.name === channelName && c.type === 0);

  if (!channel) {
    console.error(`Channel #${channelName} not found`);
    process.exit(1);
  }

  // Send message
  const msgRes = await fetch(`${API}/channels/${channel.id}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: text }),
  });

  if (msgRes.ok) {
    console.log(`✅ Posted to #${channelName}`);
  } else {
    console.error('❌ Failed:', await msgRes.text());
  }
}

main().catch(console.error);
