/**
 * Custom Cursor
 * Magnetic trailing cursor with hover effects
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only init on fine pointers (mouse), skip touch devices
    if (!window.matchMedia('(pointer: fine)').matches) return;
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cursor = document.getElementById('cursor');
    const follower = document.getElementById('cursor-follower');

    if (!cursor || !follower) return;

    let posX = 0, posY = 0;
    let mouseX = 0, mouseY = 0;

    // Move cursor immediately
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Main dot follows instantly
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

        // Ensure visible
        cursor.style.opacity = '1';
        follower.style.opacity = '1';
    });

    // Follower trails with lerp
    function animate() {
        posX += (mouseX - posX) * 0.1; // Smooth factor
        posY += (mouseY - posY) * 0.1;

        follower.style.transform = `translate3d(${posX - 18}px, ${posY - 18}px, 0)`; // Offset by radius

        requestAnimationFrame(animate);
    }
    animate();

    // Hover states via event delegation
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('a, button, input, textarea, [data-tilt], .project-card, .stat, .project-panel')) {
            cursor.classList.add('hover');
            follower.classList.add('hover');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('a, button, input, textarea, [data-tilt], .project-card, .stat, .project-panel')) {
            cursor.classList.remove('hover');
            follower.classList.remove('hover');
        }
    });

    // Hide when leaving window
    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
        follower.style.opacity = '0';
    });
});