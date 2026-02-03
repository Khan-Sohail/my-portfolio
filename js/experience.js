/**
 * Experience Timeline Interaction
 * Highlights items and fills progress bar based on scroll position.
 */

document.addEventListener('DOMContentLoaded', () => {
    const timeline = document.getElementById('scroll-timeline');
    const progress = document.getElementById('timeline-progress');
    const items = document.querySelectorAll('.timeline-row');
    
    if (!timeline || !progress) return;

    // 1. Progress Bar Logic
    function updateProgress() {
        const rect = timeline.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Start filling when top of timeline hits roughly 40% viewport height
        const startOffset = windowHeight * 0.6; 
        const endOffset = windowHeight * 0.4;
        
        const totalHeight = timeline.offsetHeight;
        const scrollPos = -rect.top + startOffset;
        
        let percentage = (scrollPos / totalHeight) * 100;
        
        // Clamping
        percentage = Math.max(0, Math.min(100, percentage));
        
        progress.style.height = `${percentage}%`;
        
        requestAnimationFrame(updateProgress);
    }
    
    window.addEventListener('scroll', updateProgress);
    updateProgress();

    // 2. Highlight Active Items
    const observerOptions = {
        root: null,
        rootMargin: '-40% 0px -40% 0px', // Active only when in center 20%
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            } else {
                entry.target.classList.remove('active');
            }
        });
    }, observerOptions);

    items.forEach(item => {
        observer.observe(item);
    });
});
