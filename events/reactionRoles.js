// Reaction Roles — React to a message to get a role
// Set REACTION_ROLES_MESSAGE_ID env var to the message ID of the roles message

const EMOJI_ROLE_MAP = {
  '📈': 'Stocks',
  '🪙': 'Crypto',
  '🤖': 'AI Strategies',
  '📊': 'Technical Analysis',
  '📰': 'Market News',
};

module.exports = {
  EMOJI_ROLE_MAP,

  async onAdd(reaction, user) {
    if (user.bot) return;

    // Only handle reactions on the designated roles message
    const rolesMessageId = process.env.REACTION_ROLES_MESSAGE_ID;
    if (!rolesMessageId || reaction.message.id !== rolesMessageId) return;

    try {
      // Fetch partial reaction if needed
      if (reaction.partial) await reaction.fetch();

      const roleName = EMOJI_ROLE_MAP[reaction.emoji.name];
      if (!roleName) return;

      const guild = reaction.message.guild;
      const member = await guild.members.fetch(user.id);
      const role = guild.roles.cache.find((r) => r.name === roleName);

      if (role) {
        await member.roles.add(role);
        console.log(`✅ Added role "${roleName}" to ${user.tag}`);
      }
    } catch (error) {
      console.error('Reaction role add error:', error);
    }
  },

  async onRemove(reaction, user) {
    if (user.bot) return;

    const rolesMessageId = process.env.REACTION_ROLES_MESSAGE_ID;
    if (!rolesMessageId || reaction.message.id !== rolesMessageId) return;

    try {
      if (reaction.partial) await reaction.fetch();

      const roleName = EMOJI_ROLE_MAP[reaction.emoji.name];
      if (!roleName) return;

      const guild = reaction.message.guild;
      const member = await guild.members.fetch(user.id);
      const role = guild.roles.cache.find((r) => r.name === roleName);

      if (role) {
        await member.roles.remove(role);
        console.log(`❌ Removed role "${roleName}" from ${user.tag}`);
      }
    } catch (error) {
      console.error('Reaction role remove error:', error);
    }
  },
};
