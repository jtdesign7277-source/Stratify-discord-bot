const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const fetch = require('node-fetch');

const WATCHLIST = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
const CRYPTO = ['BTC', 'ETH', 'SOL'];

// ─── Strategy of the Day Pool ───────────────────────────────
const STRATEGY_POOL = [
  {
    name: 'Momentum Breakout',
    emoji: '🚀',
    tickers: ['NVDA', 'TSLA', 'META', 'AMZN', 'AAPL'],
    description: 'Rides strong directional moves using volume and price momentum',
    indicators: ['EMA 9/21 Crossover', 'Volume Surge > 2x Avg', 'RSI > 60'],
    entry: 'Buy when price breaks above 20-period high with volume confirmation',
    exit: 'Trailing stop at 2x ATR, take profit at 3:1 R:R',
    timeframe: '15min — 1hr',
    risk: 'Medium',
    color: 0x10b981,
  },
  {
    name: 'RSI Reversal',
    emoji: '🔄',
    tickers: ['AAPL', 'MSFT', 'GOOGL', 'SPY', 'QQQ'],
    description: 'Catches oversold bounces and overbought reversals',
    indicators: ['RSI(14) < 30 or > 70', 'VWAP Support/Resistance', 'Bollinger Band Touch'],
    entry: 'Long when RSI < 30 + price touches lower Bollinger Band',
    exit: 'Close at RSI 50 (mean) or RSI 70 (extended)',
    timeframe: '1hr — 4hr',
    risk: 'Low-Medium',
    color: 0x3b82f6,
  },
  {
    name: 'Mean Reversion',
    emoji: '📊',
    tickers: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'AMZN'],
    description: 'Fades extreme moves back to statistical mean',
    indicators: ['Z-Score > 2 or < -2', '20-day SMA', 'Bollinger Bands (2σ)'],
    entry: 'Enter when price deviates >2σ from 20-day mean',
    exit: 'Close at mean (SMA 20) or opposite band',
    timeframe: '4hr — Daily',
    risk: 'Low',
    color: 0x8b5cf6,
  },
  {
    name: 'Breakout Hunter',
    emoji: '💥',
    tickers: ['TSLA', 'NVDA', 'META', 'AMZN', 'GOOGL'],
    description: 'Captures explosive moves from consolidation patterns',
    indicators: ['Consolidation Range Detection', 'Volume Breakout > 3x', 'ATR Expansion'],
    entry: 'Buy on confirmed break above resistance with volume',
    exit: 'Stop below breakout level, target measured move',
    timeframe: '15min — Daily',
    risk: 'Medium-High',
    color: 0xf59e0b,
  },
  {
    name: 'MACD Crossover',
    emoji: '📉',
    tickers: ['AAPL', 'MSFT', 'SPY', 'QQQ', 'GOOGL'],
    description: 'Trend-following using MACD signal line crossovers',
    indicators: ['MACD(12,26,9)', 'Signal Line Cross', 'Histogram Direction'],
    entry: 'Long on bullish MACD crossover above zero line',
    exit: 'Close on bearish crossover or histogram reversal',
    timeframe: '1hr — Daily',
    risk: 'Medium',
    color: 0xef4444,
  },
  {
    name: 'VWAP Scalper',
    emoji: '⚡',
    tickers: ['TSLA', 'NVDA', 'AAPL', 'META', 'AMZN'],
    description: 'Quick intraday trades using VWAP as dynamic support/resistance',
    indicators: ['VWAP', '1-min candles', 'Level 2 Order Flow'],
    entry: 'Long on VWAP bounce with bid stacking, short on VWAP rejection',
    exit: 'Take profit at 0.5-1% move, stop at VWAP cross',
    timeframe: '1min — 5min',
    risk: 'High',
    color: 0xec4899,
  },
  {
    name: 'Gap & Go',
    emoji: '🌅',
    tickers: ['TSLA', 'NVDA', 'META', 'AAPL', 'AMZN'],
    description: 'Trades morning gaps in the direction of the gap',
    indicators: ['Pre-market Gap %', 'Volume > 2x pre-market avg', 'First 5-min candle'],
    entry: 'Buy break of first 5-min high if gap up > 2% with volume',
    exit: 'Stop below first 5-min low, target 2x gap size',
    timeframe: '1min — 15min (first 30 min only)',
    risk: 'High',
    color: 0xf97316,
  },
  {
    name: 'Crypto Momentum',
    emoji: '🪙',
    tickers: ['BTC', 'ETH', 'SOL'],
    description: '24/7 crypto momentum with trend confirmation',
    indicators: ['EMA 12/26', 'RSI > 55', 'Volume spike detection'],
    entry: 'Long when EMA 12 crosses above EMA 26 with RSI confirmation',
    exit: 'Close on EMA cross back or RSI < 45',
    timeframe: '1hr — 4hr',
    risk: 'Medium-High',
    color: 0x6366f1,
  },
  {
    name: 'Earnings Straddle',
    emoji: '📅',
    tickers: ['NVDA', 'TSLA', 'META', 'AAPL', 'GOOGL'],
    description: 'Play expected volatility around earnings with directional bias',
    indicators: ['Implied Volatility rank', 'Historical earnings moves', 'Options chain analysis'],
    entry: 'Enter 2-3 days before earnings, direction based on sector momentum',
    exit: 'Close within 1 hour of earnings release',
    timeframe: 'Swing (2-5 days)',
    risk: 'High',
    color: 0x14b8a6,
  },
  {
    name: 'Pullback Buyer',
    emoji: '🎯',
    tickers: ['AAPL', 'MSFT', 'GOOGL', 'SPY', 'QQQ'],
    description: 'Buys dips in strong uptrends at key support levels',
    indicators: ['50-day SMA slope > 0', 'Price pulls back to 20 EMA', 'RSI 40-50 zone'],
    entry: 'Buy when price touches 20 EMA in confirmed uptrend',
    exit: 'Stop below 50 SMA, target new high',
    timeframe: 'Daily',
    risk: 'Low-Medium',
    color: 0x22c55e,
  },
];

