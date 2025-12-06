import { World } from './World.js';
class App {
    constructor() {
        this.world = new World(document.querySelector('#neural-canvas'));
        document.getElementById('init-btn').addEventListener('click', () => this.world.warp());
        const loader = document.getElementById('loader');
        setTimeout(() => { loader.style.opacity='0'; setTimeout(()=>loader.remove(),800); }, 1000);
        this.world.start();
    }
}
new App();
