/**
 * Skills Grid Interaction
 * Implements the "Spotlight/Bubble" effect moving across cards.
 */

document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.skill-card');
  const grid = document.getElementById('skills-grid');

  if (!grid) return;

  grid.addEventListener('mousemove', (e) => {
    // For each card, calculate mouse position relative to the card
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
});
