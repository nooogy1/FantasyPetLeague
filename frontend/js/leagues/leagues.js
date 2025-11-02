// frontend/js/leagues/leagues.js - League management functions

window.loadUserLeagues = async function() {
  try {
    console.log('[LEAGUES] Loading user leagues...');
    const leagues = await window.apiCall('/api/leagues');
    
    if (!leagues) {
      console.log('[LEAGUES] No response from API');
      return;
    }
    
    const container = document.getElementById('your-leagues-list');
    if (!container) return;

    if (leagues.length === 0) {
      container.innerHTML = '<p>You are not in any leagues yet. Join one or create a new league!</p>';
      return;
    }

    const leaguesWithCounts = await Promise.all(
      leagues.map(async (league) => {
        try {
          const members = await window.apiCall(`/api/leagues/${league.id}/members`);
          return { ...league, memberCount: members ? members.length : 0 };
        } catch (e) {
          console.warn('[LEAGUES] Could not load member count for', league.id);
          return { ...league, memberCount: 0 };
        }
      })
    );

    container.innerHTML = leaguesWithCounts.map(league => `
      <div class="league-entry">
        <div class="league-info">
          <div class="league-name">${league.name}</div>
          <div class="league-meta">👥 ${league.memberCount} player${league.memberCount !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary btn-small" onclick="app.viewLeague('${league.id}')">View</button>
      </div>
    `).join('');
    
    console.log('[LEAGUES] Rendered', leagues.length, 'leagues');
  } catch (error) {
    console.error('[LEAGUES Error]:', error);
    const container = document.getElementById('your-leagues-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
  }
};

window.loadAvailableLeagues = async function() {
  try {
    console.log('[AVAILABLE_LEAGUES] Loading...');
    const allLeagues = await window.apiCall('/api/leagues');
    
    if (!allLeagues) return;
    
    const container = document.getElementById('available-leagues-list');
    if (!container) return;

    if (allLeagues.length === 0) {
      container.innerHTML = '<p>No available leagues to join.</p>';
      return;
    }

    container.innerHTML = allLeagues.map(league => `
      <div class="league-entry">
        <div class="league-info">
          <div class="league-name">${league.name}</div>
          <div class="league-meta">👥 ${league.memberCount || 0} players</div>
        </div>
        <button class="btn btn-success btn-small" onclick="app.joinLeague('${league.id}')">Join</button>
      </div>
    `).join('');
    
    console.log('[AVAILABLE_LEAGUES] Rendered', allLeagues.length, 'leagues');
  } catch (error) {
    console.error('[AVAILABLE_LEAGUES Error]:', error);
  }
};

window.createLeague = async function(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.leagueName?.value;

  if (!name) {
    window.showAlert('Please enter a league name', 'warning');
    return;
  }

  try {
    console.log('[CREATE_LEAGUE] Creating:', { name });
    
    const response = await window.apiCall('/api/leagues', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (!response) return;

    console.log('[CREATE_LEAGUE] Success');
    window.showAlert('League created successfully!', 'success');
    setTimeout(() => {
      window.location.href = `/league.html?id=${response.id}`;
    }, 1000);
  } catch (error) {
    console.error('[CREATE_LEAGUE Error]:', error);
    window.showAlert('Error creating league: ' + error.message, 'danger');
  }
};

window.joinLeague = async function(leagueId) {
  try {
    console.log('[JOIN_LEAGUE] Joining league:', leagueId);
    
    const result = await window.apiCall(`/api/leagues/${leagueId}/join`, {
      method: 'POST',
    });

    if (!result) return;

    console.log('[JOIN_LEAGUE] Success');
    window.showAlert('Joined league successfully!', 'success');
    setTimeout(() => {
      window.location.href = `/league.html?id=${leagueId}`;
    }, 1000);
  } catch (error) {
    console.error('[JOIN_LEAGUE Error]:', error);
    window.showAlert('Error joining league: ' + error.message, 'danger');
  }
};

window.viewLeague = function(leagueId) {
  window.location.href = `/league.html?id=${leagueId}`;
};

console.log('✓ leagues.js loaded');