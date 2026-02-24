const { Client, GatewayIntentBits, Events, EmbedBuilder, PermissionsBitField } = require('discord.js');

/* ─── Config ─── */
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1473541777829925078';

/* ─── Spam filter ─── */
const SPAM_PATTERNS = [
  /free\s*nitro/i,
  /discord\.gift/i,
  /click\s*here.*free/i,
  /earn\s*\$?\d+.*daily/i,
  /crypto.*airdrop/i,
  /t\.me\//i,
  /bit\.ly.*free/i,
];
const MESSAGE_HISTORY = new Map(); // userId → [timestamps]
const FLOOD_LIMIT = 5; // messages
const FLOOD_WINDOW = 5000; // 5 seconds

/* ─── Stratify FAQ ─── */
const FAQ = [
  { triggers: ['what is stratify', 'what does stratify do', 'what\'s stratify'], answer: '**Stratify** is an AI-powered trading platform that helps you manage your portfolio, execute trades, build strategies, and track P&L — all in one place. Check it out at https://stratify.associates' },
  { triggers: ['how do i sign up', 'how to register', 'create account', 'how to join'], answer: 'Head to **https://stratify.associates** and click Sign Up. You can connect your brokerage account (Alpaca) after registration.' },
  { triggers: ['is it free', 'how much does it cost', 'pricing', 'price'], answer: 'Stratify has a free tier! **Stratify Pro** is $9.99/month for advanced features like AI strategy generation and real-time alerts.' },
  { triggers: ['what broker', 'which broker', 'alpaca', 'connect broker'], answer: 'Stratify currently integrates with **Alpaca** for live trading. Connect your account in the Portfolio page after signing up.' },
  { triggers: ['paper trading', 'paper trade', 'practice', 'demo'], answer: 'Yes! Alpaca supports paper trading. You can practice strategies with fake money before going live.' },
  { triggers: ['is it safe', 'security', 'is my data safe'], answer: 'Your brokerage credentials are encrypted and stored securely via OAuth2. Stratify never has direct access to your broker password.' },
  { triggers: ['who built this', 'who made this', 'developer', 'creator'], answer: 'Stratify was built by **Jeff** — a trader and developer in Boston. Got questions? Drop them in #feature-requests!' },
  { triggers: ['github', 'source code', 'open source'], answer: 'Check out the GitHub org: https://github.com/jtdesign7277-source' },
];

/* ─── Bot Setup ─── */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});

/* ─── Ready ─── */
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Stratify Bot online as ${c.user.tag}`);
  client.user.setActivity('Stratify | stratify.associates', { type: 3 }); // "Watching"
});

/* ─── Welcome New Members ─── */
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const guild = member.guild;
    // Find #general channel
    const general = guild.channels.cache.find(
      (ch) => ch.name === 'general' && ch.isTextBased()
    );
    if (!general) return;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Welcome to Stratify! 🚀')
      .setDescription(
        `Hey **${member.user.username}**, welcome to the Stratify community!\n\n` +
        `Here's how to get started:\n` +
        `• **#trade-setups** — Share your entries and chart analysis\n` +
        `• **#strategies** — Discuss trading strategies\n` +
        `• **#show-your-pnl** — Post your wins (and losses)\n` +
        `• **#feature-requests** — Help us build a better platform\n\n` +
        `Check out Stratify → https://stratify.associates`
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .setFooter({ text: 'Stratify — AI-Powered Trading' })
      .setTimestamp();

    await general.send({ embeds: [embed] });
  } catch (err) {
    console.error('Welcome message error:', err.message);
  }
});

/* ─── Message Handler (FAQ + Moderation) ─── */
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.guild?.id !== GUILD_ID) return;

  const content = message.content.toLowerCase().trim();

  /* ── Spam Detection ── */
  // Check patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      try {
        await message.delete();
        await message.channel.send({
          content: `🛡️ Message from **${message.author.username}** was removed (spam detected).`,
        });
        console.log(`🗑️ Spam deleted from ${message.author.username}: ${message.content.slice(0, 50)}`);
      } catch (err) {
        console.error('Spam delete error:', err.message);
      }
      return;
    }
  }

  // Flood detection
  const now = Date.now();
  const userId = message.author.id;
  if (!MESSAGE_HISTORY.has(userId)) MESSAGE_HISTORY.set(userId, []);
  const history = MESSAGE_HISTORY.get(userId);
  history.push(now);
  // Clean old entries
  while (history.length > 0 && now - history[0] > FLOOD_WINDOW) history.shift();
  if (history.length > FLOOD_LIMIT) {
    try {
      await message.delete();
      await message.channel.send({
        content: `⚠️ **${message.author.username}**, slow down! You're sending messages too fast.`,
      });
    } catch {}
    return;
  }

  /* ── FAQ Auto-Reply ── */
  // Only respond if message looks like a question or mentions stratify
  const isQuestion = content.includes('?') || content.startsWith('how') || content.startsWith('what') || content.startsWith('is ') || content.startsWith('who') || content.startsWith('where') || content.startsWith('can ');
  const mentionsStratify = content.includes('stratify');

  if (isQuestion || mentionsStratify) {
    for (const faq of FAQ) {
      const match = faq.triggers.some((t) => content.includes(t));
      if (match) {
        try {
          await message.reply({ content: faq.answer, allowedMentions: { repliedUser: false } });
        } catch (err) {
          console.error('FAQ reply error:', err.message);
        }
        return;
      }
    }
  }
});

/* ─── Login ─── */
if (!TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN not set');
  process.exit(1);
}

client.login(TOKEN).catch((err) => {
  console.error('❌ Login failed:', err.message);
  process.exit(1);
});

/* ─── AI Content Factory: Script Drafts Pipeline ─── */
const SCRIPT_DRAFTS_CHANNEL = 'script-drafts';
const XAI_API_KEY = process.env.XAI_API_KEY;

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.name !== SCRIPT_DRAFTS_CHANNEL) return;
  

  const script = message.content.trim();
  if (!script) return;

  await message.react('⏳');

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          {
            role: 'system',
            content: 'You are SLAP, Stratify\'s Growth & Marketing Strategist. Take the script draft and rewrite it optimized for TikTok. Rules: Hook must be under 5 words and create instant curiosity. Total length under 60 seconds when spoken. Use short punchy sentences. End with one clear CTA pointing to the waitlist. Keep all real numbers. Return only the final script, no commentary.'
          },
          {
            role: 'user',
            content: script
          }
        ]
      })
    });

    const data = await res.json();
    const optimized = data.choices?.[0]?.message?.content || 'Error getting response';

    await message.reactions.removeAll();
    await message.react('✅');

    await message.channel.send(
      `🎬 **TIKTOK-READY** (via SLAP + Grok)\n` +
      `─────────────────────\n` +
      `${optimized}\n` +
      `─────────────────────\n` +
      `✅ Ready for Runway → Post`
    );

    // Log to #agent-logs
    const logsChannel = message.guild.channels.cache.find(c => c.name === 'agent-logs');
    if (logsChannel) {
      await logsChannel.send(`[SLAP] Script optimized at ${new Date().toLocaleTimeString()} — ready for Runway`);
    }

  } catch (err) {
    console.error('Grok pipeline error:', err);
    await message.react('❌');
    await message.channel.send('Pipeline error — check bot logs.');
  }
});
