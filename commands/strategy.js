const { EmbedBuilder } = require('discord.js');

const STRATEGY_TEMPLATES = {
  momentum: {
    name: 'Momentum Breakout',
    emoji: '🚀',
    description: 'Rides strong directional moves using volume and price momentum',
    indicators: ['EMA 9/21 Crossover', 'Volume Surge > 2x Avg', 'RSI > 60'],
    entry: 'Buy when price breaks above 20-period high with volume confirmation',
    exit: 'Trailing stop at 2x ATR, take profit at 3:1 R:R',
    timeframe: '15min — 1hr',
    risk: 'Medium',
  },
  rsi: {
    name: 'RSI Reversal',
    emoji: '🔄',
    description: 'Catches oversold bounces and overbought reversals',
    indicators: ['RSI(14) < 30 or > 70', 'VWAP Support/Resistance', 'Bollinger Band Touch'],
    entry: 'Long when RSI < 30 + price touches lower Bollinger Band',
    exit: 'Close at RSI 50 (mean) or RSI 70 (extended)',
    timeframe: '1hr — 4hr',
    risk: 'Low-Medium',
  },
  mean_reversion: {
    name: 'Mean Reversion',
    emoji: '📊',
    description: 'Fades extreme moves back to statistical mean',
    indicators: ['Z-Score > 2 or < -2', '20-day SMA', 'Bollinger Bands (2σ)'],
    entry: 'Enter when price deviates >2σ from 20-day mean',
    exit: 'Close at mean (SMA 20) or opposite band',
    timeframe: '4hr — Daily',
    risk: 'Low',
  },
  breakout: {
    name: 'Breakout Trader',
    emoji: '💥',
    description: 'Captures explosive moves from consolidation patterns',
    indicators: ['Consolidation Range Detection', 'Volume Breakout > 3x', 'ATR Expansion'],
    entry: 'Buy on confirmed break above resistance with volume',
    exit: 'Stop below breakout level, target measured move',
    timeframe: '15min — Daily',
    risk: 'Medium-High',
  },
  macd: {
    name: 'MACD Crossover',
    emoji: '📉',
    description: 'Trend-following using MACD signal line crossovers',
    indicators: ['MACD(12,26,9)', 'Signal Line Cross', 'Histogram Direction'],
    entry: 'Long on bullish MACD crossover above zero line',
    exit: 'Close on bearish crossover or histogram reversal',
    timeframe: '1hr — Daily',
    risk: 'Medium',
  },
  scalping: {
    name: 'Micro Scalper',
    emoji: '⚡',
    description: 'Quick in-and-out trades capturing small moves',
    indicators: ['1-min VWAP', 'Level 2 Order Flow', 'Tape Reading'],
    entry: 'Buy at VWAP bounce with bid stacking on L2',
    exit: 'Take profit at 0.5-1% move, max hold 5 minutes',
    timeframe: '1min — 5min',
    risk: 'High',
  },
};

module.exports = {
  name: 'strategy',
  async execute(interaction) {
    const type = interaction.options.getString('type');
    const ticker = interaction.options.getString('ticker').toUpperCase();
    const template = STRATEGY_TEMPLATES[type];

    if (!template) {
      return interaction.reply({ content: '❌ Unknown strategy type.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${template.emoji} ${template.name} — $${ticker}`)
      .setColor(0x3b82f6)
      .setDescription(template.description)
      .addFields(
        { name: '📏 Indicators', value: template.indicators.map((i) => `• ${i}`).join('\n') },
        { name: '🟢 Entry', value: template.entry },
        { name: '🔴 Exit', value: template.exit },
        { name: '⏱ Timeframe', value: template.timeframe, inline: true },
        { name: '⚠️ Risk Level', value: template.risk, inline: true }
      )
      .setFooter({ text: 'Stratify Sophia AI • Build full strategies at stratify.associates' })
      .setTimestamp();

    // Also post to #strategies channel
    try {
      const strategiesChannel = interaction.guild.channels.cache.find(
        (ch) => ch.name === 'strategies'
      );
      if (strategiesChannel && strategiesChannel.id !== interaction.channelId) {
        await strategiesChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      // Silent fail
    }

    await interaction.reply({ embeds: [embed] });
  },
};
