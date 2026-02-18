const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const fetch = require('node-fetch');

const WATCHLIST = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
const CRYPTO = ['BTC', 'ETH', 'SOL'];

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

module.exports = {
  start(client) {
    // Pre-market: 9:25 AM ET (13:25 UTC)
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

    // Market close: 4:05 PM ET (20:05 UTC)
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

    // Alert checker: Every 60s during market hours (9:30-4 ET, Mon-Fri)
    cron.schedule('* 13-20 * * 1-5', async () => {
      const alertModule = require('../commands/alert');
      const alerts = alertModule.alerts;

      for (const [userId, userAlerts] of alerts) {
        const triggered = [];

        for (let i = userAlerts.length - 1; i >= 0; i--) {
          const alert = userAlerts[i];
          try {
            const quote = await client.fetchAlpacaQuote(alert.ticker);
            if (!quote) continue;

            const shouldTrigger =
              (alert.direction === 'above' && quote.price >= alert.target) ||
              (alert.direction === 'below' && quote.price <= alert.target);

            if (shouldTrigger) {
              triggered.push(alert);
              userAlerts.splice(i, 1);

              // DM the user
              try {
                const user = await client.users.fetch(userId);
                const embed = new EmbedBuilder()
                  .setTitle(`🔔 Price Alert Triggered!`)
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
            // Skip this alert
          }
        }

        if (userAlerts.length === 0) {
          alerts.delete(userId);
        }
      }
    });
  },
};
