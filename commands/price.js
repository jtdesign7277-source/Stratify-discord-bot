const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: 'price',
  async execute(interaction) {
    const ticker = interaction.options.getString('ticker').toUpperCase();
    await interaction.deferReply();

    const cryptoList = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK', 'ADA', 'AVAX', 'DOT'];
    const isCrypto = cryptoList.includes(ticker);

    try {
      let price, prevClose, high, low, volume, changePercent, change;

      if (isCrypto) {
        const [tradeRes, barRes] = await Promise.all([
          fetch(`https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols=${ticker}/USD`, {
            headers: {
              'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
              'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
            },
          }),
          fetch(`https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=${ticker}/USD&timeframe=1Day&limit=2`, {
            headers: {
              'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
              'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
            },
          }),
        ]);

        const tradeData = await tradeRes.json();
        const barData = await barRes.json();
        const trade = tradeData.trades?.[`${ticker}/USD`];
        const bars = barData.bars?.[`${ticker}/USD`] || [];

        if (!trade) {
          return interaction.editReply(`❌ Could not find price data for **$${ticker}**`);
        }

        price = trade.p;
        const todayBar = bars[bars.length - 1];
        const yesterdayBar = bars.length > 1 ? bars[bars.length - 2] : null;
        prevClose = yesterdayBar?.c || todayBar?.o || price;
        high = todayBar?.h || price;
        low = todayBar?.l || price;
        volume = todayBar?.v || 0;
        change = price - prevClose;
        changePercent = ((change) / prevClose) * 100;

      } else {
        const res = await fetch(`https://data.alpaca.markets/v2/stocks/${ticker}/snapshot`, {
          headers: {
            'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
          },
        });

        const data = await res.json();
        if (!data.latestTrade) {
          return interaction.editReply(`❌ Could not find price data for **$${ticker}**`);
        }

        price = data.latestTrade.p;
        prevClose = data.prevDailyBar?.c || price;
        high = data.dailyBar?.h || price;
        low = data.dailyBar?.l || price;
        volume = data.dailyBar?.v || 0;
        change = price - prevClose;
        changePercent = ((change) / prevClose) * 100;
      }

      const isUp = change >= 0;
      const arrow = isUp ? '📈' : '📉';
      const color = isUp ? 0x10b981 : 0xef4444;
      const sign = isUp ? '+' : '';

      const embed = new EmbedBuilder()
        .setTitle(`${arrow} $${ticker} — $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .setColor(color)
        .addFields(
          { name: 'Change', value: `${sign}$${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`, inline: true },
          { name: 'High', value: `$${high.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, inline: true },
          { name: 'Low', value: `$${low.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, inline: true },
          { name: 'Prev Close', value: `$${prevClose.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, inline: true },
          { name: 'Volume', value: volume > 1000000 ? `${(volume / 1000000).toFixed(1)}M` : volume.toLocaleString(), inline: true },
          { name: 'Type', value: isCrypto ? '🪙 Crypto' : '📊 Equity', inline: true }
        )
        .setFooter({ text: 'Stratify • Powered by Alpaca SIP' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Price command error:', error);
      await interaction.editReply(`❌ Error fetching price for **$${ticker}**`);
    }
  },
};
