/**
 * Gravity Falling Skills
 * 2D Physics Engine (Verlet Integration) for falling pill shapes.
 */

const SKILLS_LIST = [
    "Vue.js", "Nuxt", "JavaScript", "TypeScript", "Tailwind",
    "Three.js", "WebGL", "Laravel", "Node.js", "AWS",
    "Figma", "Docker", "Git", "CI/CD", "HTML5", "CSS3",
    "GSAP", "React", "Sass", "PHP"
];

const PHYSICS_CONFIG = {
    gravity: 0.5,
    friction: 0.8, // Air resistance
    bounce: 0.6,   // Restitution
    interactionRadius: 150,
    mouseForce: 2
};

class Pill {
    constructor(x, y, text, ctx) {
        this.pos = { x: x, y: y };
        this.oldPos = { x: x, y: y - (Math.random() * 20 - 10) }; // Initial velocity
        this.radius = 24; // Height/2
        this.width = 0; // Calculated below
        this.text = text;
        this.mass = 1;
        this.isDragging = false;
        
        // Calculate width based on text
        ctx.font = 'bold 16px "Inter", sans-serif';
        const metrics = ctx.measureText(text);
        this.width = metrics.width + 40; // Padding
        this.halfWidth = this.width / 2;
    }
    
    update(width, height) {
        if (this.isDragging) return;

        const vx = (this.pos.x - this.oldPos.x) * PHYSICS_CONFIG.friction;
        const vy = (this.pos.y - this.oldPos.y) * PHYSICS_CONFIG.friction;

        this.oldPos.x = this.pos.x;
        this.oldPos.y = this.pos.y;

        this.pos.x += vx;
        this.pos.y += vy + PHYSICS_CONFIG.gravity;

        // Constraints (Screen Bounds)
        if (this.pos.x - this.halfWidth < 0) {
            this.pos.x = this.halfWidth;
            this.oldPos.x = this.pos.x + vx * PHYSICS_CONFIG.bounce;
        } else if (this.pos.x + this.halfWidth > width) {
            this.pos.x = width - this.halfWidth;
            this.oldPos.x = this.pos.x + vx * PHYSICS_CONFIG.bounce;
        }

        if (this.pos.y - this.radius < 0) {
            this.pos.y = this.radius;
            this.oldPos.y = this.pos.y + vy * PHYSICS_CONFIG.bounce;
        } else if (this.pos.y + this.radius > height) {
            this.pos.y = height - this.radius;
            this.oldPos.y = this.pos.y + vy * PHYSICS_CONFIG.bounce; // Reverse velocity
        }
    }

    draw(ctx) {
        ctx.beginPath();
        // Pill shape: rounded rect
        // x, y is center
        ctx.roundRect(
            this.pos.x - this.halfWidth, 
            this.pos.y - this.radius, 
            this.width, 
            this.radius * 2, 
            this.radius
        );
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#e5e7eb';
        ctx.stroke();

        ctx.fillStyle = '#111827';
        ctx.font = 'bold 14px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.pos.x, this.pos.y);
    }
}

class PhysicsScene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if(!this.container) return;

        this.canvas = document.createElement('canvas');
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.pills = [];
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.mouse = { x: 0, y: 0, isDown: false };
        
        this.init();
        this.bindEvents();
        this.animate();
    }

    init() {
        this.resize();
        
        // Spawn pills
        SKILLS_LIST.forEach((skill, i) => {
            const x = Math.random() * (this.width - 100) + 50;
            const y = -Math.random() * 500 - 50; // Start above screen
            this.pills.push(new Pill(x, y, skill, this.ctx));
        });
    }

    resolveCollisions() {
        // Naive O(N^2) collision - adequate for < 50 items
        for (let i = 0; i < this.pills.length; i++) {
            for (let j = i + 1; j < this.pills.length; j++) {
                const p1 = this.pills[i];
                const p2 = this.pills[j];

                const dx = p1.pos.x - p2.pos.x;
                const dy = p1.pos.y - p2.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Approximation: Treat collision as two circles with average radius of width/2
                // Better: Axis Aligned Bounding Box or Separating Axis Theorem (SAT)
                // For pills, we can approximate radius as height (24) + a bit of width factor?
                // Visual overlap is okay. Let's use a simpler Circle Circle collision
                // The effective radius for collision:
                const minDist = p1.radius + p2.radius + 10; // + padding

                if (dist < minDist) {
                    const angle = Math.atan2(dy, dx);
                    const tx = p2.pos.x + Math.cos(angle) * minDist;
                    const ty = p2.pos.y + Math.sin(angle) * minDist;

                    const ax = (tx - p1.pos.x) * 0.5; // Springiness
                    const ay = (ty - p1.pos.y) * 0.5;

                    // Push apart without changing velocity much (Verlet handles position)
                    p1.pos.x += ax;
                    p1.pos.y += ay;
                    p2.pos.x -= ax;
                    p2.pos.y -= ay;
                }
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Interaction: Repel/Attract or Drag
        // Let's implement simple "Stir" - Mouse velocity impacts pills
        // Or if mouse is down, pull towards mouse (Gravity well)
        
        if (this.mouse.isDown) {
            // Drag logic (simple attraction to mouse for now, or throwing)
             this.pills.forEach(p => {
                const dx = this.mouse.x - p.pos.x;
                const dy = this.mouse.y - p.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                     p.pos.x += dx * 0.05;
                     p.pos.y += dy * 0.05;
                }
             });
        } 
        // Mouse Repel (Stirring)
        else {
             this.pills.forEach(p => {
                const dx = p.pos.x - this.mouse.x;
                const dy = p.pos.y - this.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    const force = (100 - dist) / 100;
                    p.pos.x += dx * force * 0.5;
                    p.pos.y += dy * force * 0.5;
                }
             });
        }

        this.pills.forEach(p => p.update(this.width, this.height));
        
        // Solve constraints multiple times for stability
        for(let k=0; k<3; k++) this.resolveCollisions();

        this.pills.forEach(p => p.draw(this.ctx));

        requestAnimationFrame(this.animate.bind(this));
    }

    resize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    bindEvents() {
        window.addEventListener('resize', this.resize.bind(this));
        
        this.canvas.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', () => this.mouse.isDown = true);
        window.addEventListener('mouseup', () => this.mouse.isDown = false);
        
        // Touch support
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.touches[0].clientX - rect.left;
            this.mouse.y = e.touches[0].clientY - rect.top;
            this.mouse.isDown = true;
        }, { passive: false });
        
        window.addEventListener('touchend', () => this.mouse.isDown = false);
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new PhysicsScene('skills-physics-container');
    }, 500);
});
