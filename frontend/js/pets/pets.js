// frontend/js/pets/pets.js - Pet listing and pagination

let allPetsData = [];
let petsCurrentPage = 1;
let leagueAvailablePetsData = [];
let leagueAvailablePetsPage = 1;

function renderPetCard(pet) {
  const daysInShelter = window.calculateDaysSince(pet.brought_to_shelter);
  const source = pet.source || 'Unknown';
  return `
    <div class="pet-grid-item">
      <div class="pet-grid-photo">
        ${pet.photo_url 
          ? `<img src="${pet.photo_url}" alt="${pet.name}" onerror="this.style.display='none'">`
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
          <span class="pet-grid-detail"><strong>Age:</strong> ${pet.age || 'N/A'}</span>
          <span class="pet-grid-detail"><strong>Source:</strong> ${source}</span>
          <span class="pet-grid-detail"><strong>In Shelter:</strong> ${daysInShelter}d</span>
        </div>
      </div>
    </div>
  `;
}

function renderPetsPagination() {
  const totalPages = Math.ceil(allPetsData.length / window.PETS_PER_PAGE);
  if (totalPages <= 1) return '';
  
  let html = '<div class="pagination">';
  
  if (petsCurrentPage > 1) {
    html += `<button class="pagination-button" onclick="app.goToPetsPage(${petsCurrentPage - 1})">← Previous</button>`;
  }
  
  const startPage = Math.max(1, petsCurrentPage - 2);
  const endPage = Math.min(totalPages, petsCurrentPage + 2);
  
  if (startPage > 1) {
    html += `<button class="pagination-button ${petsCurrentPage === 1 ? 'active' : ''}" onclick="app.goToPetsPage(1)">1</button>`;
    if (startPage > 2) html += '<span class="pagination-info">...</span>';
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-button ${petsCurrentPage === i ? 'active' : ''}" onclick="app.goToPetsPage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += '<span class="pagination-info">...</span>';
    html += `<button class="pagination-button ${petsCurrentPage === totalPages ? 'active' : ''}" onclick="app.goToPetsPage(${totalPages})">${totalPages}</button>`;
  }
  
  if (petsCurrentPage < totalPages) {
    html += `<button class="pagination-button" onclick="app.goToPetsPage(${petsCurrentPage + 1})">Next →</button>`;
  }
  
  html += `<span class="pagination-info">Page ${petsCurrentPage} of ${totalPages}</span></div>`;
  return html;
}

