// frontend/js/leagues/leaderboard.js - Leaderboard functions

window.loadLeaderboard = async function(leagueId) {
  try {
    console.log('[LEADERBOARD] Loading for league:', leagueId);
    
    const leaderboard = await window.apiCall(`/api/leaderboard/${leagueId}`);
    
    if (!leaderboard) return;
    
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    if (leaderboard.length === 0) {
      container.innerHTML = '<p>No players in this league yet.</p>';
      return;
    }

    container.innerHTML = leaderboard.map((entry, idx) => {
      let medal = '';
      if (idx === 0) medal = '🥇';
      else if (idx === 1) medal = '🥈';
      else if (idx === 2) medal = '🥉';

      return `
        <div class="leaderboard-entry">
          <div class="leaderboard-rank">#${entry.rank} ${medal}</div>
          <div class="leaderboard-info">
            <div class="leaderboard-name">${entry.first_name || 'Anonymous'}</div>
            <div class="leaderboard-city">${entry.city || 'Location unknown'}</div>
          </div>
          <div class="leaderboard-points">${entry.total_points} pts</div>
        </div>
      `;
    }).join('');
    
    console.log('[LEADERBOARD] Rendered', leaderboard.length, 'entries');
  } catch (error) {
    console.error('[LEADERBOARD Error]:', error);
    const container = document.getElementById('leaderboard-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    window.showAlert('Error loading leaderboard: ' + error.message, 'danger');
  }
};

console.log('✓ leaderboard.js loaded');