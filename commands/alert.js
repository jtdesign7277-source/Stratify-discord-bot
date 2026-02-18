const { EmbedBuilder } = require('discord.js');

// In-memory alerts (replace with Supabase later)
const alerts = new Map();

module.exports = {
  name: 'alert',
  alerts, // Export for cron checker

  async execute(interaction) {
    const ticker = interaction.options.getString('ticker').toUpperCase();
    const target = interaction.options.getNumber('target');
    const direction = interaction.options.getString('direction');

    const userId = interaction.user.id;
    const userAlerts = alerts.get(userId) || [];

    if (userAlerts.length >= 10) {
      return interaction.reply({
        content: '❌ Max 10 alerts per user. Remove one first.',
        ephemeral: true,
      });
    }

    const alert = {
      ticker,
      target,
      direction,
      channelId: interaction.channelId,
      createdAt: Date.now(),
    };

    userAlerts.push(alert);
    alerts.set(userId, userAlerts);

    const emoji = direction === 'above' ? '🔼' : '🔽';
    const embed = new EmbedBuilder()
      .setTitle(`${emoji} Price Alert Set`)
      .setColor(0x8b5cf6)
      .setDescription(
        `You'll be notified when **$${ticker}** goes **${direction}** **$${target.toFixed(2)}**`
      )
      .addFields(
        { name: 'Ticker', value: `$${ticker}`, inline: true },
        { name: 'Target', value: `$${target.toFixed(2)}`, inline: true },
        { name: 'Direction', value: direction === 'above' ? '📈 Above' : '📉 Below', inline: true },
        { name: 'Active Alerts', value: `${userAlerts.length}/10`, inline: true }
      )
      .setFooter({ text: 'Stratify Alerts • Checked every 60s during market hours' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
