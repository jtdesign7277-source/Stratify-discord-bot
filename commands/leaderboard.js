const { EmbedBuilder } = require('discord.js');

// In-memory leaderboard (replace with Supabase later)
const leaderboard = [
  { user: 'Jeff', pnl: 12450, trades: 47, winRate: 72 },
  { user: 'AlphaTrader', pnl: 8320, trades: 31, winRate: 68 },
  { user: 'MomentumKing', pnl: 5610, trades: 22, winRate: 64 },
  { user: 'SwingMaster', pnl: 3200, trades: 18, winRate: 61 },
  { user: 'ScalpBot', pnl: 1870, trades: 95, winRate: 55 },
];

const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

module.exports = {
  name: 'leaderboard',
  async execute(interaction) {
    const period = interaction.options.getString('period') || 'alltime';

    const periodLabels = {
      daily: "Today's",
      weekly: "This Week's",
      monthly: "This Month's",
      alltime: 'All-Time',
    };

    const rows = leaderboard.map((entry, i) => {
      const sign = entry.pnl >= 0 ? '+' : '';
      return `${medals[i]} **${entry.user}** — ${sign}$${entry.pnl.toLocaleString()} | ${entry.trades} trades | ${entry.winRate}% win`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${periodLabels[period]} Paper Trading Leaderboard`)
      .setColor(0xf59e0b)
      .setDescription(rows.join('\n\n'))
      .addFields({
        name: '💡 Want on the board?',
        value: 'Use `/papertrade buy AAPL 1000` to start paper trading!',
      })
      .setFooter({ text: 'Stratify • Paper Trading Competition' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
