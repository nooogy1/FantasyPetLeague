// frontend/js/pets/pets.js - Pet listing, pagination, filtering & sorting

let allPetsData = [];
let petsCurrentPage = 1;
let leagueAvailablePetsData = [];
let leagueAvailablePetsFiltered = [];
let leagueAvailablePetsPage = 1;

// Filter state
let petFilters = {
  animalType: '',
  gender: '',
  ageGroup: '',
  breed: '',
  daysMin: 0,
  daysMax: 365,
  sort: 'name-az'
};

// ===== HELPER FUNCTIONS =====

function getAgeInMonths(ageText) {
  if (!ageText) return 0;
  
  let months = 0;
  const yearMatch = ageText.match(/(\d+)\s*year/i);
  const monthMatch = ageText.match(/(\d+)\s*month/i);
  
  if (yearMatch) months += parseInt(yearMatch[1]) * 12;
  if (monthMatch) months += parseInt(monthMatch[1]);
  
  return months;
}

function getAgeGroup(ageText) {
  if (!ageText) return null;
  
  const months = getAgeInMonths(ageText);
  
  if (months < 12) return 'puppy';
  if (months < 36) return 'young';
  if (months < 84) return 'adult';
  return 'senior';
}

function applyPetFilters(pets) {
  let filtered = [...pets];
  
  // Animal Type filter
  if (petFilters.animalType) {
    filtered = filtered.filter(p => p.animal_type === petFilters.animalType);
  }
  
  // Gender filter
  if (petFilters.gender) {
    filtered = filtered.filter(p => p.gender === petFilters.gender);
  }
  
  // Age Group filter
  if (petFilters.ageGroup) {
    filtered = filtered.filter(p => {
      const ageGroup = getAgeGroup(p.age);
      return ageGroup === petFilters.ageGroup;
    });
  }
  
  // Breed filter (contains, case-insensitive)
  if (petFilters.breed) {
    filtered = filtered.filter(p => 
      p.breed && p.breed.toLowerCase().includes(petFilters.breed.toLowerCase())
    );
  }
  
  // Days in Shelter filter
  const daysMin = parseInt(petFilters.daysMin);
  const daysMax = parseInt(petFilters.daysMax);
  filtered = filtered.filter(p => {
    const daysSince = window.calculateDaysSince(p.brought_to_shelter);
    return daysSince >= daysMin && daysSince <= daysMax;
  });
  
  // Sort
  filtered.sort((a, b) => {
    switch(petFilters.sort) {
      case 'name-az':
        return (a.name || '').localeCompare(b.name || '');
      
      case 'days-old':
        // Longest in shelter first (oldest)
        return window.calculateDaysSince(b.brought_to_shelter) - window.calculateDaysSince(a.brought_to_shelter);
      
      case 'days-new':
        // Shortest in shelter first (newest)
        return window.calculateDaysSince(a.brought_to_shelter) - window.calculateDaysSince(b.brought_to_shelter);
      
      case 'age-old':
        // Oldest animals first
        return getAgeInMonths(b.age) - getAgeInMonths(a.age);
      
      case 'age-new':
        // Youngest animals first
        return getAgeInMonths(a.age) - getAgeInMonths(b.age);
      
      default:
        return 0;
    }
  });
  
  return filtered;
}

// ===== UPDATE FILTERS =====

function updatePetFilters() {
  console.log('[FILTERS] Updating pet filters');
  
  // Update filter state from UI
  petFilters.animalType = document.getElementById('filter-animal-type').value;
  petFilters.gender = document.getElementById('filter-gender').value;
  petFilters.ageGroup = document.getElementById('filter-age-group').value;
  petFilters.breed = document.getElementById('filter-breed').value;
  petFilters.daysMin = parseInt(document.getElementById('filter-days-min').value);
  petFilters.daysMax = parseInt(document.getElementById('filter-days-max').value);
  petFilters.sort = document.getElementById('filter-sort').value;
  
  // Update display values
  document.getElementById('days-min-value').textContent = petFilters.daysMin + ' days';
  document.getElementById('days-max-value').textContent = petFilters.daysMax + ' days';
  document.getElementById('days-range-display').textContent = petFilters.daysMin + ' - ' + petFilters.daysMax;
  
  console.log('[FILTERS] Current filters:', petFilters);
  
  // Apply filters to all available pets
  leagueAvailablePetsFiltered = applyPetFilters(leagueAvailablePetsData);
  
  // Reset pagination to page 1
  leagueAvailablePetsPage = 1;
  
  console.log('[FILTERS] Filtered to', leagueAvailablePetsFiltered.length, 'pets');
  
  // Re-render
  const leagueId = new URLSearchParams(window.location.search).get('id');
  renderLeagueAvailablePets(leagueId);
}

