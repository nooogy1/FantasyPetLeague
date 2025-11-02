// frontend/js/pets/drafting.js - Draft/undraft functions

import { apiCall } from '../utils/api.js';
import { MAX_ROSTER_SIZE } from '../config.js';
import { getUser } from '../utils/storage.js';
import { showAlert } from '../utils/ui.js';

export async function draftPet(petId, leagueId) {
  if (!leagueId) {
    showAlert('Please select a league first', 'warning');
    return;
  }

  try {
    // Check current roster size
    const rosters = await apiCall(`/api/drafting/league/${leagueId}/rosters`);
    const currentUser = getUser();
    const userRoster = rosters?.find(r => r.user_id === currentUser.id);
    const currentRosterSize = userRoster?.pets?.length || 0;

    if (currentRosterSize >= MAX_ROSTER_SIZE) {
      showAlert(`You have reached the maximum roster size of ${MAX_ROSTER_SIZE} pets. Please remove a pet to draft another.`, 'warning');
      console.log('[DRAFT] Roster full:', currentRosterSize, '/', MAX_ROSTER_SIZE);
      return;
    }

    console.log('[DRAFT] Drafting pet', petId, 'to league', leagueId, '- Roster:', currentRosterSize, '/', MAX_ROSTER_SIZE);
    
    const result = await apiCall('/api/drafting', {
      method: 'POST',
      body: JSON.stringify({ leagueId, petId }),
    });

    if (!result) return;

    console.log('[DRAFT] Success');
    showAlert('Pet drafted successfully!', 'success');
    
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (error) {
    console.error('[DRAFT] Error:', error);
    showAlert('Error drafting pet: ' + error.message, 'danger');
  }
}

export async function undraftPet(petId, leagueId) {
  if (!confirm('Remove this pet from your roster?')) return;

  try {
    console.log('[UNDRAFT] Removing pet:', petId);
    
    const result = await apiCall(`/api/drafting/${petId}/${leagueId}`, {
      method: 'DELETE',
    });

    if (!result) return;

    console.log('[UNDRAFT] Success');
    showAlert('Pet removed from roster', 'success');
    // Reload rosters after undrafting
    if (window.app?.loadRoster) {
      window.app.loadRoster(leagueId);
    }
  } catch (error) {
    console.error('[UNDRAFT] Error:', error);
    showAlert('Error removing pet: ' + error.message, 'danger');
  }
}