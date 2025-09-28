import { GameEngine } from './core/GameEngine.js';
import { LoadingManager } from './core/LoadingManager.js';

class ViimsiGame {
    constructor() {
        this.gameEngine = null;
        this.loadingManager = new LoadingManager();
    }

    async initialize() {
        try {
            // Show loading screen
            this.loadingManager.show();
            
            // Simulate loading progress
            await this.loadingManager.simulateLoading(2000);
            
            // Initialize game engine
            this.gameEngine = new GameEngine();
            await this.gameEngine.initialize();
            
            // Hide loading screen
            console.log('About to hide loading screen...');
            this.loadingManager.hide();
            console.log('Loading screen hide called');
            
            // Start game loop
            console.log('About to start game loop...');
            this.gameEngine.start();
            console.log('Game start called');
            
            // Make game engine available globally for debugging
            window.gameEngine = this.gameEngine;
            
            // Start debug info updates
            this.startDebugInfoUpdates();
            
            console.log('Viimsi Parish 3D Game initialized successfully!');
            console.log('Click the canvas to enter first-person mode, then use WASD to move around');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.loadingManager.showError('Failed to load game. Please refresh and try again.');
        }
    }

    startDebugInfoUpdates() {
        const updateDebugInfo = () => {
            if (this.gameEngine && this.gameEngine.scene) {
                const debugContent = document.getElementById('debug-content');
                if (debugContent) {
                    const terrainSystem = this.gameEngine.terrainSystem;
                    const mapDataManager = this.gameEngine.mapDataManager;
                    
                    let info = `<div style="color: #10b981;">✅ Scene Objects: ${this.gameEngine.scene.children.length}</div>`;
                    
                    // Camera info
                    const cam = this.gameEngine.camera;
                    info += `<div>📷 Camera: (${cam.position.x.toFixed(0)}, ${cam.position.y.toFixed(0)}, ${cam.position.z.toFixed(0)})</div>`;
                    
                    // Terrain info
                    if (terrainSystem) {
                        info += `<div style="color: #00ff00;">🏔️ Terrain LOD Meshes: ${terrainSystem.lodMeshes ? terrainSystem.lodMeshes.length : 0}</div>`;
                        if (terrainSystem.lodMeshes && terrainSystem.lodMeshes.length > 0) {
                            terrainSystem.lodMeshes.forEach((mesh, i) => {
                                info += `<div style="margin-left: 10px;">LOD ${i}: ${mesh.visible ? '👁️ Visible' : '❌ Hidden'}</div>`;
                            });
                        }
                    }
                    
                    // Map data info
                    if (mapDataManager) {
                        info += `<div style="color: #ff00ff;">🗺️ Roads: Should see 10 road lines</div>`;
                        info += `<div style="color: #ff00ff;">🏘️ Buildings: 0 (API failed)</div>`;
                        info += `<div style="color: #ff00ff;">🌲 Forests: 2 areas</div>`;
                    }
                    
                    // Test objects
                    info += `<div style="color: #ffff00;">🧪 Test Objects:</div>`;
                    info += `<div style="margin-left: 10px;">• 5 colored cubes at origin</div>`;
                    info += `<div style="margin-left: 10px;">• 1 massive white wireframe cube</div>`;
                    info += `<div style="margin-left: 10px;">• 1 red cylinder marker</div>`;
                    info += `<div style="margin-left: 10px;">• 1 magenta test terrain</div>`;
                    info += `<div style="margin-left: 10px;">• Coordinate axes (RGB)</div>`;
                    
                    // Expected visibility
                    info += `<div style="color: #ffa500; margin-top: 10px;">👀 You Should See:</div>`;
                    info += `<div style="margin-left: 10px;">• Colored cubes (red, green, blue, yellow, magenta)</div>`;
                    info += `<div style="margin-left: 10px;">• White wireframe cube outline</div>`;
                    info += `<div style="margin-left: 10px;">• Green wireframe terrain (hills/valleys)</div>`;
                    info += `<div style="margin-left: 10px;">• Magenta wireframe terrain (to the right)</div>`;
                    info += `<div style="margin-left: 10px;">• Red cylinder and RGB axes</div>`;
                    
                    debugContent.innerHTML = info;
                }
            }
            
            requestAnimationFrame(updateDebugInfo);
        };
        
        updateDebugInfo();
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new ViimsiGame();
    game.initialize();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.gameEngine) {
        window.gameEngine.handleResize();
    }
});

// Expose game instance globally for debugging
window.ViimsiGame = ViimsiGame;