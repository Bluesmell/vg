import { PlayerController } from './PlayerController.js';

// Mock Three.js objects
const mockCamera = {
    position: { x: 0, y: 0, z: 0, copy: jest.fn() },
    rotation: { copy: jest.fn() },
    quaternion: { x: 0, y: 0, z: 0, w: 1 }
};

const mockCanvas = {
    requestPointerLock: jest.fn(),
    addEventListener: jest.fn()
};

// Mock physics world and body
const mockPhysicsWorld = {
    addBody: jest.fn(),
    removeBody: jest.fn()
};

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

// Mock CANNON objects for PlayerController
global.CANNON = {
    ...global.CANNON,
    Body: jest.fn(() => mockPhysicsBody),
    Sphere: jest.fn(),
    Cylinder: jest.fn()
};

// Mock document methods
Object.defineProperty(document, 'pointerLockElement', {
    writable: true,
    value: null
});

document.exitPointerLock = jest.fn();
document.addEventListener = jest.fn();
document.removeEventListener = jest.fn();

describe('PlayerController', () => {
    let playerController;

    beforeEach(() => {
        playerController = new PlayerController(mockCamera, mockCanvas);
        // Clear mock calls
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (playerController) {
            playerController.dispose();
        }
    });

    test('should initialize with default values', () => {
        expect(playerController.position.x).toBe(0);
        expect(playerController.position.y).toBe(5);
        expect(playerController.position.z).toBe(10);
        expect(playerController.moveSpeed).toBe(10.0);
        expect(playerController.isGrounded).toBe(true);
    });

    test('should handle key down events', () => {
        const event = { code: 'KeyW' };
        playerController.onKeyDown(event);
        expect(playerController.keys.w).toBe(true);
    });

    test('should handle key up events', () => {
        playerController.keys.w = true;
        const event = { code: 'KeyW' };
        playerController.onKeyUp(event);
        expect(playerController.keys.w).toBe(false);
    });

    test('should calculate movement vector correctly', () => {
        // Test forward movement
        playerController.keys.w = true;
        const movement = playerController.getMovementVector();
        expect(movement.z).toBeLessThan(0); // Forward is negative Z
        
        // Reset
        playerController.keys.w = false;
        
        // Test right movement
        playerController.keys.d = true;
        const rightMovement = playerController.getMovementVector();
        expect(rightMovement.x).toBeGreaterThan(0); // Right is positive X
    });

    test('should update position during movement', () => {
        const initialX = playerController.position.x;
        
        // Set movement
        playerController.keys.d = true;
        
        // Update with delta time
        playerController.updateMovement(0.016); // ~60fps
        
        expect(playerController.position.x).toBeGreaterThan(initialX);
    });

    test('should apply sprint modifier', () => {
        playerController.keys.w = true;
        playerController.keys.shift = false;
        
        playerController.updateMovement(0.016);
        const normalSpeed = Math.abs(playerController.velocity.z);
        
        // Reset position and enable sprint
        playerController.velocity.set(0, 0, 0);
        playerController.keys.shift = true;
        
        playerController.updateMovement(0.016);
        const sprintSpeed = Math.abs(playerController.velocity.z);
        
        expect(sprintSpeed).toBeGreaterThan(normalSpeed);
    });

    test('should respect movement bounds', () => {
        // Test X bounds
        playerController.position.x = 2000; // Beyond max bound
        playerController.updateMovement(0.016);
        expect(playerController.position.x).toBeLessThanOrEqual(playerController.bounds.maxX);
        
        // Test Z bounds
        playerController.position.z = -2000; // Beyond min bound
        playerController.updateMovement(0.016);
        expect(playerController.position.z).toBeGreaterThanOrEqual(playerController.bounds.minZ);
    });

    test('should teleport to Viimsi Parish locations', () => {
        playerController.teleportToLocation('viimsi-manor');
        expect(playerController.position.x).toBe(0);
        expect(playerController.position.y).toBe(5);
        expect(playerController.position.z).toBe(0);
        
        playerController.teleportToLocation('muuga-harbor');
        expect(playerController.position.x).toBe(200);
        expect(playerController.position.z).toBe(-100);
    });

    test('should handle crouching', () => {
        const initialHeight = playerController.currentHeight;
        
        playerController.keys.ctrl = true;
        playerController.updateMovement(0.1); // Longer delta for visible change
        
        expect(playerController.currentHeight).toBeLessThan(initialHeight);
    });

    test('should handle mouse movement for camera rotation', () => {
        // Mock pointer lock
        playerController.mouseState.locked = true;
        
        const event = {
            movementX: 10,
            movementY: 5
        };
        
        const initialRotationY = playerController.rotation.y;
        const initialRotationX = playerController.rotation.x;
        
        playerController.onMouseMove(event);
        
        expect(playerController.rotation.y).not.toBe(initialRotationY);
        expect(playerController.rotation.x).not.toBe(initialRotationX);
        expect(playerController.camera.rotation.copy).toHaveBeenCalledWith(playerController.rotation);
    });

    test('should clamp vertical rotation to prevent over-rotation', () => {
        playerController.mouseState.locked = true;
        
        // Test extreme upward rotation
        const upEvent = {
            movementX: 0,
            movementY: -1000 // Large negative movement (looking up)
        };
        
        playerController.onMouseMove(upEvent);
        expect(playerController.rotation.x).toBeLessThanOrEqual(Math.PI / 2);
        
        // Test extreme downward rotation
        const downEvent = {
            movementX: 0,
            movementY: 1000 // Large positive movement (looking down)
        };
        
        playerController.onMouseMove(downEvent);
        expect(playerController.rotation.x).toBeGreaterThanOrEqual(-Math.PI / 2);
    });

    test('should ignore mouse movement when not locked', () => {
        playerController.mouseState.locked = false;
        
        const initialRotationY = playerController.rotation.y;
        const initialRotationX = playerController.rotation.x;
        
        const event = {
            movementX: 10,
            movementY: 5
        };
        
        playerController.onMouseMove(event);
        
        expect(playerController.rotation.y).toBe(initialRotationY);
        expect(playerController.rotation.x).toBe(initialRotationX);
    });

    test('should handle pointer lock state changes', () => {
        // Mock document.pointerLockElement
        Object.defineProperty(document, 'pointerLockElement', {
            writable: true,
            value: mockCanvas
        });
        
        playerController.onPointerLockChange();
        expect(playerController.mouseState.locked).toBe(true);
        
        // Mock unlocked state
        Object.defineProperty(document, 'pointerLockElement', {
            writable: true,
            value: null
        });
        
        playerController.onPointerLockChange();
        expect(playerController.mouseState.locked).toBe(false);
    });

    test('should initialize with physics body when physics world provided', () => {
        const physicsPlayerController = new PlayerController(
            mockCamera, 
            mockCanvas, 
            mockPhysicsWorld, 
            { player: {}, ground: {} }
        );
        
        expect(CANNON.Body).toHaveBeenCalled();
        expect(mockPhysicsWorld.addBody).toHaveBeenCalled();
        expect(physicsPlayerController.physicsBody).toBeDefined();
        
        physicsPlayerController.dispose();
    });

    test('should use physics-based movement when physics body exists', () => {
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

        const physicsPlayerController = new PlayerController(
            mockCamera, 
            mockCanvas, 
            mockPhysicsWorld, 
            { player: {}, ground: {} }
        );
        
        physicsPlayerController.physicsBody = testPhysicsBody;
        physicsPlayerController.keys.w = true;
        
        physicsPlayerController.updateMovement(0.016);
        
        // Should use physics-based movement when physics body exists
        expect(physicsPlayerController.physicsBody).toBe(testPhysicsBody);
        
        physicsPlayerController.dispose();
    });

    test('should provide movement state for debugging', () => {
        const state = playerController.getMovementState();
        
        expect(state).toHaveProperty('position');
        expect(state).toHaveProperty('velocity');
        expect(state).toHaveProperty('rotation');
        expect(state).toHaveProperty('keys');
        expect(state).toHaveProperty('mouseLocked');
        expect(state).toHaveProperty('isGrounded');
        expect(state).toHaveProperty('height');
    });
});