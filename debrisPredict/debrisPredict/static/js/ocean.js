// Three.js Ocean Scene
class OceanScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.water = null;
        this.sky = null;
        this.sun = null;
        this.mesh = null;
        this.clock = new THREE.Clock();
        
        this.init();
        this.animate();
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }
    
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
        this.camera.position.set(30, 30, 100);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('ocean-canvas').appendChild(this.renderer.domElement);
        
        // Add lights
        this.addLights();
        
        // Add water
        this.addWater();
        
        // Add sky
        this.addSky();
        
        // Add floating debris
        this.addDebris();
        
        // Add fog
        this.scene.fog = new THREE.FogExp2(0x001e4f, 0.0008);
    }
    
    addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        this.sun = new THREE.Vector3();
        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(-1, 1, 1).normalize();
        this.scene.add(light);
    }
    
    addWater() {
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
        
        this.water = new THREE.Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/waternormals.jpg', function(texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x006994,
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            }
        );
        
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = 0;
        this.scene.add(this.water);
    }
    
    addSky() {
        this.sky = new THREE.Sky();
        this.sky.scale.setScalar(10000);
        
        const skyUniforms = this.sky.material.uniforms;
        skyUniforms['turbidity'].value = 10;
        skyUniforms['rayleigh'].value = 2;
        skyUniforms['mieCoefficient'].value = 0.005;
        skyUniforms['mieDirectionalG'].value = 0.8;
        
        const parameters = {
            elevation: 2,
            azimuth: 180
        };
        
        const updateSun = () => {
            const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
            const theta = THREE.MathUtils.degToRad(parameters.azimuth);
            this.sun.setFromSphericalCoords(1, phi, theta);
            
            this.sky.material.uniforms['sunPosition'].value.copy(this.sun);
            this.water.material.uniforms['sunDirection'].value.copy(this.sun).normalize();
            
            this.render();
        };
        
        updateSun();
        this.scene.add(this.sky);
    }
    
    addDebris() {
        // Create a group to hold all debris
        this.debrisGroup = new THREE.Group();
        
        // Load a simple debris model (you can replace this with your own models)
        const geometry = new THREE.BoxGeometry(2, 0.5, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Add multiple debris pieces
        for (let i = 0; i < 20; i++) {
            const debris = new THREE.Mesh(geometry, material.clone());
            
            // Random position above water
            debris.position.x = (Math.random() - 0.5) * 100;
            debris.position.y = Math.random() * 10 + 2;
            debris.position.z = (Math.random() - 0.5) * 100;
            
            // Random rotation
            debris.rotation.x = Math.random() * Math.PI;
            debris.rotation.y = Math.random() * Math.PI;
            
            // Random scale
            const scale = 0.5 + Math.random() * 2;
            debris.scale.set(scale, scale * 0.5, scale * 0.8);
            
            // Add animation properties
            debris.userData = {
                speed: 0.1 + Math.random() * 0.2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                floatHeight: 0.5 + Math.random()
            };
            
            this.debrisGroup.add(debris);
        }
        
        this.scene.add(this.debrisGroup);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, windowHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.render();
        this.update();
    }
    
    update() {
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime() * 0.5;
        
        // Update water
        if (this.water) {
            this.water.material.uniforms['time'].value += delta * 0.5;
        }
        
        // Update debris
        if (this.debrisGroup) {
            this.debrisGroup.children.forEach(debris => {
                // Floating animation
                debris.position.y = Math.sin(time * debris.userData.speed) * debris.userData.floatHeight + 2;
                
                // Rotation
                debris.rotation.x += debris.userData.rotationSpeed;
                debris.rotation.y += debris.userData.rotationSpeed * 0.5;
                
                // Slight movement
                debris.position.x += Math.sin(time * 0.2 * debris.userData.speed) * 0.02;
                debris.position.z += Math.cos(time * 0.2 * debris.userData.speed) * 0.02;
            });
        }
        
        // Rotate camera slowly
        this.camera.position.x = Math.cos(time * 0.1) * 100;
        this.camera.position.z = Math.sin(time * 0.1) * 100;
        this.camera.lookAt(this.scene.position);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the scene when the page loads
window.addEventListener('load', () => {
    // Check if WebGL is supported
    if (WEBGL.isWebGLAvailable()) {
        new OceanScene();
    } else {
        const warning = WEBGL.getWebGLErrorMessage();
        document.getElementById('ocean-canvas').appendChild(warning);
    }
});
