// Run this once to register slash commands with Discord
// Usage: DISCORD_BOT_TOKEN=xxx DISCORD_CLIENT_ID=xxx DISCORD_GUILD_ID=xxx node deploy-commands.js

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('price')
    .setDescription('Get real-time price for a stock or crypto')
    .addStringOption((opt) =>
      opt.setName('ticker').setDescription('Ticker symbol (e.g. AAPL, BTC)').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('strategy')
    .setDescription('Generate an AI trading strategy')
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Strategy type')
        .setRequired(true)
        .addChoices(
          { name: 'Momentum', value: 'momentum' },
          { name: 'RSI Reversal', value: 'rsi' },
          { name: 'Mean Reversion', value: 'mean_reversion' },
          { name: 'Breakout', value: 'breakout' },
          { name: 'MACD Crossover', value: 'macd' },
          { name: 'Scalping', value: 'scalping' }
        )
    )
    .addStringOption((opt) =>
      opt.setName('ticker').setDescription('Ticker symbol (e.g. AAPL, TSLA)').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View top paper traders')
    .addStringOption((opt) =>
      opt
        .setName('period')
        .setDescription('Time period')
        .addChoices(
          { name: 'Today', value: 'daily' },
          { name: 'This Week', value: 'weekly' },
          { name: 'This Month', value: 'monthly' },
          { name: 'All Time', value: 'alltime' }
        )
    ),

  new SlashCommandBuilder()
    .setName('papertrade')
    .setDescription('Execute a paper trade')
    .addStringOption((opt) =>
      opt
        .setName('action')
        .setDescription('Buy or Sell')
        .setRequired(true)
        .addChoices(
          { name: 'Buy', value: 'buy' },
          { name: 'Sell', value: 'sell' }
        )
    )
    .addStringOption((opt) =>
      opt.setName('ticker').setDescription('Ticker symbol').setRequired(true)
    )
    .addNumberOption((opt) =>
      opt.setName('amount').setDescription('Dollar amount to trade').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('alert')
    .setDescription('Set a price alert')
    .addStringOption((opt) =>
      opt.setName('ticker').setDescription('Ticker symbol').setRequired(true)
    )
    .addNumberOption((opt) =>
      opt.setName('target').setDescription('Target price').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('direction')
        .setDescription('Alert when price goes above or below target')
        .setRequired(true)
        .addChoices(
          { name: 'Above', value: 'above' },
          { name: 'Below', value: 'below' }
        )
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all Stratify bot commands'),
].map((cmd) => cmd.toJSON());

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log(`🔄 Registering ${commands.length} slash commands...`);

    // Guild-specific (instant, good for dev)
    if (process.env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
        { body: commands }
      );
      console.log('✅ Guild commands registered (instant)');
    }

    // Global (takes ~1hr to propagate)
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });
    console.log('✅ Global commands registered (may take ~1hr)');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
})();
