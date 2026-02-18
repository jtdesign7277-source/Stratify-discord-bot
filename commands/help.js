const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🧠 Stratify Bot Commands')
      .setColor(0x3b82f6)
      .setDescription('Your AI-powered trading companion')
      .addFields(
        {
          name: '📊 `/price <ticker>`',
          value: 'Get real-time price, change, volume for any stock or crypto\n`/price NVDA` · `/price BTC`',
        },
        {
          name: '🤖 `/strategy <type> <ticker>`',
          value: 'Generate an AI trading strategy with entry/exit rules\n`/strategy momentum TSLA` · `/strategy rsi AAPL`',
        },
        {
          name: '💰 `/papertrade <buy|sell> <ticker> <amount>`',
          value: 'Execute a paper trade (no real money)\n`/papertrade buy NVDA 5000`',
        },
        {
          name: '🏆 `/leaderboard [period]`',
          value: 'View top paper traders\n`/leaderboard weekly`',
        },
        {
          name: '🔔 `/alert <ticker> <price> <above|below>`',
          value: 'Set a price alert — get DM\'d when it triggers\n`/alert AAPL 200 above`',
        },
        {
          name: '💬 Cashtag Auto-Detect',
          value: 'Mention any $TICKER in trading channels and the bot will auto-reply with the current price',
        }
      )
      .addFields({
        name: '🔗 Links',
        value: '[Stratify App](https://stratify.associates) • [GitHub](https://github.com/jtdesign7277-source/stratify)',
      })
      .setFooter({ text: 'Stratify • AI-Powered Algorithmic Trading' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
