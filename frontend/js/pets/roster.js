// frontend/js/pets/roster.js - Roster display functions

window.loadLeagueRosters = async function(leagueId) {
  try {
    console.log('[ROSTERS] Loading rosters for league:', leagueId);
    
    const rosters = await window.apiCall(`/api/drafting/league/${leagueId}/rosters`);
    
    if (!rosters) return;
    
    const container = document.getElementById('rosters-list');
    if (!container) return;

    if (rosters.length === 0) {
      container.innerHTML = '<p>No rosters yet.</p>';
      return;
    }

    const currentUser = window.getUser();
    const currentUserId = currentUser?.id;

    const sortedRosters = rosters.sort((a, b) => {
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });

    const rosterHtml = sortedRosters.map(roster => {
      const playerName = roster.first_name || 'Anonymous';
      const pets = roster.pets || [];
      const isCurrentUser = roster.user_id === currentUserId;

      if (pets.length === 0) {
        return `
          <div class="roster-player ${isCurrentUser ? 'roster-player-me' : ''}">
            <div class="roster-player-name">${playerName}${isCurrentUser ? ' (You)' : ''}</div>
            <p style="font-size: 13px; color: #7f8c8d; margin: 0;">No pets drafted yet</p>
          </div>
        `;
      }

      const petsHtml = pets.map(pet => {
        const daysOnRoster = window.calculateDaysSince(pet.drafted_date);
        const daysInShelter = window.calculateDaysSince(pet.brought_to_shelter);
        const source = pet.source || 'Unknown';
        
        return `
          <div class="roster-pet-with-photo">
            <div class="roster-pet-photo">
              ${pet.photo_url 
                ? `<img src="${pet.photo_url}" alt="${pet.name}" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" onerror="this.parentElement.innerHTML='<div style=\\"display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #ecf0f1; color: #95a5a6; font-size: 32px;\\">📷</div>';">`
                : '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #ecf0f1; color: #95a5a6; font-size: 32px;">📷</div>'
              }
            </div>
            <div class="roster-pet-info">
              <div class="roster-pet-name">${pet.name}</div>
              <div class="roster-pet-stats">
                <span class="roster-pet-stat"><strong>Breed:</strong> ${pet.breed || 'N/A'}</span>
                <span class="roster-pet-stat"><strong>Type:</strong> ${pet.animal_type || 'N/A'}</span>
                <span class="roster-pet-stat"><strong>Gender:</strong> ${pet.gender || 'N/A'}</span>
                <span class="roster-pet-stat"><strong>Source:</strong> ${source}</span>
                <span class="roster-pet-stat"><strong>On Roster:</strong> ${daysOnRoster}d</span>
                <span class="roster-pet-stat"><strong>In Shelter:</strong> ${daysInShelter}d</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="roster-player ${isCurrentUser ? 'roster-player-me' : ''}">
          <div class="roster-player-name">${playerName}${isCurrentUser ? ' (You)' : ''}</div>
          ${petsHtml}
        </div>
      `;
    }).join('');

    container.innerHTML = rosterHtml;
    console.log('[ROSTERS] Rendered', rosters.length, 'rosters');
  } catch (error) {
    console.error('[ROSTERS Error]:', error);
    const container = document.getElementById('rosters-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    window.showAlert('Error loading rosters: ' + error.message, 'danger');
  }
};

window.loadRoster = async function(leagueId) {
  try {
    console.log('[ROSTER] Loading for league:', leagueId);
    
    const roster = await window.apiCall(`/api/drafting/${leagueId}`);
    
    if (!roster) return;
    
    const container = document.getElementById('roster-list');
    if (!container) return;

    if (roster.length === 0) {
      container.innerHTML = '<p>No pets drafted yet.</p>';
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        ${roster.map(pet => `
          <div class="pet-grid-item">
            <div class="pet-grid-photo">
              ${pet.photo_url 
                ? `<img src="${pet.photo_url}" alt="${pet.name}" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" onerror="this.parentElement.innerHTML='<div style=\\"display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #ecf0f1; color: #95a5a6; font-size: 32px;\\">📷</div>';">`
                : '<div class="pet-photo-placeholder">📷</div>'
              }
            </div>
            <div class="pet-grid-info">
              <div class="pet-grid-header">
                <h3 class="pet-grid-name">${pet.name}</h3>
                <p class="pet-grid-breed">${pet.breed}</p>
              </div>
              <div class="pet-grid-details">
                <span class="pet-grid-detail"><strong>Type:</strong> ${pet.animal_type}</span>
                <span class="pet-grid-detail"><strong>Gender:</strong> ${pet.gender || 'N/A'}</span>
                <span class="pet-grid-detail"><strong>Status:</strong> <span class="badge ${pet.status === 'available' ? 'badge-success' : 'badge-danger'}">${pet.status}</span></span>
              </div>
              <button class="btn btn-danger btn-block pet-grid-button" onclick="app.undraftPet('${pet.pet_id}', '${leagueId}')">Remove</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    console.log('[ROSTER] Rendered', roster.length, 'pets');
  } catch (error) {
    console.error('[ROSTER Error]:', error);
    const container = document.getElementById('roster-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    window.showAlert('Error loading roster: ' + error.message, 'danger');
  }
};

console.log('✓ roster.js loaded');