import React from 'react';
import ReactDOM from 'react-dom';
import { GameEngine } from './core/GameEngine.js';
import { LoadingManager } from './core/LoadingManager.js';
import Minimap from './components/Minimap.jsx';

class ViimsiGame {
    constructor() {
        this.gameEngine = null;
        this.loadingManager = new LoadingManager();
        this.uiContainer = null;
    }

    async initialize() {
        try {
            this.loadingManager.show();
            await this.loadingManager.simulateLoading(2000);

            this.gameEngine = new GameEngine();
            await this.gameEngine.initialize();

            this.loadingManager.hide();

            this.gameEngine.start();

            // Setup the container for React UI components
            this.initializeUIContainer();

            window.gameEngine = this.gameEngine;

            this.startUIUpdates();

            console.log('Viimsi Parish 3D Game initialized successfully!');
            console.log('Click the canvas to enter first-person mode, then use WASD to move around');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.loadingManager.showError('Failed to load game. Please refresh and try again.');
        }
    }

    initializeUIContainer() {
        this.uiContainer = document.getElementById('react-ui');
        if (!this.uiContainer) {
            console.error('UI container with id "react-ui" not found.');
        }
    }

    startUIUpdates() {
        const updateUI = () => {
            if (this.gameEngine && this.gameEngine.scene && this.uiContainer) {
                const playerPosition = this.gameEngine.camera.position;
                const playerRotation = this.gameEngine.camera.rotation;
                const worldBounds = this.gameEngine.terrainSystem ? this.gameEngine.terrainSystem.getWorldBounds() : { minX: -500, maxX: 500, minZ: -500, maxZ: 500 };

                // Render React components
                ReactDOM.render(
                    <Minimap playerPosition={playerPosition} playerRotation={playerRotation} worldBounds={worldBounds} />,
                    this.uiContainer
                );

                const debugContent = document.getElementById('debug-content');
                if (debugContent) {
                    const terrainSystem = this.gameEngine.terrainSystem;
                    let info = `<div style="color: #10b981;">✅ Scene Objects: ${this.gameEngine.scene.children.length}</div>`;
                    const cam = this.gameEngine.camera;
                    info += `<div>📷 Camera: (${cam.position.x.toFixed(0)}, ${cam.position.y.toFixed(0)}, ${cam.position.z.toFixed(0)})</div>`;
                    if (terrainSystem) {
                        info += `<div style="color: #00ff00;">🏔️ Terrain LOD Meshes: ${terrainSystem.lodMeshes ? terrainSystem.lodMeshes.length : 0}</div>`;
                        if (terrainSystem.lodMeshes && terrainSystem.lodMeshes.length > 0) {
                            terrainSystem.lodMeshes.forEach((mesh, i) => {
                                info += `<div style="margin-left: 10px;">LOD ${i}: ${mesh.visible ? '👁️ Visible' : '❌ Hidden'}</div>`;
                            });
                        }
                    }
                    debugContent.innerHTML = info;
                }
            }

            requestAnimationFrame(updateUI);
        };

        updateUI();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new ViimsiGame();
    game.initialize();
});

window.addEventListener('resize', () => {
    if (window.gameEngine) {
        window.gameEngine.handleResize();
    }
});

window.ViimsiGame = ViimsiGame;