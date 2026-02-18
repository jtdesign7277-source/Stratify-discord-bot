// Express API — lets Mission Control read Discord data
const express = require('express');

module.exports = {
  start(client) {
    const app = express();
    app.use(express.json());

    // Auth middleware
    const auth = (req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token !== process.env.DISCORD_NOTIFY_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    };

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        bot: client.user?.tag,
        guilds: client.guilds.cache.size,
        uptime: Math.floor(client.uptime / 1000),
      });
    });

    // GET /api/channels — list all channels
    app.get('/api/channels', auth, (req, res) => {
      const guild = client.guilds.cache.first();
      if (!guild) return res.json({ channels: [] });

      const channels = guild.channels.cache
        .filter((ch) => ch.isTextBased() && !ch.isThread())
        .map((ch) => ({
          id: ch.id,
          name: ch.name,
          type: ch.type,
          position: ch.position,
        }))
        .sort((a, b) => a.position - b.position);

      res.json({ channels });
    });

    // GET /api/messages/:channel — fetch recent messages from a channel
    app.get('/api/messages/:channel', auth, async (req, res) => {
      try {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json({ messages: [] });

        const channel = guild.channels.cache.find(
          (ch) => ch.name === req.params.channel || ch.id === req.params.channel
        );
        if (!channel) return res.status(404).json({ error: 'Channel not found' });

        const limit = Math.min(parseInt(req.query.limit) || 25, 100);
        const messages = await channel.messages.fetch({ limit });

        const formatted = messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          author: {
            id: msg.author.id,
            username: msg.author.username,
            displayName: msg.author.displayName,
            avatar: msg.author.displayAvatarURL({ size: 64 }),
            bot: msg.author.bot,
          },
          embeds: msg.embeds.map((e) => ({
            title: e.title,
            description: e.description,
            color: e.color,
            fields: e.fields,
            footer: e.footer?.text,
            timestamp: e.timestamp,
          })),
          timestamp: msg.createdTimestamp,
          reactions: msg.reactions.cache.map((r) => ({
            emoji: r.emoji.name,
            count: r.count,
          })),
        }));

        res.json({ channel: req.params.channel, messages: formatted });
      } catch (error) {
        console.error('Messages fetch error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/members — server member count + list
    app.get('/api/members', auth, async (req, res) => {
      try {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json({ count: 0, members: [] });

        const members = await guild.members.fetch({ limit: 100 });
        const formatted = members.map((m) => ({
          id: m.id,
          username: m.user.username,
          displayName: m.displayName,
          avatar: m.user.displayAvatarURL({ size: 64 }),
          roles: m.roles.cache.map((r) => r.name).filter((n) => n !== '@everyone'),
          joinedAt: m.joinedTimestamp,
          bot: m.user.bot,
        }));

        res.json({
          count: guild.memberCount,
          online: guild.presences.cache.filter((p) => p.status !== 'offline').size,
          members: formatted,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/stats — server stats for Mission Control dashboard
    app.get('/api/stats', auth, (req, res) => {
      const guild = client.guilds.cache.first();
      if (!guild) return res.json({});

      res.json({
        name: guild.name,
        memberCount: guild.memberCount,
        channelCount: guild.channels.cache.size,
        roleCount: guild.roles.cache.size,
        boostLevel: guild.premiumTier,
        boostCount: guild.premiumSubscriptionCount,
        createdAt: guild.createdTimestamp,
        icon: guild.iconURL({ size: 128 }),
      });
    });

    // POST /api/send — send a message to a channel (from Mission Control)
    app.post('/api/send', auth, async (req, res) => {
      try {
        const { channel: channelName, content, embed } = req.body;
        const guild = client.guilds.cache.first();
        if (!guild) return res.status(404).json({ error: 'No guild found' });

        const channel = guild.channels.cache.find(
          (ch) => ch.name === channelName || ch.id === channelName
        );
        if (!channel) return res.status(404).json({ error: 'Channel not found' });

        if (embed) {
          const embedObj = new (require('discord.js').EmbedBuilder)(embed);
          await channel.send({ embeds: [embedObj] });
        } else {
          await channel.send(content);
        }

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Start server
    const port = process.env.PORT || 3001;
    app.listen(port, '0.0.0.0', () => {
      console.log(`🌐 Mission Control API running on port ${port}`);
    });
  },
};
