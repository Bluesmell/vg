import { InputManager } from './InputManager.js';

describe('InputManager', () => {
    let inputManager;

    beforeEach(() => {
        inputManager = new InputManager();
    });

    afterEach(() => {
        if (inputManager) {
            inputManager.dispose();
        }
    });

    test('should initialize with default state', () => {
        expect(inputManager.keyboardState).toBeInstanceOf(Map);
        expect(inputManager.mouseState.locked).toBe(false);
        expect(inputManager.mouseState.buttons).toBeInstanceOf(Set);
    });

    test('should detect game keys correctly', () => {
        expect(inputManager.isGameKey('KeyW')).toBe(true);
        expect(inputManager.isGameKey('KeyA')).toBe(true);
        expect(inputManager.isGameKey('KeyS')).toBe(true);
        expect(inputManager.isGameKey('KeyD')).toBe(true);
        expect(inputManager.isGameKey('KeyZ')).toBe(false); // Not a game key
    });

    test('should track key press state', () => {
        inputManager.keyboardState.set('KeyW', true);
        expect(inputManager.isKeyPressed('KeyW')).toBe(true);
        expect(inputManager.isKeyPressed('KeyS')).toBe(false);
    });

    test('should detect action presses', () => {
        inputManager.keyboardState.set('KeyW', true);
        expect(inputManager.isActionPressed('move-forward')).toBe(true);
        expect(inputManager.isActionPressed('move-backward')).toBe(false);
    });

    test('should calculate movement vector correctly', () => {
        // Test forward movement
        inputManager.keyboardState.set('KeyW', true);
        const movement = inputManager.getMovementVector();
        expect(movement.z).toBe(-1);
        
        // Test diagonal movement (should be normalized)
        inputManager.keyboardState.set('KeyD', true);
        const diagonalMovement = inputManager.getMovementVector();
        const length = Math.sqrt(diagonalMovement.x * diagonalMovement.x + diagonalMovement.z * diagonalMovement.z);
        expect(Math.abs(length - 1)).toBeLessThan(0.001); // Should be normalized to 1
    });

    test('should handle mouse delta correctly', () => {
        inputManager.mouseState.deltaX = 10;
        inputManager.mouseState.deltaY = 5;
        
        const delta = inputManager.getMouseDelta();
        expect(delta.x).toBe(10);
        expect(delta.y).toBe(5);
        
        // Delta should be reset after reading
        const secondDelta = inputManager.getMouseDelta();
        expect(secondDelta.x).toBe(0);
        expect(secondDelta.y).toBe(0);
    });

    test('should track mouse button state', () => {
        inputManager.mouseState.buttons.add(0); // Left mouse button
        expect(inputManager.isMouseButtonPressed(0)).toBe(true);
        expect(inputManager.isMouseButtonPressed(1)).toBe(false);
    });

    test('should provide input state for debugging', () => {
        const state = inputManager.getInputState();
        
        expect(state).toHaveProperty('keyboard');
        expect(state).toHaveProperty('mouse');
        expect(state).toHaveProperty('actions');
        expect(state.actions).toHaveProperty('move-forward');
        expect(state.actions).toHaveProperty('move-backward');
    });
});