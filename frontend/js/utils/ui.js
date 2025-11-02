// frontend/js/utils/ui.js - UI helper functions

export function showAlert(message, type = 'info') {
  console.log(`[Alert ${type}]: ${message}`);
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.innerHTML = `
    <span>${message}</span>
    <button class="alert-close" onclick="this.parentElement.remove()">×</button>
  `;
  const container = document.querySelector('.container') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    if (alertDiv.parentNode) alertDiv.remove();
  }, 5000);
}

export function calculateDaysSince(date) {
  if (!date) return 0;
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}