// ===== RESET FILTERS =====

function resetPetFilters() {
  console.log('[FILTERS] Resetting all filters');
  
  // Reset UI
  document.getElementById('filter-animal-type').value = '';
  document.getElementById('filter-gender').value = '';
  document.getElementById('filter-age-group').value = '';
  document.getElementById('filter-breed').value = '';
  document.getElementById('filter-days-min').value = 0;
  document.getElementById('filter-days-max').value = 365;
  document.getElementById('filter-sort').value = 'name-az';
  
  // Reset filter state
  petFilters = {
    animalType: '',
    gender: '',
    ageGroup: '',
    breed: '',
    daysMin: 0,
    daysMax: 365,
    sort: 'name-az'
  };
  
  // Update display
  document.getElementById('days-min-value').textContent = '0 days';
  document.getElementById('days-max-value').textContent = '365 days';
  document.getElementById('days-range-display').textContent = '0 - 365';
  
  // Show all pets
  leagueAvailablePetsFiltered = [...leagueAvailablePetsData];
  leagueAvailablePetsPage = 1;
  
  const leagueId = new URLSearchParams(window.location.search).get('id');
  renderLeagueAvailablePets(leagueId);
}

// ===== RENDER FUNCTIONS =====

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
        <button class="btn btn-primary btn-block pet-grid-button" onclick="window.draftPetLeaguePreservePage('${pet.pet_id}', '${leagueId}')">Draft Pet</button>
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

// ===== LOAD ALL PETS =====

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

// ===== LOAD LEAGUE AVAILABLE PETS (WITH FILTERING) =====

window.loadLeagueAvailablePets = async function(leagueId) {
  try {
    console.log('[LEAGUE_PETS] Loading available pets for league:', leagueId);
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

    // Store unfiltered data
    leagueAvailablePetsData = availablePets;
    
    // Initialize filtered data with all pets (sorted by default sort)
    leagueAvailablePetsFiltered = applyPetFilters(leagueAvailablePetsData);
    leagueAvailablePetsPage = 1;
    
    // Render filtered pets
    renderLeagueAvailablePets(leagueId);
    
    console.log('[LEAGUE_PETS] Loaded', availablePets.length, 'available pets');
  } catch (error) {
    console.error('[LEAGUE_PETS Error]:', error);
    const container = document.getElementById('pets-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    window.showAlert('Error loading pets: ' + error.message, 'danger');
  }
};

function renderLeagueAvailablePets(leagueId) {
  const container = document.getElementById('pets-list');
  if (!container) return;
  
  if (leagueAvailablePetsFiltered.length === 0) {
    container.innerHTML = '<p>No available pets match your filters.</p>';
    return;
  }
  
  const start = (leagueAvailablePetsPage - 1) * window.LEAGUE_PETS_PER_PAGE;
  const end = start + window.LEAGUE_PETS_PER_PAGE;
  const petsToDisplay = leagueAvailablePetsFiltered.slice(start, end);

  const petsHtml = petsToDisplay.map(pet => renderLeaguePetCard(pet, leagueId)).join('');
  const pagination = renderLeagueAvailablePetsPagination(leagueAvailablePetsFiltered.length, leagueAvailablePetsPage);

  container.innerHTML = `
    <div class="grid grid-3">${petsHtml}</div>
    ${pagination}
  `;
}

window.goToLeaguePagePreserve = function(pageNum) {
  const totalPages = Math.ceil(leagueAvailablePetsFiltered.length / window.LEAGUE_PETS_PER_PAGE);
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
  const petsToDisplay = leagueAvailablePetsFiltered.slice(start, end);
  
  const leagueId = new URLSearchParams(window.location.search).get('id');
  const petsHtml = petsToDisplay.map(pet => renderLeaguePetCard(pet, leagueId)).join('');
  const pagination = renderLeagueAvailablePetsPagination(leagueAvailablePetsFiltered.length, pageNum);
  
  container.innerHTML = `
    <div class="grid grid-3">${petsHtml}</div>
    ${pagination}
  `;

  document.querySelector('.card:has(#pets-list)')?.scrollIntoView({ behavior: 'smooth' });
};

console.log('✓ pets.js loaded');