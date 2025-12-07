import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

/* MAGNUS OPUS: NEURAL LINK PROTOCOL */

const MOODS = {
    'NEON_GENESIS': { color: 0x00f3ff, bg: 0x020205, distortion: 0.0025, freq: 110 }, 
    'SOLAR_FLARE':  { color: 0xffaa00, bg: 0x050200, distortion: 0.0015, freq: 123 },
    'VOID_STATE':   { color: 0xffffff, bg: 0x000000, distortion: 0.0050, freq: 55 },
    'BLOOD_CODE':   { color: 0xff0033, bg: 0x050000, distortion: 0.0035, freq: 82 }
};

class NeuralLink {
    constructor() {
        this.canvas = document.getElementById('neural-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.camera.position.z = 20;

        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2(0,0);
        this.targetRot = new THREE.Vector2(0,0);
        this.gyro = { x: 0, y: 0 };
        this.currentMood = 'NEON_GENESIS';
        this.audioCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.audioLinked = false;
        this.lowPerformanceMode = false;

        this.initHUD();
        this.initGeometry();
        this.initPostFX();
        this.initEvents();

        setTimeout(() => {
            const l = document.getElementById('loader');
            if(l) l.style.display='none';
        }, 800);

        this.renderer.setAnimationLoop(this.render.bind(this));
        setInterval(() => this.cycleMood(), 15000);
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
        this.perfCheckFrames = 0;
    }

    initGeometry() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.2, metalness: 0.9,
            emissive: 0x00f3ff, emissiveIntensity: 0.5, side: THREE.DoubleSide
        });

        material.onBeforeCompile = (shader) => {
            shader.uniforms.time = { value: 0 };
            shader.uniforms.audio = { value: 0 };
            shader.fragmentShader = `
                uniform float time;
                uniform float audio;
                ${shader.fragmentShader}
            `.replace('#include <emissivemap_fragment>', `
                #include <emissivemap_fragment>
                float scan = sin(vWorldPosition.y * 10.0 - time * 3.0);
                float intensity = 0.5 + (audio * 2.0); 
                if(scan > 0.8) diffuseColor.rgb += vec3(0.1, 0.5, 1.0) * intensity;
                totalEmissiveRadiance *= intensity;
            `);
            this.customShader = shader;
        };

        const geometry = new THREE.OctahedronGeometry(0.15, 0);
        this.count = 1600;
        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        
        const dummy = new THREE.Object3D();
        for(let i=0; i<this.count; i++) {
            const phi = Math.acos(-1 + (2 * i) / this.count);
            const theta = Math.sqrt(this.count * Math.PI) * phi;
            const r = 8 + Math.random() * 6;
            dummy.position.setFromSphericalCoords(r, phi, theta);
            dummy.lookAt(0,0,0);
            const s = Math.random();
            dummy.scale.set(s, s, s*4);
            dummy.updateMatrix();
            this.mesh.setMatrixAt(i, dummy.matrix);
        }
        this.scene.add(this.mesh);
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

    async activateNeuralLink() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioCtx.createMediaStreamSource(stream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 64;
            source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.audioLinked = true;
            
            this.oscillator = this.audioCtx.createOscillator();
            this.gainNode = this.audioCtx.createGain();
            this.oscillator.type = 'sine';
            this.oscillator.frequency.setValueAtTime(110, this.audioCtx.currentTime); 
            this.gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime); 
            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioCtx.destination);
            this.oscillator.start();

            if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
                await window.DeviceOrientationEvent.requestPermission();
            }
            window.addEventListener('deviceorientation', (e) => {
                this.gyro.x = e.beta ? e.beta * 0.02 : 0; 
                this.gyro.y = e.gamma ? e.gamma * 0.02 : 0; 
            });
        } catch (err) { console.log("Link Restricted"); }
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
        const btn = document.getElementById('init-btn');
        if(btn) btn.addEventListener('click', () => {
            document.getElementById('landing-layer').style.display = 'none';
            document.getElementById('dashboard-layer').style.display = 'block';
            document.getElementById('dashboard-layer').classList.add('active-layer');
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
        this.pointLight.color.setHex(mood.color);
        this.material.emissive.setHex(mood.color);
        this.scene.background.setHex(mood.bg);
        if(!this.lowPerformanceMode) this.rgbShift.uniforms['amount'].value = mood.distortion;
        this.hud.style.color = '#' + mood.color.toString(16).padStart(6,'0');
        if(this.oscillator) this.oscillator.frequency.rampToValueAtTime(mood.freq, this.audioCtx.currentTime + 2);
    }

    monitorPerformance(fps) {
        if(fps < 25 && !this.lowPerformanceMode && this.perfCheckFrames > 5) {
            this.lowPerformanceMode = true;
            this.bloom.enabled = false;
            this.rgbShift.enabled = false;
        }
        this.perfCheckFrames++;
    }

    render() {
        const time = this.clock.getElapsedTime();
        let audioLevel = 0;
        if(this.audioLinked && this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);
            let sum = 0;
            for(let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
            audioLevel = sum / this.dataArray.length / 255;
        }

        if(this.customShader) {
            this.customShader.uniforms.time.value = time;
            this.customShader.uniforms.audio.value = audioLevel;
        }

        const lookX = this.gyro.y || (this.mouse.x * 0.5);
        const lookY = this.gyro.x || (this.mouse.y * 0.5);
        this.targetRot.x += (lookY - this.targetRot.x) * 0.05;
        this.targetRot.y += (lookX - this.targetRot.y) * 0.05;

        this.mesh.rotation.x = this.targetRot.x + (audioLevel * 0.2);
        this.mesh.rotation.y = this.targetRot.y + time * 0.05;
        this.bloom.strength = 1.5 + (audioLevel * 2.0);

        this.frames++;
        const now = Date.now();
        if(now >= this.lastTime + 1000) {
            const fps = this.frames;
            this.monitorPerformance(fps);
            this.hud.innerText = `NEURAL LINK: ${this.audioLinked ? 'ACTIVE' : 'STANDBY'} | FPS: ${fps} | MOOD: ${this.currentMood}${this.lowPerformanceMode ? ' [LITE]' : ''}`;
            this.frames = 0;
            this.lastTime = now;
        }
        this.composer.render();
    }
}
new NeuralLink();