window.loadAllPets = async function() {
  try {
    console.log('[PETS] Loading all pets...');
    const pets = await window.apiCall('/api/pets?limit=1000');
    
    if (!pets) return;

    const container = document.getElementById('all-pets-list');
    if (!container) return;

    if (pets.length === 0) {
      container.innerHTML = '<p>Check back soon!</p>';
      return;
    }

    allPetsData = pets;
    petsCurrentPage = 1;
    
    const start = (petsCurrentPage - 1) * window.PETS_PER_PAGE;
    const end = start + window.PETS_PER_PAGE;
    const petsToDisplay = pets.slice(start, end);
    
    const petsHtml = petsToDisplay.map(pet => renderPetCard(pet)).join('');
    const pagination = renderPetsPagination();
    
    container.innerHTML = `
      <div class="grid grid-3">${petsHtml}</div>
      ${pagination}
    `;
    
    console.log('[PETS] Rendered page', petsCurrentPage);
  } catch (error) {
    console.error('[PETS Error]:', error);
    const container = document.getElementById('all-pets-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    window.showAlert('Error loading pets: ' + error.message, 'danger');
  }
};

window.goToPetsPage = function(pageNum) {
  const totalPages = Math.ceil(allPetsData.length / window.PETS_PER_PAGE);
  if (pageNum < 1 || pageNum > totalPages) return;
  
  petsCurrentPage = pageNum;
  const container = document.getElementById('all-pets-list');
  if (!container) return;
  
  const start = (petsCurrentPage - 1) * window.PETS_PER_PAGE;
  const end = start + window.PETS_PER_PAGE;
  const petsToDisplay = allPetsData.slice(start, end);
  
  const petsHtml = petsToDisplay.map(pet => renderPetCard(pet)).join('');
  const pagination = renderPetsPagination();
  
  container.innerHTML = `
    <div class="grid grid-3">${petsHtml}</div>
    ${pagination}
  `;
  
  document.querySelector('.card:has(#all-pets-list)')?.scrollIntoView({ behavior: 'smooth' });
  console.log('[PETS] Navigated to page', petsCurrentPage);
};

function renderLeaguePetCard(pet, leagueId) {
  const daysInShelter = window.calculateDaysSince(pet.brought_to_shelter);
  const source = pet.source || 'Unknown';
  return `
    <div class="pet-grid-item">
      <div class="pet-grid-photo">
        ${pet.photo_url 
          ? `<img src="${pet.photo_url}" alt="${pet.name}" onerror="this.style.display='none'">`
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
          <span class="pet-grid-detail"><strong>Age:</strong> ${pet.age || 'N/A'}</span>
          <span class="pet-grid-detail"><strong>Source:</strong> ${source}</span>
          <span class="pet-grid-detail"><strong>In Shelter:</strong> ${daysInShelter}d</span>
        </div>
        <button class="btn btn-primary btn-block pet-grid-button" onclick="window.draftPetLeague('${pet.pet_id}', '${leagueId}')">Draft Pet</button>
      </div>
    </div>
  `;
}

function renderLeagueAvailablePetsPagination(totalPets, currentPage) {
  const totalPages = Math.ceil(totalPets / window.LEAGUE_PETS_PER_PAGE);
  if (totalPages <= 1) return '';
  
  let html = '<div class="pagination">';
  
  if (currentPage > 1) {
    html += `<button class="pagination-button" onclick="app.goToLeaguePagePreserve(${currentPage - 1})">← Previous</button>`;
  }
  
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  if (startPage > 1) {
    html += `<button class="pagination-button ${currentPage === 1 ? 'active' : ''}" onclick="app.goToLeaguePagePreserve(1)">1</button>`;
    if (startPage > 2) html += '<span class="pagination-info">...</span>';
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-button ${currentPage === i ? 'active' : ''}" onclick="app.goToLeaguePagePreserve(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += '<span class="pagination-info">...</span>';
    html += `<button class="pagination-button ${currentPage === totalPages ? 'active' : ''}" onclick="app.goToLeaguePagePreserve(${totalPages})">${totalPages}</button>`;
  }
  
  if (currentPage < totalPages) {
    html += `<button class="pagination-button" onclick="app.goToLeaguePagePreserve(${currentPage + 1})">Next →</button>`;
  }
  
  html += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span></div>`;
  return html;
}

window.loadLeagueAvailablePets = async function(leagueId) {
  try {
    const allPets = await window.apiCall('/api/pets?limit=1000');
    const leaguePets = await window.apiCall(`/api/drafting/league/${leagueId}/pets`);
    
    if (!allPets) return;
    
    const container = document.getElementById('pets-list');
    if (!container) return;

    const draftedPetIds = new Set(leaguePets?.map(p => p.pet_id) || []);
    const availablePets = allPets.filter(p => !draftedPetIds.has(p.pet_id));

    if (availablePets.length === 0) {
      container.innerHTML = '<p>No available pets to draft.</p>';
      return;
    }

    leagueAvailablePetsData = availablePets;
    const pageToUse = typeof window.leagueCurrentPage !== 'undefined' ? window.leagueCurrentPage : leagueAvailablePetsPage;
    
    const start = (pageToUse - 1) * window.LEAGUE_PETS_PER_PAGE;
    const end = start + window.LEAGUE_PETS_PER_PAGE;
    const petsToDisplay = availablePets.slice(start, end);

    const petsHtml = petsToDisplay.map(pet => renderLeaguePetCard(pet, leagueId)).join('');
    const pagination = renderLeagueAvailablePetsPagination(availablePets.length, pageToUse);

    container.innerHTML = `
      <div class="grid grid-3">${petsHtml}</div>
      ${pagination}
    `;

    console.log('[LEAGUE_PETS] Rendered page', pageToUse);
  } catch (error) {
    console.error('[LEAGUE_PETS Error]:', error);
    const container = document.getElementById('pets-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    window.showAlert('Error loading pets: ' + error.message, 'danger');
  }
};

window.goToLeaguePagePreserve = function(pageNum) {
  const totalPages = Math.ceil(leagueAvailablePetsData.length / window.LEAGUE_PETS_PER_PAGE);
  if (pageNum < 1 || pageNum > totalPages) return;
  
  if (typeof window.leagueCurrentPage !== 'undefined') {
    window.leagueCurrentPage = pageNum;
  } else {
    leagueAvailablePetsPage = pageNum;
  }
  
  const container = document.getElementById('pets-list');
  if (!container) return;
  
  const start = (pageNum - 1) * window.LEAGUE_PETS_PER_PAGE;
  const end = start + window.LEAGUE_PETS_PER_PAGE;
  const petsToDisplay = leagueAvailablePetsData.slice(start, end);
  
  const leagueId = new URLSearchParams(window.location.search).get('id');
  const petsHtml = petsToDisplay.map(pet => renderLeaguePetCard(pet, leagueId)).join('');
  const pagination = renderLeagueAvailablePetsPagination(leagueAvailablePetsData.length, pageNum);
  
  container.innerHTML = `
    <div class="grid grid-3">${petsHtml}</div>
    ${pagination}
  `;

  document.querySelector('.card:has(#pets-list)')?.scrollIntoView({ behavior: 'smooth' });
};

console.log('✓ pets.js loaded');