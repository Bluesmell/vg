import { GameEngine } from './GameEngine.js';

describe('GameEngine', () => {
    let gameEngine;

    beforeEach(() => {
        // Mock DOM elements
        document.body.innerHTML = '<canvas id="game-canvas"></canvas>';
        gameEngine = new GameEngine();
    });

    afterEach(() => {
        if (gameEngine) {
            gameEngine.dispose();
        }
        document.body.innerHTML = '';
    });

    test('should initialize without errors', async () => {
        expect(() => new GameEngine()).not.toThrow();
        expect(gameEngine).toBeDefined();
        expect(gameEngine.isRunning).toBe(false);
    });

    test('should have required properties after construction', () => {
        expect(gameEngine.renderer).toBeNull();
        expect(gameEngine.scene).toBeNull();
        expect(gameEngine.camera).toBeNull();
        expect(gameEngine.physics).toBeNull();
        expect(gameEngine.systems).toBeInstanceOf(Map);
    });

    test('should register and retrieve systems', () => {
        const mockSystem = { update: jest.fn() };
        
        gameEngine.registerSystem('testSystem', mockSystem);
        
        expect(gameEngine.getSystem('testSystem')).toBe(mockSystem);
        expect(gameEngine.systems.size).toBe(1);
    });

    test('should handle resize events', () => {
        // Mock camera and renderer
        gameEngine.camera = {
            aspect: 1,
            updateProjectionMatrix: jest.fn()
        };
        gameEngine.renderer = {
            setSize: jest.fn(),
            dispose: jest.fn()
        };

        gameEngine.handleResize();

        expect(gameEngine.camera.updateProjectionMatrix).toHaveBeenCalled();
        expect(gameEngine.renderer.setSize).toHaveBeenCalled();
    });

    test('should initialize Three.js scene components', async () => {
        // Mock the required methods
        gameEngine.initializeRenderer = jest.fn();
        gameEngine.initializeScene = jest.fn();
        gameEngine.initializeCamera = jest.fn();
        gameEngine.initializePhysics = jest.fn();
        gameEngine.initializeLighting = jest.fn();
        gameEngine.initializeTerrainSystems = jest.fn();
        gameEngine.initializePlayerSystems = jest.fn();

        await gameEngine.initialize();

        expect(gameEngine.initializeRenderer).toHaveBeenCalled();
        expect(gameEngine.initializeScene).toHaveBeenCalled();
        expect(gameEngine.initializeCamera).toHaveBeenCalled();
        expect(gameEngine.initializePhysics).toHaveBeenCalled();
        expect(gameEngine.initializeLighting).toHaveBeenCalled();
        expect(gameEngine.initializeTerrainSystems).toHaveBeenCalled();
        expect(gameEngine.initializePlayerSystems).toHaveBeenCalled();
    });

    test('should start and stop game loop', () => {
        // Mock physics for the game loop
        gameEngine.physics = {
            step: jest.fn()
        };
        gameEngine.update = jest.fn();
        gameEngine.render = jest.fn();
        
        expect(gameEngine.isRunning).toBe(false);
        
        gameEngine.start();
        expect(gameEngine.isRunning).toBe(true);
        
        gameEngine.stop();
        expect(gameEngine.isRunning).toBe(false);
    });
});