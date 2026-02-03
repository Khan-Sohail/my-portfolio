/**
 * Preloader Animation
 * Cinematic 0-100% counter with reveal effect
 */

document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('preloader');
    const counter = document.getElementById('loader-counter');
    const content = document.body;
    
    if (!loader || !counter) return;

    // Prevent scrolling during load
    document.body.style.overflow = 'hidden';

    let count = 0;
    const duration = 2000; // 2 seconds total load time
    const interval = 20; // Update every 20ms
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
        count += step;
        
        if (count >= 100) {
            count = 100;
            clearInterval(timer);
            finishLoader();
        }
        
        counter.textContent = Math.round(count);
    }, interval);

    function finishLoader() {
        // Small delay at 100%
        setTimeout(() => {
            // Slide up animation
            loader.style.transform = 'translateY(-100%)';
            loader.style.transition = 'transform 0.8s cubic-bezier(0.76, 0, 0.24, 1)';
            
            // Re-enable scroll
            document.body.style.overflow = '';
            
            // Trigger hero animations
            document.body.classList.add('loaded');
        }, 500);
    }
});
