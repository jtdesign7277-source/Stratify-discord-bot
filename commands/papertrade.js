const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'papertrade',
  async execute(interaction) {
    const action = interaction.options.getString('action');
    const ticker = interaction.options.getString('ticker').toUpperCase();
    const amount = interaction.options.getNumber('amount');

    await interaction.deferReply();

    try {
      // Get current price
      const quote = await interaction.client.fetchAlpacaQuote(ticker);
      if (!quote) {
        return interaction.editReply(`❌ Could not find price for **$${ticker}**`);
      }

      const shares = Math.floor(amount / quote.price);
      if (shares < 1) {
        return interaction.editReply(`❌ $${amount} isn't enough to buy 1 share of **$${ticker}** at $${quote.price.toFixed(2)}`);
      }

      const totalCost = (shares * quote.price).toFixed(2);
      const color = action === 'buy' ? 0x10b981 : 0xef4444;
      const emoji = action === 'buy' ? '🟢' : '🔴';

      const embed = new EmbedBuilder()
        .setTitle(`${emoji} Paper ${action.toUpperCase()} — $${ticker}`)
        .setColor(color)
        .addFields(
          { name: 'Shares', value: shares.toString(), inline: true },
          { name: 'Price', value: `$${quote.price.toFixed(2)}`, inline: true },
          { name: 'Total', value: `$${totalCost}`, inline: true },
          { name: 'Trader', value: interaction.user.toString(), inline: true }
        )
        .setFooter({ text: 'Stratify Paper Trading • Not real money' })
        .setTimestamp();

      // Post to #trade-setups
      try {
        const tradeChannel = interaction.guild.channels.cache.find(
          (ch) => ch.name === 'trade-setups'
        );
        if (tradeChannel && tradeChannel.id !== interaction.channelId) {
          await tradeChannel.send({ embeds: [embed] });
        }
      } catch (err) {
        // Silent
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Paper trade error:', error);
      await interaction.editReply('❌ Error executing paper trade.');
    }
  },
};
