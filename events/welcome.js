const { EmbedBuilder } = require('discord.js');

module.exports = {
  async execute(member) {
    try {
      // Find #general channel
      const general = member.guild.channels.cache.find(
        (ch) => ch.name === 'general' && ch.isTextBased()
      );
      if (!general) return;

      const memberCount = member.guild.memberCount;

      const embed = new EmbedBuilder()
        .setTitle(`Welcome to Stratify! 🚀`)
        .setColor(0x3b82f6)
        .setDescription(
          `Hey ${member}, glad you're here! You're trader **#${memberCount}** in the community.`
        )
        .addFields(
          {
            name: '🏁 Quick Start',
            value: [
              '• Check out #strategies for AI-generated trade ideas',
              '• Use `/price AAPL` to get real-time quotes',
              '• Use `/strategy momentum TSLA` to generate strategies',
              '• Start paper trading with `/papertrade buy NVDA 5000`',
              '• Post your P&L in #show-your-pnl',
            ].join('\n'),
          },
          {
            name: '📖 Rules',
            value: 'Read #rules — no financial advice, be respectful, no pump & dump.',
          },
          {
            name: '🔗 Stratify App',
            value: '[Launch Stratify →](https://stratify.associates)',
          }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setFooter({ text: `Stratify Community • ${memberCount} traders` })
        .setTimestamp();

      await general.send({ embeds: [embed] });

      // Auto-assign "Trader" role if it exists
      const traderRole = member.guild.roles.cache.find(
        (r) => r.name.toLowerCase() === 'trader'
      );
      if (traderRole) {
        await member.roles.add(traderRole);
      }
    } catch (error) {
      console.error('Welcome handler error:', error);
    }
  },
};
