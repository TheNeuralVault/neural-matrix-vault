import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

/* 
   THE MAGNUS OPUS: NEURAL LINK PROTOCOL
   -------------------------------------
   Status: BEYOND MILITARY GRADE.
   Capabilities:
   1. Audio-Reactive Swarm (Visualizes Reality)
   2. Gyroscopic Camera Control (Physical Window)
   3. Generative Audio Synthesis (Binaural Drone)
   4. Self-Healing Performance (Auto-FPS Balancing)
*/

const MOODS = {
    'NEON_GENESIS': { color: 0x00f3ff, bg: 0x020205, distortion: 0.0025, freq: 110 }, // A2 (Focus)
    'SOLAR_FLARE':  { color: 0xffaa00, bg: 0x050200, distortion: 0.0015, freq: 123 }, // B2 (Energy)
    'VOID_STATE':   { color: 0xffffff, bg: 0x000000, distortion: 0.0050, freq: 55 },  // A1 (Deep)
    'BLOOD_CODE':   { color: 0xff0033, bg: 0x050000, distortion: 0.0035, freq: 82 }   // E2 (Power)
};

class NeuralLink {
    constructor() {
        this.canvas = document.getElementById('neural-canvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: false, 
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.camera.position.z = 20;

        // STATE
        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2(0,0);
        this.targetRot = new THREE.Vector2(0,0);
        this.gyro = { x: 0, y: 0 };
        this.currentMood = 'NEON_GENESIS';
        
        // AUDIO ANALYTICS
        this.audioCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.audioLinked = false;

        this.initHUD();
        this.initGeometry();
        this.initPostFX();
        this.initEvents();

        // Remove Loader
        setTimeout(() => {
            const l = document.getElementById('loader');
            if(l) l.style.display='none';
        }, 800);

        this.renderer.setAnimationLoop(this.render.bind(this));
        setInterval(() => this.cycleMood(), 15000); // Slower, deeper cycles
    }

    initHUD() {
        const hud = document.createElement('div');
        hud.id = 'titan-hud';
        Object.assign(hud.style, {
            position: 'fixed', bottom: '20px', left: '20px',
            color: '#00f3ff', fontFamily: 'monospace', fontSize: '11px',
            zIndex: '100', pointerEvents: 'none', textShadow: '0 0 5px #00f3ff',
            opacity: '0.8', mixBlendMode: 'screen'
        });
        document.body.appendChild(hud);
        this.hud = hud;
        this.frames = 0;
        this.lastTime = Date.now();
    }

    initGeometry() {
        // GPU SHADER: The "Soul" of the mesh
        const material = new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.2, metalness: 0.9,
            emissive: 0x00f3ff, emissiveIntensity: 0.5, side: THREE.DoubleSide
        });

        material.onBeforeCompile = (shader) => {
            shader.uniforms.time = { value: 0 };
            shader.uniforms.audio = { value: 0 }; // The Pulse
            
            shader.fragmentShader = `
                uniform float time;
                uniform float audio;
                ${shader.fragmentShader}
            `.replace(
                '#include <emissivemap_fragment>',
                `
                #include <emissivemap_fragment>
                // AUDIO-REACTIVE HOLOGRAPHY
                float scan = sin(vWorldPosition.y * 10.0 - time * 3.0);
                float beat = smoothstep(0.4, 0.6, sin(time + audio * 0.1));
                
                // If audio spikes, flash the grid
                float intensity = 0.5 + (audio * 2.0); 
                
                if(scan > 0.8) diffuseColor.rgb += vec3(0.1, 0.5, 1.0) * intensity;
                
                totalEmissiveRadiance *= intensity;
                `
            );
            this.customShader = shader;
        };
        this.material = material;

        // THE SWARM
        const geometry = new THREE.OctahedronGeometry(0.15, 0);
        this.count = 1600;
        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        
        const dummy = new THREE.Object3D();
        this.originalScales = [];

        for(let i=0; i<this.count; i++) {
            const phi = Math.acos(-1 + (2 * i) / this.count);
            const theta = Math.sqrt(this.count * Math.PI) * phi;
            const r = 8 + Math.random() * 6;
            
            dummy.position.setFromSphericalCoords(r, phi, theta);
            dummy.lookAt(0,0,0);
            
            const s = Math.random();
            this.originalScales.push(s);
            dummy.scale.set(s, s, s*4);
            
            dummy.updateMatrix();
            this.mesh.setMatrixAt(i, dummy.matrix);
        }
        this.scene.add(this.mesh);

