// frontend/js/app.js - Main entry point using ES6 modules

// Import utilities
import { getToken, setToken, getUser, setUser, clearAuth } from './utils/storage.js';
import { apiCall } from './utils/api.js';
import { showAlert, calculateDaysSince } from './utils/ui.js';

// Import auth functions
import { checkAuth, handleSignup, handleLogin, handleLogout } from './auth/auth.js';

// Import league functions
import { loadUserLeagues, loadAvailableLeagues, createLeague, joinLeague, viewLeague } from './leagues/leagues.js';
import { loadLeaderboard } from './leagues/leaderboard.js';

// Import pet functions
import { loadAllPets, goToPetsPage, loadLeagueAvailablePets, goToLeaguePagePreserve } from './pets/pets.js';
import { draftPet, undraftPet } from './pets/drafting.js';
import { loadRoster, loadLeagueRosters } from './pets/roster.js';

// Export all functions to window.app for HTML onclick handlers
window.app = {
  // Auth
  handleSignup,
  handleLogin,
  handleLogout,
  checkAuth,
  
  // Leagues
  loadUserLeagues,
  loadAvailableLeagues,
  createLeague,
  joinLeague,
  viewLeague,
  loadLeaderboard,
  
  // Pets
  loadAllPets,
  loadLeagueAvailablePets,
  goToPetsPage,
  goToLeaguePagePreserve,
  
  // Drafting
  draftPet,
  undraftPet,
  
  // Rosters
  loadRoster,
  loadLeagueRosters,
  
  // Utilities
  showAlert,
  calculateDaysSince,
};

// Export globally for league.html onclick handlers
window.goToLeaguePagePreserve = goToLeaguePagePreserve;

console.log('✓ app.js loaded with modular structure');