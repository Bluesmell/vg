import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class PlayerController {
    constructor(camera, canvas, physicsWorld = null, physicsMaterials = null) {
        this.camera = camera;
        this.canvas = canvas;
        this.physicsWorld = physicsWorld;
        this.physicsMaterials = physicsMaterials;
        
        // Movement properties
        this.position = new THREE.Vector3(0, 50, 200); // Start close to objects
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        
        // Physics body for collision detection
        this.physicsBody = null;
        this.initializePhysicsBody();
        
        // Movement settings
        this.moveSpeed = 10.0; // meters per second
        this.sprintMultiplier = 2.0;
        this.mouseSensitivity = 0.002;
        
        // Input state
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false,
            ctrl: false
        };
        
        this.mouseState = {
            x: 0,
            y: 0,
            locked: false
        };
        
        // Movement constraints for Viimsi Parish
        this.bounds = {
            minX: -1000,
            maxX: 1000,
            minZ: -1000,
            maxZ: 1000,
            minY: 0.5, // Minimum height above ground
            maxY: 100   // Maximum flying height
        };
        
        this.isGrounded = true;
        this.crouchHeight = 1.0;
        this.standHeight = 1.8;
        this.currentHeight = this.standHeight;
        
        this.bindControls();
        this.updateCameraPosition();
    }

    initializePhysicsBody() {
        if (!this.physicsWorld) return;

        // Create capsule-like physics body for the player
        const playerRadius = 0.5;
        const playerHeight = 1.8;
        
        // Create compound shape (sphere + cylinder for capsule-like collision)
        const sphereShape = new CANNON.Sphere(playerRadius);
        const cylinderShape = new CANNON.Cylinder(playerRadius, playerRadius, playerHeight - playerRadius * 2, 8);
        
        this.physicsBody = new CANNON.Body({ 
            mass: 70, // Average human mass in kg
            material: this.physicsMaterials?.player || null
        });
        
        // Add shapes to create capsule
        this.physicsBody.addShape(sphereShape, new CANNON.Vec3(0, playerHeight / 2 - playerRadius, 0));
        this.physicsBody.addShape(cylinderShape, new CANNON.Vec3(0, 0, 0));
        this.physicsBody.addShape(sphereShape, new CANNON.Vec3(0, -playerHeight / 2 + playerRadius, 0));
        
        // Set initial position
        this.physicsBody.position.set(this.position.x, this.position.y, this.position.z);
        
        // Prevent rotation (keep player upright)
        this.physicsBody.fixedRotation = true;
        this.physicsBody.updateMassProperties();
        
        // Add to physics world
        this.physicsWorld.addBody(this.physicsBody);
        
        // Set up collision detection
        this.setupCollisionDetection();
        
        console.log('Player physics body initialized');
    }

    setupCollisionDetection() {
        if (!this.physicsBody) return;

        this.isGrounded = false;
        this.groundContacts = [];

        // Listen for collision events
        this.physicsBody.addEventListener('collide', (event) => {
            const contact = event.contact;
            const other = event.target === this.physicsBody ? event.body : event.target;
            
            // Check if collision is with ground (body with mass 0)
            if (other.mass === 0) {
                // Calculate contact normal
                const normal = new CANNON.Vec3();
                if (event.target === this.physicsBody) {
                    contact.ni.negate(normal);
                } else {
                    normal.copy(contact.ni);
                }
                
                // Check if contact is with ground (normal pointing up)
                if (normal.y > 0.5) {
                    this.isGrounded = true;
                    this.groundContacts.push(contact);
                }
            }
        });
    }

    bindControls() {
        // Keyboard event listeners
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // Mouse event listeners
        this.canvas.addEventListener('click', () => this.requestPointerLock());
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        
        console.log('Player controls bound - Click canvas to start, WASD to move');
    }

    onKeyDown(event) {
        const key = event.code.toLowerCase();
        
        switch (key) {
            case 'keyw':
                this.keys.w = true;
                break;
            case 'keya':
                this.keys.a = true;
                break;
            case 'keys':
                this.keys.s = true;
                break;
            case 'keyd':
                this.keys.d = true;
                break;
            case 'shiftleft':
            case 'shiftright':
                this.keys.shift = true;
                break;
            case 'controlleft':
            case 'controlright':
                this.keys.ctrl = true;
                break;
            case 'escape':
                document.exitPointerLock();
                break;
        }
    }

    onKeyUp(event) {
        const key = event.code.toLowerCase();
        
        switch (key) {
            case 'keyw':
                this.keys.w = false;
                break;
            case 'keya':
                this.keys.a = false;
                break;
            case 'keys':
                this.keys.s = false;
                break;
            case 'keyd':
                this.keys.d = false;
                break;
            case 'shiftleft':
            case 'shiftright':
                this.keys.shift = false;
                break;
            case 'controlleft':
            case 'controlright':
                this.keys.ctrl = false;
                break;
        }
    }

    requestPointerLock() {
        this.canvas.requestPointerLock();
    }

    onPointerLockChange() {
        this.mouseState.locked = document.pointerLockElement === this.canvas;
        
        if (this.mouseState.locked) {
            console.log('Mouse locked - Use WASD to move, mouse to look around, ESC to unlock');
        } else {
            console.log('Mouse unlocked - Click canvas to re-enter first-person mode');
        }
    }

    onMouseMove(event) {
        if (!this.mouseState.locked) return;
        
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        // Update rotation based on mouse movement
        this.rotation.y -= movementX * this.mouseSensitivity;
        this.rotation.x -= movementY * this.mouseSensitivity;
        
        // Clamp vertical rotation to prevent over-rotation
        this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));
        
        // Apply rotation to camera
        this.camera.rotation.copy(this.rotation);
    }

    getMovementVector() {
        const direction = new THREE.Vector3();
        
        // Get forward and right vectors based on camera rotation
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        forward.applyQuaternion(this.camera.quaternion);
        right.applyQuaternion(this.camera.quaternion);
        
        // Flatten vectors to prevent flying when looking up/down
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();
        
        // Calculate movement direction based on input
        if (this.keys.w) direction.add(forward);
        if (this.keys.s) direction.sub(forward);
        if (this.keys.d) direction.add(right);
        if (this.keys.a) direction.sub(right);
        
        return direction.normalize();
    }

    updateMovement(deltaTime) {
        const movementVector = this.getMovementVector();
        
        // Calculate speed with sprint modifier
        let currentSpeed = this.moveSpeed;
        if (this.keys.shift) {
            currentSpeed *= this.sprintMultiplier;
        }
        
        // Handle crouching
        const targetHeight = this.keys.ctrl ? this.crouchHeight : this.standHeight;
        this.currentHeight = THREE.MathUtils.lerp(this.currentHeight, targetHeight, deltaTime * 5);
        
        if (this.physicsBody) {
            // Physics-based movement
            this.updatePhysicsMovement(movementVector, currentSpeed, deltaTime);
        } else {
            // Fallback to non-physics movement
            this.updateDirectMovement(movementVector, currentSpeed, deltaTime);
        }
        
        this.updateCameraPosition();
    }

    updatePhysicsMovement(movementVector, currentSpeed, deltaTime) {
        // Reset ground detection
        this.isGrounded = false;
        this.groundContacts = [];
        
        // Apply movement by directly setting velocity (more responsive)
        if (movementVector.length() > 0) {
            // Set horizontal velocity directly
            this.physicsBody.velocity.x = movementVector.x * currentSpeed;
            this.physicsBody.velocity.z = movementVector.z * currentSpeed;
        } else {
            // Apply friction when not moving
            this.physicsBody.velocity.x *= 0.8;
            this.physicsBody.velocity.z *= 0.8;
        }

        // Limit horizontal velocity to max sprint speed
        const maxSpeed = this.moveSpeed * this.sprintMultiplier;
        const horizontalVelocity = Math.sqrt(this.physicsBody.velocity.x ** 2 + this.physicsBody.velocity.z ** 2);

        if (horizontalVelocity > maxSpeed) {
            const factor = maxSpeed / horizontalVelocity;
            this.physicsBody.velocity.x *= factor;
            this.physicsBody.velocity.z *= factor;
        }
        
        // Update position from physics body
        this.position.copy(this.physicsBody.position);
        
        // Adjust camera height for crouching
        this.position.y += (this.currentHeight - this.standHeight);
    }

    updateDirectMovement(movementVector, currentSpeed, deltaTime) {
        // Apply movement
        if (movementVector.length() > 0) {
            this.velocity.x = movementVector.x * currentSpeed;
            this.velocity.z = movementVector.z * currentSpeed;
        } else {
            // Apply friction when not moving
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
        }
        
        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // Apply bounds checking for Viimsi Parish area
        this.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.position.x));
        this.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.position.z));
        this.position.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.position.y));
        
        // Adjust for crouching
        this.position.y = this.currentHeight;
    }

    updateCameraPosition() {
        this.camera.position.copy(this.position);
    }

    update(deltaTime) {
        this.updateMovement(deltaTime);
        
        // Debug: Log physics body state occasionally
        if (this.physicsBody && Math.random() < 0.01) { // 1% chance per frame
            console.log('Physics body position:', this.physicsBody.position);
            console.log('Physics body velocity:', this.physicsBody.velocity);
        }
    }

    // Get current movement state for debugging
    getMovementState() {
        return {
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            rotation: this.rotation.clone(),
            keys: { ...this.keys },
            mouseLocked: this.mouseState.locked,
            isGrounded: this.isGrounded,
            height: this.currentHeight
        };
    }

    // Set position (useful for teleporting to specific Viimsi locations)
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.updateCameraPosition();
    }

    // Teleport to key Viimsi Parish locations
    teleportToLocation(locationName) {
        const locations = {
            'viimsi-manor': { x: 0, y: 5, z: 0 },
            'muuga-harbor': { x: 200, y: 5, z: -100 },
            'prangli-ferry': { x: -150, y: 5, z: 200 },
            'haabneeme': { x: 100, y: 5, z: 100 },
            'randvere': { x: -200, y: 5, z: -200 }
        };
        
        const location = locations[locationName];
        if (location) {
            this.setPosition(location.x, location.y, location.z);
            console.log(`Teleported to ${locationName} in Viimsi Parish`);
        } else {
            console.warn(`Unknown location: ${locationName}`);
        }
    }

    dispose() {
        // Remove event listeners
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('mousemove', this.onMouseMove);
        
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }
        
        // Clean up physics body
        if (this.physicsBody && this.physicsWorld) {
            this.physicsWorld.removeBody(this.physicsBody);
            this.physicsBody = null;
        }
        
        console.log('Player controller disposed');
    }
}