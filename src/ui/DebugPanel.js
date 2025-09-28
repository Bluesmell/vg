export class DebugPanel {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.isVisible = false;
        this.panel = null;
        this.updateInterval = null;
        
        this.createPanel();
        this.bindToggle();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 1000;
            display: none;
            min-width: 300px;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        document.body.appendChild(this.panel);
    }

    bindToggle() {
        document.addEventListener('keydown', (event) => {
            if (event.code === 'F3') {
                event.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.panel.style.display = this.isVisible ? 'block' : 'none';
        
        if (this.isVisible) {
            this.startUpdating();
        } else {
            this.stopUpdating();
        }
    }

    startUpdating() {
        this.updateInterval = setInterval(() => {
            this.updateContent();
        }, 100); // Update 10 times per second
    }

    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateContent() {
        if (!this.isVisible || !this.gameEngine) return;
        
        const playerController = this.gameEngine.getSystem('player');
        const inputManager = this.gameEngine.getSystem('input');
        
        let content = '<h3>🇪🇪 Viimsi Parish Debug Panel</h3>';
        
        // Performance info
        content += '<h4>Performance:</h4>';
        content += `FPS: ${Math.round(1 / this.gameEngine.clock.getDelta())}<br>`;
        content += `Renderer: ${this.gameEngine.renderer.info.render.triangles} triangles<br>`;
        
        if (playerController) {
            const state = playerController.getMovementState();
            
            content += '<h4>Player Position:</h4>';
            content += `X: ${state.position.x.toFixed(2)}<br>`;
            content += `Y: ${state.position.y.toFixed(2)}<br>`;
            content += `Z: ${state.position.z.toFixed(2)}<br>`;
            
            content += '<h4>Movement:</h4>';
            content += `Speed: ${Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2).toFixed(2)} m/s<br>`;
            content += `Grounded: ${state.isGrounded}<br>`;
            content += `Height: ${state.height.toFixed(2)}m<br>`;
            
            content += '<h4>Input State:</h4>';
            content += `W: ${state.keys.w} A: ${state.keys.a} S: ${state.keys.s} D: ${state.keys.d}<br>`;
            content += `Sprint: ${state.keys.shift} Crouch: ${state.keys.ctrl}<br>`;
            content += `Mouse Locked: ${state.mouseLocked}<br>`;
            
            content += '<h4>Camera Rotation:</h4>';
            content += `Pitch: ${(state.rotation.x * 180 / Math.PI).toFixed(1)}°<br>`;
            content += `Yaw: ${(state.rotation.y * 180 / Math.PI).toFixed(1)}°<br>`;
        }
        
        content += '<h4>Viimsi Parish Locations:</h4>';
        content += '<small>Use console: gameEngine.getSystem("player").teleportToLocation("location-name")</small><br>';
        content += '• viimsi-manor<br>';
        content += '• muuga-harbor<br>';
        content += '• prangli-ferry<br>';
        content += '• haabneeme<br>';
        content += '• randvere<br>';
        
        content += '<br><small>Press F3 to toggle this panel</small>';
        
        this.panel.innerHTML = content;
    }

    dispose() {
        this.stopUpdating();
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
    }
}