let lastStrategyIndex = -1;

function getStrategyOfTheDay() {
  // Rotate through strategies, pick random ticker
  let index;
  do {
    index = Math.floor(Math.random() * STRATEGY_POOL.length);
  } while (index === lastStrategyIndex && STRATEGY_POOL.length > 1);
  lastStrategyIndex = index;

  const strategy = STRATEGY_POOL[index];
  const ticker = strategy.tickers[Math.floor(Math.random() * strategy.tickers.length)];

  return { strategy, ticker };
}

// ─── Market Data Fetchers ───────────────────────────────────
async function fetchStockPrices() {
  try {
    const symbols = WATCHLIST.join(',');
    const res = await fetch(`https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbols}`, {
      headers: {
        'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
      },
    });
    return await res.json();
  } catch {
    return {};
  }
}

async function fetchCryptoPrices() {
  try {
    const symbols = CRYPTO.map((c) => `${c}/USD`).join(',');
    const res = await fetch(
      `https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols=${symbols}`,
      {
        headers: {
          'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
        },
      }
    );
    return await res.json();
  } catch {
    return {};
  }
}

// ─── Embed Builders ─────────────────────────────────────────
function buildMarketEmbed(stockData, cryptoData, period) {
  const title = period === 'premarket' ? '🌅 Pre-Market Snapshot' : '🌙 Market Close Recap';
  const color = period === 'premarket' ? 0xf59e0b : 0x6366f1;

  const stockLines = WATCHLIST.map((ticker) => {
    const snap = stockData[ticker];
    if (!snap?.latestTrade) return `**$${ticker}** — N/A`;
    const price = snap.latestTrade.p;
    const prevClose = snap.prevDailyBar?.c || price;
    const change = ((price - prevClose) / prevClose) * 100;
    const arrow = change >= 0 ? '🟢' : '🔴';
    const sign = change >= 0 ? '+' : '';
    return `${arrow} **$${ticker}** $${price.toFixed(2)} (${sign}${change.toFixed(2)}%)`;
  });

  const cryptoLines = CRYPTO.map((ticker) => {
    const trade = cryptoData.trades?.[`${ticker}/USD`];
    if (!trade) return `**$${ticker}** — N/A`;
    return `🪙 **$${ticker}** $${trade.p.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  });

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields(
      { name: '📊 Equities', value: stockLines.join('\n') },
      { name: '🪙 Crypto', value: cryptoLines.join('\n') }
    )
    .setFooter({ text: 'Stratify • Powered by Alpaca SIP' })
    .setTimestamp();
}

function buildTopMoversEmbed(stockData) {
  const movers = WATCHLIST.map((ticker) => {
    const snap = stockData[ticker];
    if (!snap?.latestTrade) return null;
    const price = snap.latestTrade.p;
    const prevClose = snap.prevDailyBar?.c || price;
    const changePercent = ((price - prevClose) / prevClose) * 100;
    return { ticker, price, changePercent };
  })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  const topGainer = movers.find((m) => m.changePercent > 0);
  const topLoser = movers.find((m) => m.changePercent < 0);
  const topVolatile = movers[0];

  const lines = [];
  if (topGainer) {
    lines.push(`🟢 **Top Gainer:** $${topGainer.ticker} — $${topGainer.price.toFixed(2)} (+${topGainer.changePercent.toFixed(2)}%)`);
  }
  if (topLoser) {
    lines.push(`🔴 **Top Loser:** $${topLoser.ticker} — $${topLoser.price.toFixed(2)} (${topLoser.changePercent.toFixed(2)}%)`);
  }
  if (topVolatile) {
    lines.push(`⚡ **Most Volatile:** $${topVolatile.ticker} — ${Math.abs(topVolatile.changePercent).toFixed(2)}% move`);
  }

  return new EmbedBuilder()
    .setTitle('🔥 Midday Movers')
    .setColor(0xf59e0b)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: 'Stratify • Top movers from your watchlist' })
    .setTimestamp();
}

// ─── Start All Cron Jobs ────────────────────────────────────
module.exports = {
  start(client) {
    // ── Strategy of the Day: 9:30 AM ET (13:30 UTC) ──
    cron.schedule('30 13 * * 1-5', async () => {
      console.log('⏰ Posting Strategy of the Day...');
      try {
        const channel = client.channels.cache.find((ch) => ch.name === 'strategies');
        if (!channel) return;

        const { strategy, ticker } = getStrategyOfTheDay();

        const embed = new EmbedBuilder()
          .setTitle(`${strategy.emoji} Strategy of the Day — $${ticker}`)
          .setColor(strategy.color)
          .setDescription(`*${strategy.description}*`)
          .addFields(
            { name: '📏 Indicators', value: strategy.indicators.map((i) => `• ${i}`).join('\n') },
            { name: '🟢 Entry', value: strategy.entry },
            { name: '🔴 Exit', value: strategy.exit },
            { name: '⏱ Timeframe', value: strategy.timeframe, inline: true },
            { name: '⚠️ Risk', value: strategy.risk, inline: true }
          )
          .addFields({
            name: '🔗 Build this strategy',
            value: '[Open Stratify →](https://stratify.associates) and customize with Sophia AI',
          })
          .setFooter({ text: 'Stratify • Daily Strategy • Not financial advice' })
          .setTimestamp();

        await channel.send({ content: '☀️ **Good morning traders!** Here\'s today\'s featured strategy:', embeds: [embed] });

        // Also cross-post a teaser to #general
        const general = client.channels.cache.find((ch) => ch.name === 'general');
        if (general) {
          await general.send(
            `📢 **Strategy of the Day** just dropped in #strategies — ${strategy.emoji} **${strategy.name}** on **$${ticker}**. Go check it out!`
          );
        }

        console.log(`✅ Strategy of the Day posted: ${strategy.name} on $${ticker}`);
      } catch (err) {
        console.error('Strategy of the Day error:', err);
      }
    });

    // ── Pre-Market Snapshot: 9:25 AM ET (13:25 UTC) ──
    cron.schedule('25 13 * * 1-5', async () => {
      console.log('⏰ Running pre-market snapshot...');
      try {
        const channel = client.channels.cache.find((ch) => ch.name === 'market-talk');
        if (!channel) return;

        const [stockData, cryptoData] = await Promise.all([fetchStockPrices(), fetchCryptoPrices()]);
        const embed = buildMarketEmbed(stockData, cryptoData, 'premarket');
        await channel.send({ embeds: [embed] });
        console.log('✅ Pre-market snapshot posted');
      } catch (err) {
        console.error('Pre-market cron error:', err);
      }
    });

    // ── Midday Movers: 12:30 PM ET (16:30 UTC) ──
    cron.schedule('30 16 * * 1-5', async () => {
      console.log('⏰ Running midday movers...');
      try {
        const channel = client.channels.cache.find((ch) => ch.name === 'market-talk');
        if (!channel) return;

        const stockData = await fetchStockPrices();
        const embed = buildTopMoversEmbed(stockData);
        await channel.send({ embeds: [embed] });
        console.log('✅ Midday movers posted');
      } catch (err) {
        console.error('Midday movers error:', err);
      }
    });

    // ── Market Close Recap: 4:05 PM ET (20:05 UTC) ──
    cron.schedule('5 20 * * 1-5', async () => {
      console.log('⏰ Running close recap...');
      try {
        const channel = client.channels.cache.find((ch) => ch.name === 'market-talk');
        if (!channel) return;

        const [stockData, cryptoData] = await Promise.all([fetchStockPrices(), fetchCryptoPrices()]);
        const embed = buildMarketEmbed(stockData, cryptoData, 'close');
        await channel.send({ embeds: [embed] });
        console.log('✅ Close recap posted');
      } catch (err) {
        console.error('Close recap cron error:', err);
      }
    });

    // ── Alert Checker: Every 60s during market hours ──
    cron.schedule('* 13-20 * * 1-5', async () => {
      const alertModule = require('../commands/alert');
      const alerts = alertModule.alerts;

      for (const [userId, userAlerts] of alerts) {
        for (let i = userAlerts.length - 1; i >= 0; i--) {
          const alert = userAlerts[i];
          try {
            const quote = await client.fetchAlpacaQuote(alert.ticker);
            if (!quote) continue;

            const shouldTrigger =
              (alert.direction === 'above' && quote.price >= alert.target) ||
              (alert.direction === 'below' && quote.price <= alert.target);

            if (shouldTrigger) {
              userAlerts.splice(i, 1);
              try {
                const user = await client.users.fetch(userId);
                const embed = new EmbedBuilder()
                  .setTitle('🔔 Price Alert Triggered!')
                  .setColor(0xf59e0b)
                  .setDescription(
                    `**$${alert.ticker}** hit **$${quote.price.toFixed(2)}** (target: $${alert.target.toFixed(2)} ${alert.direction})`
                  )
                  .setTimestamp();
                await user.send({ embeds: [embed] });
              } catch {
                // Can't DM user
              }
            }
          } catch {
            // Skip
          }
        }

        if (userAlerts.length === 0) {
          alerts.delete(userId);
        }
      }
    });

    console.log('⏰ All cron jobs scheduled:');
    console.log('   • 9:25 AM ET — Pre-market snapshot');
    console.log('   • 9:30 AM ET — Strategy of the Day');
    console.log('   • 12:30 PM ET — Midday movers');
    console.log('   • 4:05 PM ET — Market close recap');
    console.log('   • Every 60s — Price alert checker');
  },
};
