// discord-bot.js - Fantasy Pet League Discord Bot
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType } = require('discord.js');
const { Pool } = require('pg');
require('dotenv').config();

const bot = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const NOTIFICATIONS_CHANNEL_ID = process.env.NOTIFICATIONS_CHANNEL_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

// ============ EVENTS ============

bot.on('ready', () => {
  console.log(`✓ Discord bot logged in as ${bot.user.tag}`);
  bot.user.setActivity('pets get adopted 🐾', { type: 'WATCHING' });
});

bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'addpet') {
      await handleAddPet(interaction);
    } else if (commandName === 'myroster') {
      await handleMyRoster(interaction);
    } else if (commandName === 'leaderboard') {
      await handleLeaderboard(interaction);
    } else if (commandName === 'setpoints') {
      await handleSetPoints(interaction);
    } else if (commandName === 'listbreeds') {
      await handleListBreeds(interaction);
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'An error occurred!', ephemeral: true });
  }
});

// ============ COMMANDS ============

async function handleAddPet(interaction) {
  const petId = interaction.options.getString('pet_id');
  const leagueName = interaction.options.getString('league');
  const userId = interaction.user.id;

  // Get user from DB by Discord ID
  const userResult = await pool.query(
    'SELECT id FROM users WHERE discord_id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return interaction.reply({
      content: 'You need to sign up first! Visit the Fantasy Pet League website.',
      ephemeral: true
    });
  }

  const dbUserId = userResult.rows[0].id;

  // Get league ID
  const leagueResult = await pool.query(
    'SELECT id FROM leagues WHERE name = $1',
    [leagueName]
  );

  if (leagueResult.rows.length === 0) {
    return interaction.reply({
      content: `League "${leagueName}" not found!`,
      ephemeral: true
    });
  }

  const leagueId = leagueResult.rows[0].id;

  // Get pet
  const petResult = await pool.query(
    'SELECT id, name, breed, animal_type FROM pets WHERE pet_id = $1 AND status = $2',
    [petId, 'available']
  );

  if (petResult.rows.length === 0) {
    return interaction.reply({
      content: `Pet ${petId} not found or already adopted!`,
      ephemeral: true
    });
  }

  const pet = petResult.rows[0];

  // Draft pet
  try {
    await pool.query(
      'INSERT INTO roster_entries (user_id, league_id, pet_id) VALUES ($1, $2, $3)',
      [dbUserId, leagueId, pet.id]
    );

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle(`✓ Pet Drafted!`)
      .setDescription(`${pet.name} (${pet.breed})`)
      .addFields(
        { name: 'Type', value: pet.animal_type, inline: true },
        { name: 'League', value: leagueName, inline: true }
      );

    interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    if (error.code === '23505') {
      return interaction.reply({
        content: `You've already drafted ${pet.name} in this league!`,
        ephemeral: true
      });
    }
    throw error;
  }
}

