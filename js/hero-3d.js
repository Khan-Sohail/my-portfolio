/**
 * Three.js Hero Background
 * Creates a subtle, interactive 3D particle field with depth
 */

// Configuration
const CONFIG = {
  particleCount: 1500,
  particleSize: 1.5,
  particleColor: 0x6366f1, // Indigo accent
  bgColor: 0x0a0a0a,      // Matches --bg-primary
  mouseSensitivity: 0.05,
  rotationSpeed: 0.001
};

class HeroScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.init();
    this.createParticles();
    this.animate();
    this.bindEvents();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(CONFIG.bgColor, 0.002);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 200;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.mouseX = 0;
    this.mouseY = 0;
    this.targetX = 0;
    this.targetY = 0;
  }

  createParticles() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const sizes = [];

    // Create a random distribution of particles in a sphere/cloud
    for (let i = 0; i < CONFIG.particleCount; i++) {
      const x = (Math.random() - 0.5) * 800;
      const y = (Math.random() - 0.5) * 800;
      const z = (Math.random() - 0.5) * 800;

      vertices.push(x, y, z);
      sizes.push(Math.random() * CONFIG.particleSize);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    // Custom shader material for round particles with vertex colors support
    const material = new THREE.PointsMaterial({
      color: CONFIG.particleColor,
      size: CONFIG.particleSize,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);

    // Add a secondary system for depth perception (white dust)
    const dustGeometry = new THREE.BufferGeometry();
    const dustVertices = [];
    for (let i = 0; i < CONFIG.particleCount / 2; i++) {
      const x = (Math.random() - 0.5) * 1000;
      const y = (Math.random() - 0.5) * 1000;
      const z = (Math.random() - 0.5) * 1000;
      dustVertices.push(x, y, z);
    }
    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustVertices, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      transparent: true,
      opacity: 0.2
    });
    this.dust = new THREE.Points(dustGeometry, dustMaterial);
    this.scene.add(this.dust);
  }

  bindEvents() {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onMouseMove(event) {
    this.mouseX = event.clientX - window.innerWidth / 2;
    this.mouseY = event.clientY - window.innerHeight / 2;
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    this.targetX = this.mouseX * CONFIG.mouseSensitivity;
    this.targetY = this.mouseY * CONFIG.mouseSensitivity;

    // Smooth camera movement
    this.camera.position.x += (this.targetX - this.camera.position.x) * 0.05;
    this.camera.position.y += (-this.targetY - this.camera.position.y) * 0.05;
    
    // Always look at center
    this.camera.lookAt(this.scene.position);

    // Rotate particle system slowly
    this.particles.rotation.y += CONFIG.rotationSpeed;
    this.particles.rotation.x += CONFIG.rotationSpeed * 0.5;
    
    this.dust.rotation.y -= CONFIG.rotationSpeed * 0.5;

    // Gentle wave effect on particles
    const positions = this.particles.geometry.attributes.position.array;
    const time = Date.now() * 0.001;
    
    // Optional: Dynamic particle movement loop (commented out for performance, enabling if needed)
    // for(let i = 0; i < CONFIG.particleCount; i++) {
    //   // const i3 = i * 3;
    //   // positions[i3 + 1] += Math.sin(time + positions[i3]) * 0.1;
    // }
    // this.particles.geometry.attributes.position.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new HeroScene('particle-canvas');
});
