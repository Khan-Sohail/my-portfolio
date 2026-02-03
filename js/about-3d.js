/**
 * Three.js About Section 3D Element
 * Renders an interactive Torus Knot that reacts to mouse movement
 */

class AboutScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    // Interaction state
    this.mouse = new THREE.Vector2();
    this.targetRotation = new THREE.Vector2();
    this.isHovering = false;

    this.init();
    this.createObject();
    this.addLights();
    this.animate();
    this.bindEvents();
  }

  init() {
    this.scene = new THREE.Scene();
    
    // Transparent background
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    
    const container = this.canvas.parentElement;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.z = 6;
  }

  addLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0x6366f1, 1);
    directionalLight1.position.set(2, 2, 5);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xec4899, 0.8);
    directionalLight2.position.set(-2, -2, -5);
    this.scene.add(directionalLight2);
  }

  createObject() {
    // Torus Knot Geometry
    const geometry = new THREE.TorusKnotGeometry(1.2, 0.4, 100, 16);
    
    // Material 1: Solid matte surface
    const materialSolid = new THREE.MeshToonMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.9,
    });
    
    this.mesh = new THREE.Mesh(geometry, materialSolid);
    this.scene.add(this.mesh);

    // Material 2: Wireframe overlay
    const wireframeGeo = new THREE.WireframeGeometry(geometry);
    const materialWire = new THREE.LineBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.5
    });

    this.wireframe = new THREE.LineSegments(wireframeGeo, materialWire);
    this.mesh.add(this.wireframe);
  }
  
  bindEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
    
    const container = this.canvas.parentElement;
    container.addEventListener('mousemove', this.onMouseMove.bind(this));
    container.addEventListener('mouseenter', () => this.isHovering = true);
    container.addEventListener('mouseleave', () => {
        this.isHovering = false;
        // Reset target rotation on leave
        this.targetRotation.set(0, 0);
    });
  }

  onResize() {
    const container = this.canvas.parentElement;
    if (!container) return;
    
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    // Normalize mouse position from -1 to 1
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.targetRotation.x = this.mouse.y * 1.5; // Vertical rotation
    this.targetRotation.y = this.mouse.x * 1.5; // Horizontal rotation
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (this.mesh) {
      // Smooth Rotation interpolation
      // If hovering, rotate towards mouse cursor
      // If not hovering, auto-rotate tumble
      
      if (this.isHovering) {
          // Lerp towards interaction target
          this.mesh.rotation.x += (this.targetRotation.x - this.mesh.rotation.x) * 0.1;
          this.mesh.rotation.y += (this.targetRotation.y - this.mesh.rotation.y) * 0.1;
          
          // Gentle scale pulse
          const scale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
          this.mesh.scale.set(scale, scale, scale);
      } else {
          // Auto tumble
          this.mesh.rotation.x += 0.005;
          this.mesh.rotation.y += 0.008;
          
          // Reset scale
          this.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize when DOM is loaded with a small delay for container sizing
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new AboutScene('about-canvas');
    }, 100);
});
