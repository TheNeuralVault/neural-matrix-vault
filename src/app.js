import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

class NeuralEngine {
    constructor() {
        this.canvas = document.getElementById('neural-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.scene = new THREE.Scene();
        // Fog for depth fading
        this.scene.fog = new THREE.FogExp2(0x000000, 0.03); 

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 15); // Lift camera slightly

        this.mouse = new THREE.Vector2(0,0);
        this.targetRot = new THREE.Vector2(0,0);
        this.clock = new THREE.Clock();

        this.initLights();
        this.initWorld(); // New Geometry
        this.initPostFX();
        this.initEvents();
        
        setTimeout(() => document.getElementById('loader').style.display='none', 800);
        this.renderer.setAnimationLoop(this.animate.bind(this));
    }

    initLights() {
        // Teal + Pink lighting for Cyberpunk feel
        const ambient = new THREE.AmbientLight(0x111111);
        this.scene.add(ambient);

        this.blueLight = new THREE.PointLight(0x00f3ff, 2, 50);
        this.blueLight.position.set(5, 5, 5);
        this.scene.add(this.blueLight);

        this.pinkLight = new THREE.PointLight(0xbc13fe, 2, 50);
        this.pinkLight.position.set(-5, 2, -5);
        this.scene.add(this.pinkLight);
    }

    initWorld() {
        // 1. INFINITE GRID (The Floor)
        const gridHelper = new THREE.GridHelper(100, 100, 0x00f3ff, 0x111111);
        gridHelper.position.y = -5;
        this.grid = gridHelper;
        this.scene.add(gridHelper);

        // 2. THE HERO CORE (Rotating Centerpiece)
        const coreGeo = new THREE.IcosahedronGeometry(2, 0);
        const coreMat = new THREE.MeshBasicMaterial({ 
            color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.3 
        });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.scene.add(this.core);

        // 3. INNER CORE (Solid)
        const innerGeo = new THREE.OctahedronGeometry(1, 0);
        const innerMat = new THREE.MeshStandardMaterial({ 
            color: 0x000000, emissive: 0xbc13fe, emissiveIntensity: 1, roughness: 0.1
        });
        this.innerCore = new THREE.Mesh(innerGeo, innerMat);
        this.scene.add(this.innerCore);

        // 4. PARTICLE SWARM
        const partGeo = new THREE.OctahedronGeometry(0.05, 0);
        const partMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        this.swarm = new THREE.InstancedMesh(partGeo, partMat, 1000);
        
        const dummy = new THREE.Object3D();
        for(let i=0; i<1000; i++) {
            const r = 10 + Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 10;
            
            dummy.position.set(
                r * Math.cos(theta),
                y,
                r * Math.sin(theta)
            );
            dummy.rotation.set(Math.random(), Math.random(), Math.random());
            dummy.updateMatrix();
            this.swarm.setMatrixAt(i, dummy.matrix);
        }
        this.scene.add(this.swarm);
    }

    initPostFX() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        // High Bloom for Neon Glow
        const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloom.threshold = 0.1;
        bloom.strength = 1.2;
        bloom.radius = 0.5;
        this.composer.addPass(bloom);
    }

    initEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });
        window.addEventListener('mousemove', e => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        
        document.getElementById('init-btn').addEventListener('click', () => {
            document.getElementById('landing-layer').style.display = 'none';
            document.getElementById('dashboard-layer').style.display = 'block';
            document.getElementById('dashboard-layer').classList.add('active-layer');
            
            // Zoom camera in
            this.targetCameraZ = 10;
        });
        this.targetCameraZ = 15;
    }

    animate() {
        const t = this.clock.getElapsedTime();

        // Rotate Cores
        this.core.rotation.y = t * 0.2;
        this.core.rotation.x = t * 0.1;
        this.innerCore.rotation.y = -t * 0.5;

        // Move Grid (Infinite Flight Illusion)
        this.grid.position.z = (t * 2) % 10; 

        // Swarm Float
        this.swarm.rotation.y = t * 0.05;

        // Smooth Camera Look
        this.targetRot.x += (this.mouse.y * 0.5 - this.targetRot.x) * 0.05;
        this.targetRot.y += (this.mouse.x * 0.5 - this.targetRot.y) * 0.05;
        
        this.camera.rotation.x = this.targetRot.x * 0.2;
        this.camera.rotation.y = this.targetRot.y * 0.2;
        
        // Smooth Zoom
        this.camera.position.z += (this.targetCameraZ - this.camera.position.z) * 0.05;

        this.composer.render();
    }
}

new NeuralEngine();