async function handleMyRoster(interaction) {
  const leagueName = interaction.options.getString('league');
  const userId = interaction.user.id;

  // Get user
  const userResult = await pool.query(
    'SELECT id FROM users WHERE discord_id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return interaction.reply({
      content: 'You need to sign up first!',
      ephemeral: true
    });
  }

  const dbUserId = userResult.rows[0].id;

  // Get roster
  const result = await pool.query(`
    SELECT 
      p.pet_id,
      p.name,
      p.breed,
      p.animal_type,
      p.status
    FROM roster_entries re
    JOIN pets p ON p.id = re.pet_id
    JOIN leagues l ON l.id = re.league_id
    WHERE re.user_id = $1 AND l.name = $2
    ORDER BY re.drafted_at DESC
  `, [dbUserId, leagueName]);

  if (result.rows.length === 0) {
    return interaction.reply({
      content: `No pets in "${leagueName}" league!`,
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle(`Your Roster - ${leagueName}`)
    .setDescription(`${result.rows.length} pet(s)`)
    .addFields(
      result.rows.slice(0, 25).map(pet => ({
        name: pet.name,
        value: `${pet.breed} • ${pet.animal_type} • ${pet.status}`,
        inline: false
      }))
    );

  interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleLeaderboard(interaction) {
  const leagueName = interaction.options.getString('league');

  // Get league
  const leagueResult = await pool.query(
    'SELECT id FROM leagues WHERE name = $1',
    [leagueName]
  );

  if (leagueResult.rows.length === 0) {
    return interaction.reply({
      content: `League "${leagueName}" not found!`,
      ephemeral: true
    });
  }

  const leagueId = leagueResult.rows[0].id;

  // Get leaderboard
  const result = await pool.query(`
    SELECT 
      u.first_name,
      u.city,
      lc.total_points,
      ROW_NUMBER() OVER (ORDER BY lc.total_points DESC) as rank
    FROM leaderboard_cache lc
    JOIN users u ON u.id = lc.user_id
    WHERE lc.league_id = $1
    ORDER BY lc.total_points DESC
    LIMIT 10
  `, [leagueId]);

  if (result.rows.length === 0) {
    return interaction.reply({
      content: `No players in "${leagueName}"!`,
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#f39c12')
    .setTitle(`🏆 Leaderboard - ${leagueName}`)
    .addFields(
      result.rows.map((row, idx) => ({
        name: `#${row.rank} ${row.first_name || 'Anonymous'}`,
        value: `${row.total_points} points${row.city ? ` • ${row.city}` : ''}`,
        inline: false
      }))
    );

  interaction.reply({ embeds: [embed] });
}

async function handleSetPoints(interaction) {
  // Check if user is admin
  if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
    return interaction.reply({
      content: 'You need admin role to use this command!',
      ephemeral: true
    });
  }

  const breed = interaction.options.getString('breed');
  const points = interaction.options.getInteger('points');

  await pool.query(`
    INSERT INTO breed_points (breed, points)
    VALUES ($1, $2)
    ON CONFLICT (breed)
    DO UPDATE SET points = $2, updated_at = NOW()
  `, [breed, points]);

  const embed = new EmbedBuilder()
    .setColor('#27ae60')
    .setTitle('✓ Points Updated')
    .addFields(
      { name: 'Breed', value: breed },
      { name: 'Points', value: points.toString() }
    );

  interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleListBreeds(interaction) {
  const result = await pool.query(
    'SELECT breed, points FROM breed_points ORDER BY points DESC, breed ASC'
  );

  if (result.rows.length === 0) {
    return interaction.reply({
      content: 'No custom breed points set yet!',
      ephemeral: true
    });
  }

  // Split into chunks of 25 fields max per embed
  const chunks = [];
  for (let i = 0; i < result.rows.length; i += 25) {
    const chunk = result.rows.slice(i, i + 25);
    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('Breed Points')
      .setDescription(`Page ${Math.floor(i / 25) + 1}`)
      .addFields(
        chunk.map(row => ({
          name: row.breed,
          value: `${row.points} point(s)`,
          inline: true
        }))
      );
    chunks.push(embed);
  }

  interaction.reply({ embeds: chunks, ephemeral: true });
}

// ============ NOTIFICATIONS ============

async function notifyNewPets(pets) {
  const channel = await bot.channels.fetch(NOTIFICATIONS_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor('#2ecc71')
    .setTitle('🆕 New Pets Available!')
    .setDescription(`${pets.length} new pets added to the league`)
    .addFields(
      pets.slice(0, 10).map(pet => ({
        name: pet.name,
        value: `${pet.breed} • ${pet.animal_type}`,
        inline: true
      }))
    );

  if (pets.length > 10) {
    embed.addFields({
      name: '\u200b',
      value: `... and ${pets.length - 10} more`
    });
  }

  channel.send({ embeds: [embed] });
}

async function notifyAdoptedPets(points) {
  const channel = await bot.channels.fetch(NOTIFICATIONS_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor('#e74c3c')
    .setTitle('🎉 Pet Adopted!')
    .setDescription(`Someone's drafted pet just got adopted!`)
    .addFields(
      points.slice(0, 10).map(p => ({
        name: p.userName,
        value: `+${p.points} points for ${p.petName}`,
        inline: false
      }))
    );

  channel.send({ embeds: [embed] });
}

async function notifyLeaderboardUpdate(league) {
  const channel = await bot.channels.fetch(NOTIFICATIONS_CHANNEL_ID);
  if (!channel) return;

  // Get top 3
  const result = await pool.query(`
    SELECT 
      u.first_name,
      lc.total_points,
      ROW_NUMBER() OVER (ORDER BY lc.total_points DESC) as rank
    FROM leaderboard_cache lc
    JOIN users u ON u.id = lc.user_id
    WHERE lc.league_id = $1
    ORDER BY lc.total_points DESC
    LIMIT 3
  `, [league.id]);

  const embed = new EmbedBuilder()
    .setColor('#f39c12')
    .setTitle(`📊 Leaderboard Update - ${league.name}`)
    .addFields(
      result.rows.map((row, idx) => ({
        name: `${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} #${row.rank} ${row.first_name || 'Anonymous'}`,
        value: `${row.total_points} points`,
        inline: false
      }))
    );

  channel.send({ embeds: [embed] });
}

// ============ EXPORT FUNCTIONS ============

module.exports = {
  startBot: () => {
    bot.login(DISCORD_BOT_TOKEN);
  },
  notifyNewPets,
  notifyAdoptedPets,
  notifyLeaderboardUpdate
};
