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
        this.scene.fog = new THREE.FogExp2(0x000000, 0.03); 

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 15);

        this.mouse = new THREE.Vector2(0,0);
        this.targetRot = new THREE.Vector2(0,0);
        this.clock = new THREE.Clock();
        
        // AUDIO
        this.audioLinked = false;
        this.analyser = null;
        this.dataArray = null;

        this.initLights();
        this.initWorld();
        this.initPostFX();
        this.initEvents();
        
        setTimeout(() => document.getElementById('loader').style.display='none', 800);
        this.renderer.setAnimationLoop(this.animate.bind(this));
    }

    initLights() {
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
        const gridHelper = new THREE.GridHelper(100, 100, 0x00f3ff, 0x111111);
        gridHelper.position.y = -5;
        this.grid = gridHelper;
        this.scene.add(gridHelper);

        // ROTATING CORE
        const coreGeo = new THREE.IcosahedronGeometry(2, 1);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.3 });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.scene.add(this.core);

        // INNER AUDIO PULSE CORE
        const innerGeo = new THREE.OctahedronGeometry(1, 0);
        const innerMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xbc13fe, emissiveIntensity: 1 });
        this.innerCore = new THREE.Mesh(innerGeo, innerMat);
        this.scene.add(this.innerCore);

        // PARTICLES
        const partGeo = new THREE.OctahedronGeometry(0.05, 0);
        const partMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        this.swarm = new THREE.InstancedMesh(partGeo, partMat, 1000);
        const dummy = new THREE.Object3D();
        for(let i=0; i<1000; i++) {
            const r = 10 + Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 10;
            dummy.position.set(r * Math.cos(theta), y, r * Math.sin(theta));
            dummy.updateMatrix();
            this.swarm.setMatrixAt(i, dummy.matrix);
        }
        this.scene.add(this.swarm);
    }

    initPostFX() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.bloom.strength = 1.2;
        this.composer.addPass(this.bloom);
    }

    async connectAudio() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(stream);
            this.analyser = audioCtx.createAnalyser();
            this.analyser.fftSize = 64;
            source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.audioLinked = true;
            
            // UI Feedback
            const btn = document.getElementById('mic-trigger');
            btn.innerText = "[ NEURAL LINK ACTIVE ]";
            btn.classList.add('active');
        } catch (err) {
            console.warn("Mic Denied", err);
            alert("MIC ACCESS DENIED. VISUALS WILL REMAIN STATIC.");
        }
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
        
        // Enter System
        document.getElementById('init-btn').addEventListener('click', () => {
            document.getElementById('landing-layer').style.display = 'none';
            document.getElementById('dashboard-layer').style.display = 'block';
            document.getElementById('dashboard-layer').classList.add('active-layer');
            this.targetCameraZ = 10;
        });

        // Trigger Audio
        document.getElementById('mic-trigger').addEventListener('click', () => {
            this.connectAudio();
        });

        this.targetCameraZ = 15;
    }

    animate() {
        const t = this.clock.getElapsedTime();
        
        let audioBass = 0;
        if(this.audioLinked && this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);
            audioBass = this.dataArray[0] / 255; // Get Bass level
        }

        // React to Audio
        const pulse = 1 + (audioBass * 0.5);
        this.innerCore.scale.set(pulse, pulse, pulse);
        this.bloom.strength = 1.2 + (audioBass * 2.0);
        this.core.rotation.y = t * 0.2 + (audioBass * 0.1);

        // Standard Move
        this.grid.position.z = (t * 2) % 10; 
        this.swarm.rotation.y = t * 0.05;

        this.targetRot.x += (this.mouse.y * 0.5 - this.targetRot.x) * 0.05;
        this.targetRot.y += (this.mouse.x * 0.5 - this.targetRot.y) * 0.05;
        this.camera.rotation.x = this.targetRot.x * 0.2;
        this.camera.rotation.y = this.targetRot.y * 0.2;
        this.camera.position.z += (this.targetCameraZ - this.camera.position.z) * 0.05;

        this.composer.render();
    }
}

new NeuralEngine();
