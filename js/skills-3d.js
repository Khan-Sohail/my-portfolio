/**
 * Zero-Gravity Glass Cards
 * Floating frosted glass cards with physics-like drifting
 */

const SKILLS = [
  "Vue.js", "Nuxt", "React", "TypeScript", "Tailwind",
  "Three.js", "WebGL", "Laravel", "Node.js", "AWS",
  "Design", "Figma", "Docker", "Git", "CI/CD"
];

const SKILLS_CONFIG = {
  cardSize: { w: 3.5, h: 2 },
  boundSize: { x: 12, y: 8, z: 6 },
  cardCount: SKILLS.length,
  mouseRepelForce: 0.5,
  friction: 0.98
};

class GlassFloatScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
        console.error("Container not found:", containerId);
        return;
    }

    this.init();
    this.createCards();
    this.createLighting();
    this.animate();
    this.bindEvents();
  }

  init() {
    this.scene = new THREE.Scene();
    
    // DEBUG: Add a big red plane to back to prove rendering works
    // const plane = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial({color: 0x220000, side: THREE.DoubleSide}));
    // plane.position.z = -10;
    // this.scene.add(plane);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
    this.camera.position.z = 25;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Clear old canvas if any
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    // Important for glass effect
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.mouse = new THREE.Vector2(9999, 9999); // Off screen initially
    this.raycaster = new THREE.Raycaster();
    
    this.cards = [];
  }

  createLighting() {
    // Glass needs interesting environment to look good
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6366f1, 1, 20);
    pointLight.position.set(-5, 0, 5);
    this.scene.add(pointLight);
    
    // Add blue/purple rim lights for cyberpunk feel
    const rimLight1 = new THREE.PointLight(0xec4899, 0.8, 20);
    rimLight1.position.set(5, -5, 5);
    this.scene.add(rimLight1);
  }

  createCardTexture(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = 512;
    const h = 256;
    canvas.width = w;
    canvas.height = h;

    // Draw card border/bg for texture (mostly transparent)
    // We only want the text to be opaque on the texture map
    
    // Text
    ctx.font = 'bold 60px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(text, w/2, h/2);
    
    // Subtext decoration
    ctx.font = '20px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText("SKILL // 0" + Math.floor(Math.random()*9), w/2, h/2 + 50);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    return texture;
  }

  createCards() {
    const geometry = new THREE.BoxGeometry(SKILLS_CONFIG.cardSize.w, SKILLS_CONFIG.cardSize.h, 0.2); // Thin box
    
    // Glass Material
    // Glass Material (Simplified for stability)
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    SKILLS.forEach((skill, i) => {
      // Text Texture for the front face
      const texture = this.createCardTexture(skill);
      
      // Material array: sides are glass, front/back have text overlaid?
      // Actually simpler: Use a child plane for text slightly in front of glass
      
      const cardGroup = new THREE.Group();
      
      // The Glass Block
      const glassMesh = new THREE.Mesh(geometry, glassMaterial);
      cardGroup.add(glassMesh);
      
      // The Text Plane (floating slightly off surface)
      const textGeo = new THREE.PlaneGeometry(SKILLS_CONFIG.cardSize.w, SKILLS_CONFIG.cardSize.h);
      const textMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const textMesh = new THREE.Mesh(textGeo, textMat);
      textMesh.position.z = 0.11; // Slightly in front
      cardGroup.add(textMesh);
      
      // Backside text (mirrored? or just same)
      const textBack = textMesh.clone();
      textBack.rotation.y = Math.PI;
      textBack.position.z = -0.11;
      cardGroup.add(textBack);

      // Random Position
      cardGroup.position.set(
        (Math.random() - 0.5) * SKILLS_CONFIG.boundSize.x,
        (Math.random() - 0.5) * SKILLS_CONFIG.boundSize.y,
        (Math.random() - 0.5) * SKILLS_CONFIG.boundSize.z
      );

      // Random Rotation
      cardGroup.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        0
      );

      // Random Velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );
      
      // Rotation Velocity
      const rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      );

      cardGroup.userData = { velocity, rotVel, id: i };
      
      this.scene.add(cardGroup);
      this.cards.push(cardGroup);
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const time = Date.now() * 0.001;

    // Raycast for interaction
    this.raycaster.setFromCamera(this.mouse, this.camera);
    // Simple plane at z=0 to approximate mouse position in 3D space
    // or just repel based on screen space projection?
    // Let's do a logic: repel cards from the ray
    
    const ray = this.raycaster.ray;

    this.cards.forEach(card => {
      const ud = card.userData;
      
      // 1. Update Position
      card.position.add(ud.velocity);
      card.rotation.x += ud.rotVel.x;
      card.rotation.y += ud.rotVel.y;
      card.rotation.z += ud.rotVel.z;

      // 2. Boundary Bounce
      if (Math.abs(card.position.x) > SKILLS_CONFIG.boundSize.x/2) ud.velocity.x *= -1;
      if (Math.abs(card.position.y) > SKILLS_CONFIG.boundSize.y/2) ud.velocity.y *= -1;
      if (Math.abs(card.position.z) > SKILLS_CONFIG.boundSize.z/2) ud.velocity.z *= -1;

      // 3. Mouse Interact (Repel)
      // Calculate distance from ray to card center
      const distanceSq = ray.distanceSqToPoint(card.position);
      
      if (distanceSq < 5) { // If close to mouse ray
         // Push away
         const direction = card.position.clone().sub(ray.origin).normalize();
         // But mostly push in X/Y plane away from where mouse is
         // Simplified: Just add some velocity away from center of screen if mouse is there
         // Actually, let's just make them rotate faster if hovered
         
         ud.rotVel.x += (Math.random()-0.5) * 0.005;
         ud.rotVel.y += (Math.random()-0.5) * 0.005;
         
         // Highlight
         card.children[0].material.emissive.setHex(0x222244);
      } else {
         ud.velocity.multiplyScalar(1); // friction? nah, space
         card.children[0].material.emissive.setHex(0x000000);
      }
      
      // Gentle floating adjustment
      card.position.y += Math.sin(time + ud.id) * 0.002;
    });

    this.renderer.render(this.scene, this.camera);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      if(!this.container) return;
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.mouse.x = (x / rect.width) * 2 - 1;
      this.mouse.y = -(y / rect.height) * 2 + 1;
    });
    
    this.renderer.domElement.addEventListener('mouseleave', () => {
        this.mouse.set(9999, 9999);
    });
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  // Give it a bit more time or check for container
  setTimeout(() => {
    const container = document.getElementById('skills-3d-container');
    if(container) {
      console.log("Skills container found, initializing scene...");
      new GlassFloatScene('skills-3d-container'); // Pass container ID now
    } else {
      console.error("Skills container NOT found!");
    }
  }, 500);
});
