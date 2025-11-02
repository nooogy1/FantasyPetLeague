// frontend/js/pets/drafting.js - Draft/undraft functions

window.draftPet = async function(petId, leagueId) {
  if (!leagueId) {
    window.showAlert('Please select a league first', 'warning');
    return;
  }

  try {
    console.log('[DRAFT] Drafting pet', petId, 'to league', leagueId);
    
    const result = await window.apiCall('/api/drafting', {
      method: 'POST',
      body: JSON.stringify({ leagueId, petId }),
    });

    if (!result) return;

    console.log('[DRAFT] Success');
    window.showAlert('Pet drafted successfully!', 'success');
    
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (error) {
    console.error('[DRAFT Error]:', error);
    window.showAlert('Error drafting pet: ' + error.message, 'danger');
  }
};

window.undraftPet = async function(petId, leagueId) {
  if (!confirm('Remove this pet from your roster?')) return;

  try {
    console.log('[UNDRAFT] Removing pet:', petId);
    
    const result = await window.apiCall(`/api/drafting/${petId}/${leagueId}`, {
      method: 'DELETE',
    });

    if (!result) return;

    console.log('[UNDRAFT] Success');
    window.showAlert('Pet removed from roster', 'success');
    if (window.app?.loadRoster) {
      window.app.loadRoster(leagueId);
    }
  } catch (error) {
    console.error('[UNDRAFT Error]:', error);
    window.showAlert('Error removing pet: ' + error.message, 'danger');
  }
};

console.log('✓ drafting.js loaded');