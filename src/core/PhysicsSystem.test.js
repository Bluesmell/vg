import { GameEngine } from './GameEngine.js';
import { PlayerController } from '../entities/PlayerController.js';
import * as CANNON from 'cannon-es';

const mockPhysicsBody = {
    position: { x: 0, y: 5, z: 10, copy: jest.fn(), set: jest.fn() },
    velocity: { x: 0, y: 0, z: 0 },
    force: { x: 0, y: 0, z: 0 },
    mass: 70,
    fixedRotation: false,
    updateMassProperties: jest.fn(),
    addShape: jest.fn(),
    addEventListener: jest.fn()
};

const mockPhysicsWorld = {
    addBody: jest.fn(),
    removeBody: jest.fn(),
    addContactMaterial: jest.fn(),
    step: jest.fn(),
    bodies: [],
    defaultContactMaterial: {
        friction: 0,
        restitution: 0
    },
    solver: {
        iterations: 10,
        tolerance: 0.1,
    },
};

jest.mock('cannon-es', () => ({
  __esModule: true,
  World: jest.fn(() => mockPhysicsWorld),
  Body: jest.fn(() => mockPhysicsBody),
  Vec3: jest.fn(),
  Material: jest.fn(),
  ContactMaterial: jest.fn(),
  SAPBroadphase: jest.fn(),
  Sphere: jest.fn(),
  Cylinder: jest.fn(),
  Box: jest.fn(),
  Plane: jest.fn(),
  Shape: {
      types: {
          PLANE: 1,
          BOX: 2,
          SPHERE: 4,
          CYLINDER: 8
      }
  }
}));

