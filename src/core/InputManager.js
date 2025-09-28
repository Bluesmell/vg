export class InputManager {
    constructor() {
        this.keyboardState = new Map();
        this.mouseState = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            buttons: new Set(),
            locked: false
        };
        
        this.actionMappings = {
            // Movement actions
            'move-forward': ['KeyW'],
            'move-backward': ['KeyS'],
            'move-left': ['KeyA'],
            'move-right': ['KeyD'],
            'sprint': ['ShiftLeft', 'ShiftRight'],
            'crouch': ['ControlLeft', 'ControlRight'],
            
            // Interaction actions
            'interact': ['KeyE'],
            'inventory': ['Tab'],
            'map': ['KeyM'],
            'escape': ['Escape'],
            
            // Debug actions
            'debug-panel': ['F3'],
            'physics-debug': ['F4']
        };
        
        this.bindEvents();
    }

    bindEvents() {
        // Keyboard events
        document.addEventListener('keydown', (event) => {
            this.keyboardState.set(event.code, true);
            
            // Prevent default for game keys
            if (this.isGameKey(event.code)) {
                event.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keyboardState.set(event.code, false);
        });
        
        // Mouse events
        document.addEventListener('mousedown', (event) => {
            this.mouseState.buttons.add(event.button);
        });
        
        document.addEventListener('mouseup', (event) => {
            this.mouseState.buttons.delete(event.button);
        });
        
        document.addEventListener('mousemove', (event) => {
            this.mouseState.deltaX = event.movementX || 0;
            this.mouseState.deltaY = event.movementY || 0;
            this.mouseState.x = event.clientX;
            this.mouseState.y = event.clientY;
        });
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', () => {
            this.mouseState.locked = document.pointerLockElement !== null;
        });
        
        console.log('Input manager initialized');
    }

    isGameKey(keyCode) {
        // Check if this key is used by the game
        for (const keys of Object.values(this.actionMappings)) {
            if (keys.includes(keyCode)) {
                return true;
            }
        }
        return false;
    }

    isKeyPressed(keyCode) {
        return this.keyboardState.get(keyCode) || false;
    }

    isActionPressed(actionName) {
        const keys = this.actionMappings[actionName];
        if (!keys) return false;
        
        return keys.some(key => this.isKeyPressed(key));
    }

    getMovementVector() {
        const vector = { x: 0, z: 0 };
        
        if (this.isActionPressed('move-forward')) vector.z -= 1;
        if (this.isActionPressed('move-backward')) vector.z += 1;
        if (this.isActionPressed('move-left')) vector.x -= 1;
        if (this.isActionPressed('move-right')) vector.x += 1;
        
        // Normalize diagonal movement
        const length = Math.sqrt(vector.x * vector.x + vector.z * vector.z);
        if (length > 0) {
            vector.x /= length;
            vector.z /= length;
        }
        
        return vector;
    }

    getMouseDelta() {
        const delta = {
            x: this.mouseState.deltaX,
            y: this.mouseState.deltaY
        };
        
        // Reset delta after reading
        this.mouseState.deltaX = 0;
        this.mouseState.deltaY = 0;
        
        return delta;
    }

    isMouseLocked() {
        return this.mouseState.locked;
    }

    isMouseButtonPressed(button) {
        return this.mouseState.buttons.has(button);
    }

    // Get input state for debugging
    getInputState() {
        return {
            keyboard: Object.fromEntries(this.keyboardState),
            mouse: { ...this.mouseState },
            actions: Object.keys(this.actionMappings).reduce((acc, action) => {
                acc[action] = this.isActionPressed(action);
                return acc;
            }, {})
        };
    }

    dispose() {
        // Event listeners are automatically cleaned up when the document is unloaded
        // But we can clear our state
        this.keyboardState.clear();
        this.mouseState.buttons.clear();
        console.log('Input manager disposed');
    }
}