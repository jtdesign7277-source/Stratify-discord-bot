// Stratify Discord Bot — Full Community Manager
// Deploy to Railway for 24/7 uptime

const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const cron = require('node-cron');
const fetch = require('node-fetch');

// Import command handlers
const priceCommand = require('./commands/price');
const strategyCommand = require('./commands/strategy');
const leaderboardCommand = require('./commands/leaderboard');
const paperTradeCommand = require('./commands/papertrade');
const helpCommand = require('./commands/help');
const alertCommand = require('./commands/alert');

// Import event handlers
const welcomeHandler = require('./events/welcome');
const reactionRoles = require('./events/reactionRoles');

// Import services
const marketCron = require('./services/marketCron');
const apiServer = require('./api/server');

// ─── Bot Client ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Command collection
client.commands = new Collection();
client.commands.set('price', priceCommand);
client.commands.set('strategy', strategyCommand);
client.commands.set('leaderboard', leaderboardCommand);
client.commands.set('papertrade', paperTradeCommand);
client.commands.set('help', helpCommand);
client.commands.set('alert', alertCommand);

// ─── Bot Ready ──────────────────────────────────────────────
client.once('ready', () => {
  console.log(`✅ Stratify Bot online as ${client.user.tag}`);
  console.log(`📡 Serving ${client.guilds.cache.size} guild(s)`);

  // Set bot status
  client.user.setActivity('the markets 📈', { type: ActivityType.Watching });

  // Start cron jobs
  marketCron.start(client);
  console.log('⏰ Market cron jobs scheduled');

  // Start API server for Mission Control
  apiServer.start(client);
  console.log('🌐 API server started on port', process.env.PORT || 3001);
});

// ─── Slash Command Handler ──────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);
    const reply = {
      content: '❌ Something went wrong executing that command.',
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// ─── Welcome New Members ────────────────────────────────────
client.on('guildMemberAdd', (member) => welcomeHandler.execute(member));

// ─── Reaction Roles ─────────────────────────────────────────
client.on('messageReactionAdd', (reaction, user) =>
  reactionRoles.onAdd(reaction, user)
);
client.on('messageReactionRemove', (reaction, user) =>
  reactionRoles.onRemove(reaction, user)
);

// ─── Cashtag Detection ──────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Detect $TICKER mentions and auto-reply with price
  const tickerMatch = message.content.match(/\$([A-Z]{1,5})\b/g);
  if (tickerMatch && message.channel.name !== 'general') {
    // Only auto-respond in trading channels, not general chat
    const tickers = tickerMatch.map((t) => t.replace('$', ''));
    if (tickers.length <= 3) {
      try {
        const prices = await Promise.all(
          tickers.map(async (ticker) => {
            const data = await fetchAlpacaQuote(ticker);
            if (!data) return null;
            return { ticker, ...data };
          })
        );

        const validPrices = prices.filter(Boolean);
        if (validPrices.length > 0) {
          const lines = validPrices.map((p) => {
            const arrow = p.changePercent >= 0 ? '🟢' : '🔴';
            const sign = p.changePercent >= 0 ? '+' : '';
            return `${arrow} **$${p.ticker}** — $${p.price.toFixed(2)} (${sign}${p.changePercent.toFixed(2)}%)`;
          });
          await message.reply({ content: lines.join('\n'), allowedMentions: { repliedUser: false } });
        }
      } catch (err) {
        // Silent fail — don't spam errors
      }
    }
  }
});

// ─── Alpaca Helper ──────────────────────────────────────────
async function fetchAlpacaQuote(ticker) {
  try {
    const isCrypto = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK', 'ADA', 'AVAX', 'DOT'].includes(ticker);

    if (isCrypto) {
      const res = await fetch(
        `https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols=${ticker}/USD`,
        {
          headers: {
            'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
          },
        }
      );
      const data = await res.json();
      const trade = data.trades?.[`${ticker}/USD`];
      if (!trade) return null;
      return { price: trade.p, changePercent: 0 }; // Crypto doesn't have daily change in this endpoint
    } else {
      const res = await fetch(
        `https://data.alpaca.markets/v2/stocks/${ticker}/snapshot`,
        {
          headers: {
            'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
          },
        }
      );
      const data = await res.json();
      if (!data.latestTrade) return null;
      const price = data.latestTrade.p;
      const prevClose = data.prevDailyBar?.c || price;
      const changePercent = ((price - prevClose) / prevClose) * 100;
      return { price, changePercent };
    }
  } catch {
    return null;
  }
}

// Make fetchAlpacaQuote available to commands
client.fetchAlpacaQuote = fetchAlpacaQuote;

// ─── Login ──────────────────────────────────────────────────
client.login(process.env.DISCORD_BOT_TOKEN);