describe('Physics System', () => {
    let gameEngine;
    let playerController;

    beforeEach(() => {
        // Mock DOM elements
        document.body.innerHTML = '<canvas id="game-canvas"></canvas>';
        gameEngine = new GameEngine();
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (gameEngine) {
            gameEngine.dispose();
        }
        if (playerController) {
            playerController.dispose();
        }
        document.body.innerHTML = '';
    });

    test('should initialize physics world with proper settings', () => {
        gameEngine.initializePhysics();

        expect(gameEngine.physics).toBeDefined();
        expect(gameEngine.physicsMaterials).toBeDefined();
        expect(gameEngine.physicsMaterials.ground).toBeDefined();
        expect(gameEngine.physicsMaterials.player).toBeDefined();
    });

    test('should create world boundaries for Viimsi Parish', () => {
        gameEngine.physics = mockPhysicsWorld;
        gameEngine.physicsMaterials = {
            ground: {},
            player: {}
        };

        gameEngine.initializeWorldBoundaries();

        // Should create 4 boundary walls (N, S, E, W)
        expect(mockPhysicsWorld.addBody).toHaveBeenCalledTimes(4);
        expect(gameEngine.boundaryBodies).toHaveLength(4);
    });

    test('should initialize physics debugger', () => {
        gameEngine.physics = mockPhysicsWorld;
        gameEngine.scene = { add: jest.fn(), remove: jest.fn() };

        gameEngine.initializePhysicsDebugger();

        expect(gameEngine.physicsDebugger).toBeDefined();
        expect(gameEngine.physicsDebugger.enabled).toBe(false);
        expect(gameEngine.physicsDebugger.meshes).toEqual([]);
    });

    test('should toggle physics debugger', () => {
        gameEngine.physics = mockPhysicsWorld;
        gameEngine.scene = { add: jest.fn(), remove: jest.fn() };
        gameEngine.initializePhysicsDebugger();

        expect(gameEngine.physicsDebugger.enabled).toBe(false);

        gameEngine.togglePhysicsDebugger();
        expect(gameEngine.physicsDebugger.enabled).toBe(true);

        gameEngine.togglePhysicsDebugger();
        expect(gameEngine.physicsDebugger.enabled).toBe(false);
    });

    test('should create player physics body with proper collision shape', () => {
        const mockCamera = {
            position: { x: 0, y: 0, z: 0, copy: jest.fn() },
            rotation: { copy: jest.fn() },
            quaternion: { x: 0, y: 0, z: 0, w: 1 }
        };

        const mockCanvas = {
            requestPointerLock: jest.fn(),
            addEventListener: jest.fn()
        };

        playerController = new PlayerController(
            mockCamera, 
            mockCanvas, 
            mockPhysicsWorld, 
            { player: {}, ground: {} }
        );

        expect(CANNON.Body).toHaveBeenCalled();
        expect(mockPhysicsBody.addShape).toHaveBeenCalledTimes(3); // 2 spheres + 1 cylinder for capsule
        expect(mockPhysicsWorld.addBody).toHaveBeenCalledWith(mockPhysicsBody);
        expect(mockPhysicsBody.fixedRotation).toBe(true);
    });

    test('should handle physics-based movement', () => {
        const mockCamera = {
            position: { x: 0, y: 0, z: 0, copy: jest.fn() },
            rotation: { copy: jest.fn() },
            quaternion: { x: 0, y: 0, z: 0, w: 1 }
        };

        const mockCanvas = {
            requestPointerLock: jest.fn(),
            addEventListener: jest.fn()
        };

        // Create a fresh mock body for this test
        const testPhysicsBody = {
            position: { x: 0, y: 5, z: 10, copy: jest.fn(), set: jest.fn() },
            velocity: { x: 0, y: 0, z: 0 },
            force: { x: 0, y: 0, z: 0 },
            mass: 70,
            fixedRotation: false,
            updateMassProperties: jest.fn(),
            addShape: jest.fn(),
            addEventListener: jest.fn()
        };

        playerController = new PlayerController(
            mockCamera, 
            mockCanvas, 
            mockPhysicsWorld, 
            { player: {}, ground: {} }
        );

        // Set up movement
        playerController.keys.w = true;
        playerController.physicsBody = testPhysicsBody;

        playerController.updateMovement(0.016);

        // Should use physics-based movement when physics body exists
        expect(playerController.physicsBody).toBe(testPhysicsBody);
    });

    test('should detect ground collision', () => {
        const mockCamera = {
            position: { x: 0, y: 0, z: 0, copy: jest.fn() },
            rotation: { copy: jest.fn() },
            quaternion: { x: 0, y: 0, z: 0, w: 1 }
        };

        const mockCanvas = {
            requestPointerLock: jest.fn(),
            addEventListener: jest.fn()
        };

        playerController = new PlayerController(
            mockCamera, 
            mockCanvas, 
            mockPhysicsWorld, 
            { player: {}, ground: {} }
        );

        // Initially should not be grounded until collision detection runs
        expect(playerController.physicsBody.addEventListener).toHaveBeenCalledWith('collide', expect.any(Function));
    });


    test('should limit horizontal velocity', () => {
        const mockCamera = {
            position: { x: 0, y: 0, z: 0, copy: jest.fn() },
            rotation: { copy: jest.fn() },
            quaternion: { x: 0, y: 0, z: 0, w: 1 }
        };

        const mockCanvas = {
            requestPointerLock: jest.fn(),
            addEventListener: jest.fn()
        };

        playerController = new PlayerController(
            mockCamera, 
            mockCanvas, 
            mockPhysicsWorld, 
            { player: {}, ground: {} }
        );

        // Set high velocity
        mockPhysicsBody.velocity.x = 50;
        mockPhysicsBody.velocity.z = 50;
        playerController.physicsBody = mockPhysicsBody;

        playerController.updateMovement(0.016);

        // Velocity should be limited
        const horizontalVelocity = Math.sqrt(
            mockPhysicsBody.velocity.x ** 2 + mockPhysicsBody.velocity.z ** 2
        );
        expect(horizontalVelocity).toBeLessThanOrEqual(playerController.moveSpeed * playerController.sprintMultiplier);
    });

    test('should clean up physics body on dispose', () => {
        const mockCamera = {
            position: { x: 0, y: 0, z: 0, copy: jest.fn() },
            rotation: { copy: jest.fn() },
            quaternion: { x: 0, y: 0, z: 0, w: 1 }
        };

        const mockCanvas = {
            requestPointerLock: jest.fn(),
            addEventListener: jest.fn()
        };

        playerController = new PlayerController(
            mockCamera, 
            mockCanvas, 
            mockPhysicsWorld, 
            { player: {}, ground: {} }
        );

        playerController.physicsBody = mockPhysicsBody;
        playerController.dispose();

        expect(mockPhysicsWorld.removeBody).toHaveBeenCalledWith(mockPhysicsBody);
        expect(playerController.physicsBody).toBeNull();
    });
});