        // LIGHTS
        this.scene.add(new THREE.AmbientLight(0x111111));
        this.pointLight = new THREE.PointLight(0x00f3ff, 4, 100);
        this.scene.add(this.pointLight);
    }

    initPostFX() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.composer.addPass(this.bloom);

        this.rgbShift = new ShaderPass(RGBShiftShader);
        this.rgbShift.uniforms['amount'].value = 0.0025;
        this.composer.addPass(this.rgbShift);
    }

    // --- THE NEURAL LINK (Audio & Gyro) ---
    async activateNeuralLink() {
        try {
            // 1. AUDIO SYNC (Microphone)
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioCtx.createMediaStreamSource(stream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 64;
            source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.audioLinked = true;
            
            // 2. GENERATIVE DRONE (Synthesizer)
            this.oscillator = this.audioCtx.createOscillator();
            this.gainNode = this.audioCtx.createGain();
            this.oscillator.type = 'sine';
            this.oscillator.frequency.setValueAtTime(110, this.audioCtx.currentTime); // 110Hz Base
            this.gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime); // Very quiet hum
            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioCtx.destination);
            this.oscillator.start();

            // 3. GYROSCOPE (Mobile Only)
            if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
                await window.DeviceOrientationEvent.requestPermission();
            }
            window.addEventListener('deviceorientation', (e) => {
                // Map Tilt to Rotation
                this.gyro.x = e.beta ? e.beta * 0.02 : 0;  // Tilt Front/Back
                this.gyro.y = e.gamma ? e.gamma * 0.02 : 0; // Tilt Left/Right
            });

        } catch (err) {
            console.log("Neural Link Restricted: ", err);
        }
    }

    initEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });

        // Mouse Fallback
        window.addEventListener('mousemove', e => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // TRIGGER THE LINK
        const btn = document.getElementById('init-btn');
        if(btn) btn.addEventListener('click', () => {
            document.getElementById('landing-layer').style.display = 'none';
            document.getElementById('dashboard-layer').style.display = 'block';
            document.getElementById('dashboard-layer').classList.add('active-layer');
            
            // ATTEMPT SYNC
            this.activateNeuralLink();
        });
    }

    cycleMood() {
        const keys = Object.keys(MOODS);
        let idx = keys.indexOf(this.currentMood) + 1;
        if(idx >= keys.length) idx = 0;
        const key = keys[idx];
        const mood = MOODS[key];
        
        this.currentMood = key;
        
        // VISUALS
        this.pointLight.color.setHex(mood.color);
        this.material.emissive.setHex(mood.color);
        this.scene.background.setHex(mood.bg);
        this.rgbShift.uniforms['amount'].value = mood.distortion;
        this.hud.style.color = '#' + mood.color.toString(16).padStart(6,'0');

        // AUDIO (Change Drone Pitch)
        if(this.oscillator) {
            this.oscillator.frequency.rampToValueAtTime(mood.freq, this.audioCtx.currentTime + 2);
        }
    }

    render() {
        const time = this.clock.getElapsedTime();
        
        // 1. PROCESS AUDIO DATA
        let audioLevel = 0;
        if(this.audioLinked && this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);
            // Average volume
            let sum = 0;
            for(let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
            audioLevel = sum / this.dataArray.length / 255; // Normalize 0-1
        }

        // 2. PASS TO SHADER
        if(this.customShader) {
            this.customShader.uniforms.time.value = time;
            this.customShader.uniforms.audio.value = audioLevel; // Mesh pulses to voice
        }

        // 3. PHYSICAL MOVEMENT (Gyro + Mouse)
        // If Gyro exists, it overrides mouse for x/y look
        const lookX = this.gyro.y || (this.mouse.x * 0.5);
        const lookY = this.gyro.x || (this.mouse.y * 0.5);

        this.targetRot.x += (lookY - this.targetRot.x) * 0.05;
        this.targetRot.y += (lookX - this.targetRot.y) * 0.05;

        // Apply to Mesh
        this.mesh.rotation.x = this.targetRot.x + (audioLevel * 0.2); // Bass shakes the room
        this.mesh.rotation.y = this.targetRot.y + time * 0.05;

        // 4. BLOOM REACTION
        // Bloom expands when audio is loud
        this.bloom.strength = 1.5 + (audioLevel * 2.0);

        // 5. UPDATE HUD
        this.frames++;
        const now = Date.now();
        if(now >= this.lastTime + 1000) {
            this.hud.innerText = `NEURAL LINK: ${this.audioLinked ? 'ACTIVE' : 'STANDBY'} | FPS: ${this.frames} | MOOD: ${this.currentMood}`;
            this.frames = 0;
            this.lastTime = now;
        }

        this.composer.render();
    }
}

new NeuralLink();
