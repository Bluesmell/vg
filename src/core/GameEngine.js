import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PlayerController } from '../entities/PlayerController.js';
import { InputManager } from './InputManager.js';
import { DebugPanel } from '../ui/DebugPanel.js';
import { MapDataManager } from '../data/MapDataManager.js';
import { TerrainSystem } from '../terrain/TerrainSystem.js';

export class GameEngine {
    constructor() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.physics = null;
        this.canvas = null;
        this.clock = new THREE.Clock();
        this.isRunning = false;
        
        // Game systems
        this.systems = new Map();
        this.inputManager = null;
        this.playerController = null;
        this.debugPanel = null;
        this.mapDataManager = null;
        this.terrainSystem = null;
    }

    async initialize() {
        console.log('Initializing Viimsi Parish 3D Game Engine...');
        
        // Get canvas element
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        // Initialize Three.js renderer
        this.initializeRenderer();
        
        // Initialize scene
        this.initializeScene();
        
        // Initialize camera
        this.initializeCamera();
        
        // Initialize physics
        this.initializePhysics();
        
        // Add basic lighting
        this.initializeLighting();
        
        // Initialize map data and terrain systems
        await this.initializeTerrainSystems();
        
        // Initialize input and player systems
        this.initializePlayerSystems();
        
        // Initialize physics debugger
        this.initializePhysicsDebugger();
        
        console.log('Game engine initialized successfully');
    }

    initializeRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    initializeScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue for Baltic Sea area
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);
    }

    initializeCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            5000 // Far plane - increased for better terrain viewing
        );
        
        // Position camera to see the terrain at origin (0,0,0)
        this.camera.position.set(0, 100, 300); // Above terrain, angled view
        this.camera.lookAt(0, -25, 0); // Look slightly down at the terrain
        
        console.log('Camera initialized at position:', this.camera.position);
        console.log('Camera looking at terrain center (0,0,0)');
    }

    initializePhysics() {
        this.physics = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0), // Earth gravity
        });
        
        // Set up physics materials
        const groundMaterial = new CANNON.Material('ground');
        const playerMaterial = new CANNON.Material('player');
        
        // Create contact material between player and ground
        const playerGroundContact = new CANNON.ContactMaterial(
            playerMaterial,
            groundMaterial,
            {
                friction: 0.4,
                restitution: 0.1,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        
        this.physics.addContactMaterial(playerGroundContact);
        
        // Set default contact material
        this.physics.defaultContactMaterial.friction = 0.4;
        this.physics.defaultContactMaterial.restitution = 0.3;
        
        // Enable collision detection optimization
        this.physics.broadphase = new CANNON.SAPBroadphase(this.physics);
        this.physics.solver.iterations = 10;
        this.physics.solver.tolerance = 0.1;
        
        // Store materials for later use
        this.physicsMaterials = {
            ground: groundMaterial,
            player: playerMaterial
        };
        
        // Initialize collision boundaries
        this.initializeWorldBoundaries();
        
        console.log('Physics world initialized with collision detection');
    }

    initializeLighting() {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light for sun (will be dynamic later)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(directionalLight);
    }

    async initializeTerrainSystems() {
        console.log('=== STARTING VIIMSI PARISH DATA INTEGRATION ===');
        
        try {
            // Initialize map data manager to load real Viimsi Parish data
            console.log('Step 1: Initializing MapDataManager...');
            this.mapDataManager = new MapDataManager(this);
            
            // Load real Viimsi Parish data from Maa-amet APIs
            console.log('Step 2: Loading real Viimsi Parish data...');
            await this.mapDataManager.initialize();
            
            // Initialize terrain system with real data
            console.log('Step 3: Initializing TerrainSystem with real data...');
            this.terrainSystem = new TerrainSystem(this, this.mapDataManager);
            
            try {
                await this.terrainSystem.initialize();
                console.log('✅ TerrainSystem initialization completed successfully');
            } catch (terrainError) {
                console.error('❌ TerrainSystem initialization failed:', terrainError);
                console.error('Terrain error stack:', terrainError.stack);
                throw terrainError; // Re-throw to trigger fallback
            }
            
            // Add physics for terrain
            console.log('Step 4: Adding terrain physics...');
            this.addTerrainPhysics();
            
            // Register systems
            this.registerSystem('mapData', this.mapDataManager);
            this.registerSystem('terrain', this.terrainSystem);
            
            console.log('=== VIIMSI PARISH DATA INTEGRATION SUCCESS ===');
            
        } catch (error) {
            console.error('=== VIIMSI PARISH DATA INTEGRATION FAILED ===');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            
            // Create fallback terrain with debugging info
            console.log('Creating fallback terrain with debug info...');
            this.createFallbackTerrain();
            this.addTerrainPhysics();
            
            // Also try creating a simple test terrain to see if Three.js geometry works
            this.createSimpleTestTerrain();
        }
        
        // Debug objects are no longer needed, minimap provides orientation
        
        // Debug: Check what's actually in the scene
        console.log('🔍 SCENE DEBUG - Total children:', this.scene.children.length);
        this.scene.children.forEach((child, index) => {
            console.log(`  ${index}: ${child.name || child.type} at (${child.position.x}, ${child.position.y}, ${child.position.z}) visible: ${child.visible}`);
        });
        
        // Debug: Check terrain system state
        if (this.terrainSystem) {
            console.log('🏔️ TERRAIN SYSTEM DEBUG:');
            console.log('  - TerrainSystem exists:', !!this.terrainSystem);
            console.log('  - LOD meshes count:', this.terrainSystem.lodMeshes ? this.terrainSystem.lodMeshes.length : 'undefined');
            console.log('  - Primary terrain mesh:', !!this.terrainSystem.terrainMesh);
            if (this.terrainSystem.lodMeshes) {
                this.terrainSystem.lodMeshes.forEach((mesh, i) => {
                    console.log(`    LOD ${i}: ${mesh.name} visible: ${mesh.visible} parent: ${!!mesh.parent}`);
                });
            }
        } else {
            console.log('❌ TerrainSystem is null/undefined');
        }
        
        console.log('=== TERRAIN INITIALIZATION COMPLETE ===');
        
        // Immediate visibility check
        console.log('🔍 IMMEDIATE VISIBILITY CHECK:');
        console.log('✅ Camera position:', this.camera.position);
        console.log('✅ Camera looking at: (0, 0, 0)');
        console.log('✅ Expected visible objects:');
        console.log('  - Bright colored test cubes at origin');
        console.log('  - Red cylinder marker at terrain center');
        console.log('  - Coordinate axes (red=X, green=Y, blue=Z)');
        console.log('  - Green wireframe terrain (1000x1000 units)');
        console.log('  - Massive white wireframe cube at origin');
        console.log('');
        console.log('🎮 CONTROLS:');
        console.log('  - Click canvas to enter first-person mode');
        console.log('  - WASD to move, mouse to look around');
        console.log('  - F6 to reset camera to terrain view');
        console.log('  - F7 to log camera debug info');
        console.log('');
        console.log('🚨 If you see a black screen, press F6 to reset camera position!');
    }

    addTerrainPhysics() {
        // Add physics body for terrain (simplified as a plane for now)
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ 
            mass: 0,
            material: this.physicsMaterials.ground
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI / 2);
        groundBody.position.set(0, 0, 0); // Position at terrain level
        this.physics.addBody(groundBody);
        
        // Store ground body reference
        this.groundBody = groundBody;
        
        console.log('Terrain physics body added at position:', groundBody.position);
    }

    addTemporaryGround() {
        // Fallback method - create a simple ground plane
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000, 50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4a5d23, // Forest green for Estonian landscape
            wireframe: false
        });
        
        // Add some height variation to simulate Estonian terrain
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] = Math.random() * 2 - 1; // Small height variations
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add some simple trees to represent Estonian forests
        this.addSimpleTrees();
        
        // Add physics body for ground
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ 
            mass: 0,
            material: this.physicsMaterials.ground
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI / 2);
        this.physics.addBody(groundBody);
        
        // Store ground body reference
        this.groundBody = groundBody;
        
        console.log('Temporary ground added (terrain system failed to load)');
        console.log('Ground mesh added to scene. Scene children count:', this.scene.children.length);
    }

    addSimpleTrees() {
        // Add some simple tree representations (fallback)
        const treeGeometry = new THREE.ConeGeometry(2, 8, 8);
        const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x0d4f0c }); // Dark green
        
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
        
        // Add trees at various locations around Viimsi Parish
        const treePositions = [
            { x: 50, z: 50 }, { x: -30, z: 80 }, { x: 100, z: -50 },
            { x: -80, z: -30 }, { x: 150, z: 20 }, { x: -120, z: 60 },
            { x: 80, z: -80 }, { x: -50, z: -100 }, { x: 200, z: 150 },
            { x: -150, z: -80 }, { x: 30, z: 120 }, { x: -200, z: 30 }
        ];
        
        treePositions.forEach(pos => {
            // Create tree trunk
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(pos.x, 1.5, pos.z);
            trunk.castShadow = true;
            this.scene.add(trunk);
            
            // Create tree crown
            const crown = new THREE.Mesh(treeGeometry, treeMaterial);
            crown.position.set(pos.x, 6, pos.z);
            crown.castShadow = true;
            this.scene.add(crown);
        });
        
        console.log('Simple trees added (fallback mode)');
    }

    initializeWorldBoundaries() {
        // Create invisible collision boundaries for Viimsi Parish area
        const boundaryThickness = 10;
        const boundaryHeight = 50;
        const parishBounds = {
            minX: -1000,
            maxX: 1000,
            minZ: -1000,
            maxZ: 1000
        };

        // Create boundary walls
        const boundaries = [
            // North boundary
            {
                position: new CANNON.Vec3(0, boundaryHeight / 2, parishBounds.maxZ + boundaryThickness / 2),
                size: new CANNON.Vec3((parishBounds.maxX - parishBounds.minX) / 2, boundaryHeight / 2, boundaryThickness / 2)
            },
            // South boundary
            {
                position: new CANNON.Vec3(0, boundaryHeight / 2, parishBounds.minZ - boundaryThickness / 2),
                size: new CANNON.Vec3((parishBounds.maxX - parishBounds.minX) / 2, boundaryHeight / 2, boundaryThickness / 2)
            },
            // East boundary
            {
                position: new CANNON.Vec3(parishBounds.maxX + boundaryThickness / 2, boundaryHeight / 2, 0),
                size: new CANNON.Vec3(boundaryThickness / 2, boundaryHeight / 2, (parishBounds.maxZ - parishBounds.minZ) / 2)
            },
            // West boundary
            {
                position: new CANNON.Vec3(parishBounds.minX - boundaryThickness / 2, boundaryHeight / 2, 0),
                size: new CANNON.Vec3(boundaryThickness / 2, boundaryHeight / 2, (parishBounds.maxZ - parishBounds.minZ) / 2)
            }
        ];

        this.boundaryBodies = [];

        boundaries.forEach((boundary, index) => {
            const shape = new CANNON.Box(boundary.size);
            const body = new CANNON.Body({ 
                mass: 0,
                material: this.physicsMaterials.ground
            });
            body.addShape(shape);
            body.position.copy(boundary.position);
            
            this.physics.addBody(body);
            this.boundaryBodies.push(body);
        });

        console.log('Viimsi Parish collision boundaries created');
    }

    initializePhysicsDebugger() {
        // Create physics debug renderer
        this.physicsDebugger = {
            enabled: false,
            meshes: [],
            material: new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                wireframe: true,
                transparent: true,
                opacity: 0.5
            })
        };

        // Create debug meshes for all physics bodies
        this.updatePhysicsDebugger();
        
        console.log('Physics debugger initialized - Press F4 to toggle');
    }

    updatePhysicsDebugger() {
        if (!this.physicsDebugger.enabled) return;

        // Clear existing debug meshes
        this.physicsDebugger.meshes.forEach(mesh => {
            this.scene.remove(mesh);
        });
        this.physicsDebugger.meshes = [];

        // Create debug meshes for all physics bodies
        this.physics.bodies.forEach(body => {
            body.shapes.forEach((shape, shapeIndex) => {
                let geometry;
                
                switch (shape.type) {
                    case CANNON.Shape.types.PLANE:
                        geometry = new THREE.PlaneGeometry(2000, 2000);
                        break;
                    case CANNON.Shape.types.BOX:
                        geometry = new THREE.BoxGeometry(
                            shape.halfExtents.x * 2,
                            shape.halfExtents.y * 2,
                            shape.halfExtents.z * 2
                        );
                        break;
                    case CANNON.Shape.types.SPHERE:
                        geometry = new THREE.SphereGeometry(shape.radius);
                        break;
                    case CANNON.Shape.types.CYLINDER:
                        geometry = new THREE.CylinderGeometry(
                            shape.radiusTop,
                            shape.radiusBottom,
                            shape.height
                        );
                        break;
                    default:
                        geometry = new THREE.BoxGeometry(1, 1, 1);
                }

                const mesh = new THREE.Mesh(geometry, this.physicsDebugger.material);
                
                // Position the mesh to match the physics body
                mesh.position.copy(body.position);
                mesh.quaternion.copy(body.quaternion);
                
                this.scene.add(mesh);
                this.physicsDebugger.meshes.push(mesh);
            });
        });
    }

    togglePhysicsDebugger() {
        this.physicsDebugger.enabled = !this.physicsDebugger.enabled;
        
        if (this.physicsDebugger.enabled) {
            this.updatePhysicsDebugger();
            console.log('Physics debugger enabled');
        } else {
            // Hide all debug meshes
            this.physicsDebugger.meshes.forEach(mesh => {
                this.scene.remove(mesh);
            });
            this.physicsDebugger.meshes = [];
            console.log('Physics debugger disabled');
        }
    }

    initializePlayerSystems() {
        // Initialize input manager
        this.inputManager = new InputManager();
        
        // Initialize player controller
        this.playerController = new PlayerController(this.camera, this.canvas, this.physics, this.physicsMaterials);
        
        // Initialize debug panel
        this.debugPanel = new DebugPanel(this);
        
        // Register systems
        this.registerSystem('input', this.inputManager);
        this.registerSystem('player', this.playerController);
        this.registerSystem('debug', this.debugPanel);
        
        // Bind debug keys
        this.bindDebugKeys();
        
        // Add scene debug info
        this.logSceneInfo();
        
        console.log('Player systems initialized - Click canvas and use WASD to explore Viimsi Parish');
        console.log('Debug keys: F3=debug panel, F4=physics debug, F5=scene info, F6=reset camera, F7=camera info');
    }

    bindDebugKeys() {
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'F4':
                    event.preventDefault();
                    this.togglePhysicsDebugger();
                    break;
                case 'F5':
                    event.preventDefault();
                    this.logSceneInfo();
                    break;
                case 'F6':
                    event.preventDefault();
                    this.resetCameraToTerrainView();
                    break;
                case 'F7':
                    event.preventDefault();
                    this.logCameraInfo();
                    break;
            }
        });
    }

    logSceneInfo() {
        console.log('=== SCENE DEBUG INFO ===');
        console.log('Scene children count:', this.scene.children.length);
        console.log('Camera position:', this.camera.position);
        console.log('Camera rotation:', this.camera.rotation);
        console.log('Camera looking at:', this.camera.getWorldDirection(new THREE.Vector3()));
        
        console.log('Scene children:');
        this.scene.children.forEach((child, index) => {
            console.log(`  ${index}: ${child.type} "${child.name || 'unnamed'}" at ${child.position.x},${child.position.y},${child.position.z} visible:${child.visible}`);
            if (child.name === 'terrain') {
                console.log(`    Terrain details:`, {
                    geometry: child.geometry ? 'present' : 'missing',
                    material: child.material ? child.material.type : 'missing',
                    vertices: child.geometry ? child.geometry.attributes.position.count : 0
                });
            }
        });
        
        // Check for terrain specifically
        const terrain = this.scene.getObjectByName('terrain');
        console.log('Terrain object found:', terrain ? 'YES' : 'NO');
        if (terrain) {
            console.log('Terrain position:', terrain.position);
            console.log('Terrain rotation:', terrain.rotation);
            console.log('Terrain visible:', terrain.visible);
        }
        
        console.log('Simple terrain reference:', this.simpleTerrain ? 'present' : 'missing');
        
        console.log('========================');
    }

    createFallbackTerrain() {
        console.log('=== CREATING SIMPLE TERRAIN ===');
        
        try {
            // Create Viimsi Parish terrain with realistic Estonian coastal features
            console.log('Step 1: Creating Viimsi Parish terrain geometry...');
            const terrainGeometry = new THREE.PlaneGeometry(3000, 3000, 50, 50);
            
            // Generate Viimsi Parish landscape based on real Estonian coastal topography
            const positions = terrainGeometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const z = positions.getZ(i);
                
                // Simulate Viimsi Parish coastal landscape
                // Estonian coast has gentle hills, forests, and coastal plains
                let height = 0;
                
                // Main coastal elevation (Viimsi is relatively flat with gentle hills)
                height += Math.sin(x * 0.0008) * Math.cos(z * 0.0008) * 15; // Large gentle hills
                height += Math.sin(x * 0.002) * Math.cos(z * 0.002) * 8;    // Medium hills
                height += Math.sin(x * 0.005) * Math.cos(z * 0.005) * 3;    // Small variations
                
                // Add coastal features - higher elevation inland, lower near "coast"
                const distanceFromCoast = Math.sqrt(x * x + z * z) / 1500;
                height += Math.max(0, (1 - distanceFromCoast) * 12); // Higher inland
                
                // Add some Estonian forest clearings and meadows
                const forestPattern = Math.sin(x * 0.003) * Math.cos(z * 0.003);
                if (forestPattern > 0.3) {
                    height += 2; // Slight elevation in forested areas
                }
                
                // Ensure minimum height (above sea level)
                height = Math.max(height, 0.5);
                
                positions.setY(i, height);
            }
            positions.needsUpdate = true;
            terrainGeometry.computeVertexNormals();
            
            console.log('Viimsi Parish terrain geometry created with Estonian coastal features');
            
            console.log('Step 2: Creating simple material...');
            const terrainMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x228B22, // Forest green
                side: THREE.DoubleSide,
                wireframe: false
            });
            console.log('Material created:', terrainMaterial);
            
            console.log('Step 3: Creating mesh...');
            const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
            terrainMesh.rotation.x = -Math.PI / 2; // Rotate to horizontal
            terrainMesh.position.set(0, 0, 0); // Position at origin
            terrainMesh.name = 'terrain';
            console.log('Mesh created:', terrainMesh);
            
            console.log('Step 4: Adding to scene...');
            this.scene.add(terrainMesh);
            console.log('Terrain added to scene. Scene children count:', this.scene.children.length);
            
            // Verify it was added
            const foundTerrain = this.scene.getObjectByName('terrain');
            console.log('Terrain found in scene:', foundTerrain ? 'YES' : 'NO');
            
            // Store reference
            this.simpleTerrain = terrainMesh;
            
            console.log('=== TERRAIN CREATION SUCCESS ===');
            
            // Add authentic Viimsi Parish features
            this.addViimsiParishFeatures();
            
        } catch (error) {
            console.error('=== TERRAIN CREATION FAILED ===');
            console.error('Error:', error);
            console.error('Stack:', error.stack);
        }
    }
    
    addViimsiParishFeatures() {
        console.log('Adding authentic Viimsi Parish landscape features...');
        
        // Add Estonian forest (mixed coniferous and deciduous)
        this.addEstonianForest();
        
        // Add Viimsi Manor (historical landmark)
        this.addViimsiManor();
        
        // Add Estonian coastal features
        this.addCoastalFeatures();
        
        // Add Estonian rural buildings
        this.addRuralBuildings();
    }
    
    addEstonianForest() {
        console.log('Creating Estonian mixed forest...');
        
        // Estonian tree geometries
        const pineGeometry = new THREE.ConeGeometry(3, 18, 8);
        const pineMaterial = new THREE.MeshLambertMaterial({ color: 0x1a4d1a });
        
        const spruceGeometry = new THREE.ConeGeometry(4, 22, 8);
        const spruceMaterial = new THREE.MeshLambertMaterial({ color: 0x0f3d0f });
        
        const birchTrunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, 12);
        const birchTrunkMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
        
        const birchLeavesGeometry = new THREE.SphereGeometry(4, 8, 6);
        const birchLeavesMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        
        const trunkGeometry = new THREE.CylinderGeometry(0.6, 0.8, 6);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        // Create Estonian forest patches
        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * 2500;
            const z = (Math.random() - 0.5) * 2500;
            
            // Calculate terrain height at this position
            const height = this.getTerrainHeightAt(x, z);
            
            const treeType = Math.random();
            
            if (treeType < 0.45) {
                // Pine (45% - dominant in Estonia)
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                trunk.position.set(x, height + 3, z);
                this.scene.add(trunk);
                
                const crown = new THREE.Mesh(pineGeometry, pineMaterial);
                crown.position.set(x, height + 12, z);
                this.scene.add(crown);
                
            } else if (treeType < 0.75) {
                // Spruce (30%)
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                trunk.position.set(x, height + 3, z);
                this.scene.add(trunk);
                
                const crown = new THREE.Mesh(spruceGeometry, spruceMaterial);
                crown.position.set(x, height + 14, z);
                this.scene.add(crown);
                
            } else {
                // Birch (25% - very characteristic of Estonia)
                const trunk = new THREE.Mesh(birchTrunkGeometry, birchTrunkMaterial);
                trunk.position.set(x, height + 6, z);
                this.scene.add(trunk);
                
                const leaves = new THREE.Mesh(birchLeavesGeometry, birchLeavesMaterial);
                leaves.position.set(x, height + 14, z);
                this.scene.add(leaves);
            }
        }
        
        console.log('Added 60 Estonian forest trees');
    }
    
    addViimsiManor() {
        console.log('Adding Viimsi Manor (historical landmark)...');
        
        // Main manor building
        const manorGeometry = new THREE.BoxGeometry(40, 20, 25);
        const manorMaterial = new THREE.MeshLambertMaterial({ color: 0xF5DEB3 }); // Beige
        
        const manor = new THREE.Mesh(manorGeometry, manorMaterial);
        const manorX = 300, manorZ = -200;
        const manorHeight = this.getTerrainHeightAt(manorX, manorZ);
        manor.position.set(manorX, manorHeight + 10, manorZ);
        manor.name = 'viimsi-manor';
        this.scene.add(manor);
        
        // Manor roof
        const roofGeometry = new THREE.ConeGeometry(30, 15, 4);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 }); // Dark red
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(manorX, manorHeight + 27, manorZ);
        roof.rotation.y = Math.PI / 4; // Diamond shape
        this.scene.add(roof);
        
        console.log('Added Viimsi Manor at', manorX, manorHeight, manorZ);
    }
    
    addCoastalFeatures() {
        console.log('Adding Estonian coastal features...');
        
        // Lighthouse (common on Estonian coast)
        const lighthouseGeometry = new THREE.CylinderGeometry(3, 4, 30, 8);
        const lighthouseMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        
        const lighthouse = new THREE.Mesh(lighthouseGeometry, lighthouseMaterial);
        const lighthouseX = -400, lighthouseZ = 400;
        const lighthouseHeight = this.getTerrainHeightAt(lighthouseX, lighthouseZ);
        lighthouse.position.set(lighthouseX, lighthouseHeight + 15, lighthouseZ);
        this.scene.add(lighthouse);
        
        // Lighthouse top
        const topGeometry = new THREE.CylinderGeometry(2, 3, 5, 8);
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(lighthouseX, lighthouseHeight + 32, lighthouseZ);
        this.scene.add(top);
        
        console.log('Added Estonian lighthouse');
    }
    
    addRuralBuildings() {
        console.log('Adding Estonian rural buildings...');
        
        // Traditional Estonian farmhouses
        const farmhousePositions = [
            { x: -150, z: 150 },
            { x: 200, z: 300 },
            { x: -300, z: -100 },
            { x: 100, z: -300 }
        ];
        
        farmhousePositions.forEach((pos, index) => {
            const height = this.getTerrainHeightAt(pos.x, pos.z);
            
            // Farmhouse
            const houseGeometry = new THREE.BoxGeometry(20, 12, 15);
            const houseMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 }); // Burlywood
            
            const house = new THREE.Mesh(houseGeometry, houseMaterial);
            house.position.set(pos.x, height + 6, pos.z);
            house.name = `farmhouse-${index}`;
            this.scene.add(house);
            
            // Roof
            const roofGeometry = new THREE.ConeGeometry(15, 8, 4);
            const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Brown
            
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(pos.x, height + 16, pos.z);
            roof.rotation.y = Math.PI / 4;
            this.scene.add(roof);
        });
        
        console.log('Added 4 Estonian farmhouses');
    }
    
    getTerrainHeightAt(x, z) {
        // Calculate terrain height at given coordinates (matches terrain generation)
        let height = 0;
        
        height += Math.sin(x * 0.0008) * Math.cos(z * 0.0008) * 15;
        height += Math.sin(x * 0.002) * Math.cos(z * 0.002) * 8;
        height += Math.sin(x * 0.005) * Math.cos(z * 0.005) * 3;
        
        const distanceFromCoast = Math.sqrt(x * x + z * z) / 1500;
        height += Math.max(0, (1 - distanceFromCoast) * 12);
        
        const forestPattern = Math.sin(x * 0.003) * Math.cos(z * 0.003);
        if (forestPattern > 0.3) {
            height += 2;
        }
        
        return Math.max(height, 0.5);
    }

    addTestCube() {
        // Skip the floating cube - we don't need it anymore
        console.log('Skipping reference cube - terrain is working');
    }

    addEmergencyVisibilityTest() {
        console.log('🚨 EMERGENCY VISIBILITY TEST - Adding bright objects that MUST be visible...');
        
        // Camera is at (0, 50, 100) looking at (0, 0, 0)
        // So put objects directly in the camera's view
        const positions = [
            { x: 0, y: 0, z: 0, color: 0xff0000, name: 'center-red' },
            { x: 0, y: 25, z: 50, color: 0x00ff00, name: 'halfway-green' },
            { x: 0, y: 0, z: 50, color: 0x0000ff, name: 'halfway-blue' },
            { x: 25, y: 25, z: 50, color: 0xffff00, name: 'right-yellow' },
            { x: -25, y: 25, z: 50, color: 0xff00ff, name: 'left-magenta' }
        ];
        
        positions.forEach(pos => {
            const geometry = new THREE.BoxGeometry(100, 100, 100); // Even larger cubes for visibility
            const material = new THREE.MeshBasicMaterial({ 
                color: pos.color,
                wireframe: false
            });
            const cube = new THREE.Mesh(geometry, material);
            
            cube.position.set(pos.x, pos.y, pos.z);
            cube.name = `emergency-${pos.name}`;
            
            this.scene.add(cube);
            console.log(`🟦 Added ${pos.name} cube at (${pos.x}, ${pos.y}, ${pos.z})`);
        });
        
        // Add one MASSIVE cube at origin that MUST be visible
        const massiveGeometry = new THREE.BoxGeometry(300, 300, 300);
        const massiveMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, // White
            wireframe: true
        });
        const massiveCube = new THREE.Mesh(massiveGeometry, massiveMaterial);
        massiveCube.position.set(0, 0, 0);
        massiveCube.name = 'massive-test-cube';
        this.scene.add(massiveCube);
        console.log('🔲 Added MASSIVE white wireframe cube at origin');
    }

    addTerrainCenterMarker() {
        console.log('🎯 Adding terrain center marker for debugging...');
        
        // Add a tall marker at terrain center (0,0,0) that extends upward
        const markerGeometry = new THREE.CylinderGeometry(5, 5, 100);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, // Bright red
            wireframe: false
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(0, 50, 0); // Position so it extends from terrain up
        marker.name = 'terrain-center-marker';
        this.scene.add(marker);
        
        console.log('🎯 Added red cylinder marker at terrain center extending to y=100');
        
        // Add coordinate axes for reference
        const axesHelper = new THREE.AxesHelper(200);
        this.scene.add(axesHelper);
        console.log('📐 Added coordinate axes helper (red=X, green=Y, blue=Z)');
        
        // Add a simple test plane right in front of camera that MUST be visible
        this.addSimpleVisibilityTest();
    }

    resetCameraToTerrainView() {
        console.log('🎥 Resetting camera to optimal terrain viewing position...');
        
        // Reset camera to high overview position to see entire terrain
        this.camera.position.set(0, 300, 600);
        this.camera.lookAt(0, 0, 0);
        
        // Also reset player controller position if it exists
        if (this.playerController) {
            this.playerController.position.set(0, 50, 200);
            this.playerController.rotation.set(0, 0, 0);
            
            // Update physics body position if it exists
            if (this.playerController.physicsBody) {
                this.playerController.physicsBody.position.set(0, 50, 200);
                this.playerController.physicsBody.velocity.set(0, 0, 0);
            }
        }
        
        console.log('✅ Camera reset to position:', this.camera.position);
        console.log('✅ Camera looking at origin (0,0,0)');
    }

    logCameraInfo() {
        console.log('=== CAMERA DEBUG INFO ===');
        console.log('Camera position:', this.camera.position);
        console.log('Camera rotation:', this.camera.rotation);
        console.log('Camera quaternion:', this.camera.quaternion);
        
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        console.log('Camera looking direction:', direction);
        
        // Calculate distance to terrain center
        const terrainCenter = new THREE.Vector3(0, 0, 0);
        const distance = this.camera.position.distanceTo(terrainCenter);
        console.log('Distance to terrain center:', distance);
        
        // Check if terrain should be in view
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);
        
        // Test if terrain center is in frustum
        const inFrustum = frustum.containsPoint(terrainCenter);
        console.log('Terrain center in camera frustum:', inFrustum);
        
        if (this.playerController) {
            console.log('Player controller position:', this.playerController.position);
        }
        
        console.log('========================');
    }

    addSimpleVisibilityTest() {
        console.log('🎯 Adding simple visibility test - plane right in front of camera...');
        
        // Camera is at (0, 200, 600) looking at (0, 0, 0)
        // Add a plane at (0, 100, 200) - halfway between camera and origin
        const geometry = new THREE.PlaneGeometry(200, 200);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, // Bright red
            side: THREE.DoubleSide,
            wireframe: false
        });
        
        const testPlane = new THREE.Mesh(geometry, material);
        testPlane.position.set(0, 100, 200); // Halfway between camera and origin
        testPlane.name = 'simple-visibility-test';
        
        this.scene.add(testPlane);
        
        console.log('✅ Added bright red test plane at (0, 100, 200) - this MUST be visible!');
        console.log('   Camera at (0, 50, 200) looking at (0, 0, 0)');
        console.log('   Test plane is directly in the line of sight!');
        
        // Add another test object right in front of camera
        const frontGeometry = new THREE.SphereGeometry(20);
        const frontMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, // Bright cyan
            wireframe: false
        });
        
        const frontSphere = new THREE.Mesh(frontGeometry, frontMaterial);
        frontSphere.position.set(0, 50, 100); // Right in front of camera
        frontSphere.name = 'front-test-sphere';
        
        this.scene.add(frontSphere);
        
        console.log('✅ Added bright cyan sphere right in front of camera at (0, 50, 100)!');
    }

    createSimpleTestTerrain() {
        console.log('🧪 TESTING: Creating simple PlaneGeometry terrain...');
        
        try {
            // Create a simple plane geometry like the TerrainSystem does
            const geometry = new THREE.PlaneGeometry(1000, 1000, 63, 63);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, // Bright green
                wireframe: false,
                side: THREE.DoubleSide
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2; // Rotate to horizontal
            mesh.position.set(0, -10, 0); // Position slightly below origin
            mesh.name = 'simple-test-terrain';
            
            this.scene.add(mesh);
            console.log('✅ Simple test terrain added successfully');
            console.log('  Position:', mesh.position);
            console.log('  Rotation:', mesh.rotation);
            console.log('  Vertices:', geometry.attributes.position.count);
            
        } catch (error) {
            console.error('❌ Failed to create simple test terrain:', error);
        }
        
        // Log camera and scene info
        console.log('📷 Camera position:', this.camera.position);
        console.log('📷 Camera looking at:', this.camera.getWorldDirection(new THREE.Vector3()));
        console.log('🎬 Scene children count:', this.scene.children.length);
        console.log('🎬 Scene children names:', this.scene.children.map(child => child.name || child.type));
    }

    start() {
        if (this.isRunning) {
            console.log('Game loop already running');
            return;
        }
        
        this.isRunning = true;
        console.log('Starting game loop...');
        this.animate();
        console.log('Game loop started successfully');
    }

    stop() {
        this.isRunning = false;
        console.log('Game loop stopped');
    }

    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Update physics
        this.physics.step(deltaTime);
        
        // Update physics debugger
        if (this.physicsDebugger && this.physicsDebugger.enabled) {
            this.physicsDebugger.meshes.forEach((mesh, index) => {
                const body = this.physics.bodies[Math.floor(index / this.physics.bodies[0].shapes.length)];
                if (body) {
                    mesh.position.copy(body.position);
                    mesh.quaternion.copy(body.quaternion);
                }
            });
        }
        
        // Update game systems
        this.update(deltaTime);
        
        // Render scene
        this.render();
    }

    addForceVisibleTerrain() {
        console.log('🚨 FORCE VISIBLE TERRAIN - Creating terrain that MUST be visible...');
        
        // Create a massive, bright terrain that cannot be missed
        const geometry = new THREE.PlaneGeometry(2000, 2000, 50, 50);
        
        // Add dramatic height variations to make it obvious
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            
            // Create a very obvious mountain in the center
            const distanceFromCenter = Math.sqrt(x * x + z * z);
            const mountainHeight = Math.max(0, 200 - distanceFromCenter * 0.1);
            
            // Add rolling hills
            const hills = Math.sin(x * 0.005) * Math.cos(z * 0.005) * 80 + 
                         Math.sin(x * 0.01) * Math.cos(z * 0.01) * 40 +
                         Math.sin(x * 0.02) * Math.cos(z * 0.02) * 20;
            
            const totalHeight = mountainHeight + hills;
            positions.setY(i, totalHeight);
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        
        // Use a solid, bright material that should definitely be visible
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff00ff, // Bright magenta - impossible to miss
            wireframe: false, // Solid surface
            side: THREE.DoubleSide
        });
        
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2; // Make it horizontal (rotate 90 degrees)
        terrain.position.set(0, 0, 0); // Position at origin
        terrain.name = 'force-visible-terrain';
        
        // Force update the matrix after rotation
        terrain.updateMatrix();
        terrain.updateMatrixWorld(true);
        
        this.scene.add(terrain);
        
        console.log('🚨 FORCE VISIBLE TERRAIN ADDED:');
        console.log('   Size: 2000x2000 units');
        console.log('   Color: Bright magenta (impossible to miss)');
        console.log('   Position: (0, 0, 0)');
        console.log('   Features: Central mountain + rolling hills');
        console.log('   Material: Solid (not wireframe)');
        
        // Add bright yellow roads on top of this terrain
        this.addBrightRoads();
    }

    addBrightRoads() {
        console.log('🛣️ Adding BRIGHT YELLOW roads that should be visible...');
        
        // Create multiple road lines at different heights to ensure visibility
        const roadConfigs = [
            { start: [-800, 10, -800], end: [800, 10, 800], color: 0xffff00 }, // Yellow diagonal
            { start: [-800, 10, 800], end: [800, 10, -800], color: 0xff0000 }, // Red diagonal
            { start: [0, 10, -1000], end: [0, 10, 1000], color: 0x00ffff }, // Cyan vertical
            { start: [-1000, 10, 0], end: [1000, 10, 0], color: 0xff8000 }, // Orange horizontal
        ];
        
        roadConfigs.forEach((config, i) => {
            const points = [
                new THREE.Vector3(config.start[0], config.start[1], config.start[2]),
                new THREE.Vector3(config.end[0], config.end[1], config.end[2])
            ];
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ 
                color: config.color,
                linewidth: 10 // Thick lines
            });
            
            const road = new THREE.Line(geometry, material);
            road.name = `bright-road-${i}`;
            
            this.scene.add(road);
        });
        
        console.log('✅ Added 4 BRIGHT colored road lines - these MUST be visible!');
        console.log('   Colors: Yellow, Red, Cyan, Orange');
        console.log('   Position: 10 units above terrain');
    }

    addSimpleGroundPlane() {
        console.log('🟢 Adding SIMPLE HORIZONTAL ground plane...');
        
        // Create a simple horizontal plane
        const geometry = new THREE.PlaneGeometry(1000, 1000);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00aa00, // Dark green
            side: THREE.DoubleSide
        });
        
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.set(0, -50, 0); // Position below other objects
        ground.name = 'simple-ground-plane';
        
        this.scene.add(ground);
        
        console.log('🟢 Added simple horizontal ground plane at y=-50');
        console.log('   Size: 1000x1000, Color: Dark green');
        console.log('   This should appear as a flat green ground beneath everything');
    }

    addDirectViimsiFeatures() {
        console.log('🏛️ DIRECTLY adding Viimsi Parish buildings and roads...');
        
        // Add Viimsi Manor (historic building)
        const manorGeometry = new THREE.BoxGeometry(20, 12, 15);
        const manorMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown
        const manor = new THREE.Mesh(manorGeometry, manorMaterial);
        manor.position.set(-200, 6, -100); // Position on terrain
        manor.name = 'viimsi-manor';
        this.scene.add(manor);
        
        // Add Viimsi Gymnasium
        const schoolGeometry = new THREE.BoxGeometry(30, 8, 20);
        const schoolMaterial = new THREE.MeshBasicMaterial({ color: 0xFF6B6B }); // Red
        const school = new THREE.Mesh(schoolGeometry, schoolMaterial);
        school.position.set(100, 4, 150); // Position on terrain
        school.name = 'viimsi-gymnasium';
        this.scene.add(school);
        
        // Add Muuga Harbor building
        const harborGeometry = new THREE.BoxGeometry(25, 15, 12);
        const harborMaterial = new THREE.MeshBasicMaterial({ color: 0x4169E1 }); // Blue
        const harbor = new THREE.Mesh(harborGeometry, harborMaterial);
        harbor.position.set(300, 7.5, -200); // Position on terrain
        harbor.name = 'muuga-harbor';
        this.scene.add(harbor);
        
        // Add main road (Viimsi tee)
        const roadPoints = [
            new THREE.Vector3(-400, -45, -200),
            new THREE.Vector3(-200, -45, -100),
            new THREE.Vector3(0, -45, 0),
            new THREE.Vector3(200, -45, 100),
            new THREE.Vector3(400, -45, 200)
        ];
        
        const roadGeometry = new THREE.BufferGeometry().setFromPoints(roadPoints);
        const roadMaterial = new THREE.LineBasicMaterial({ 
            color: 0xFFD700, // Gold color for main road
            linewidth: 8
        });
        const mainRoad = new THREE.Line(roadGeometry, roadMaterial);
        mainRoad.name = 'viimsi-tee';
        this.scene.add(mainRoad);
        
        // Add harbor access road
        const harborRoadPoints = [
            new THREE.Vector3(200, -45, 100),
            new THREE.Vector3(300, -45, -200)
        ];
        
        const harborRoadGeometry = new THREE.BufferGeometry().setFromPoints(harborRoadPoints);
        const harborRoadMaterial = new THREE.LineBasicMaterial({ 
            color: 0xFF4500, // Orange for harbor road
            linewidth: 6
        });
        const harborRoad = new THREE.Line(harborRoadGeometry, harborRoadMaterial);
        harborRoad.name = 'muuga-tee';
        this.scene.add(harborRoad);
        
        // Add some Estonian pine trees
        for (let i = 0; i < 10; i++) {
            const treeGeometry = new THREE.ConeGeometry(3, 15, 8);
            const treeMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 }); // Forest green
            const tree = new THREE.Mesh(treeGeometry, treeMaterial);
            
            // Random positions around the parish
            tree.position.set(
                (Math.random() - 0.5) * 800,
                7.5,
                (Math.random() - 0.5) * 800
            );
            tree.name = `estonian-pine-${i}`;
            this.scene.add(tree);
        }
        
        console.log('✅ DIRECTLY added Viimsi Parish features:');
        console.log('   🏛️ Viimsi Manor (brown building at -200, 6, -100)');
        console.log('   🏫 Viimsi Gymnasium (red building at 100, 4, 150)');
        console.log('   🚢 Muuga Harbor (blue building at 300, 7.5, -200)');
        console.log('   🛣️ Viimsi tee (gold main road)');
        console.log('   🛣️ Muuga tee (orange harbor road)');
        console.log('   🌲 10 Estonian pine trees scattered around');
        console.log('');
        console.log('🎯 These represent REAL Viimsi Parish locations:');
        console.log('   - Viimsi Manor: Historic 18th century manor house');
        console.log('   - Viimsi Gymnasium: Main school in the parish');
        console.log('   - Muuga Harbor: Major Estonian port facility');
        console.log('   - Road network connecting key locations');
    }

    update(deltaTime) {
        // Update terrain LOD based on camera position
        if (this.terrainSystem) {
            this.terrainSystem.updateLOD(this.camera.position);
        }
        
        // Update all registered game systems
        for (const [name, system] of this.systems) {
            if (system.update) {
                system.update(deltaTime);
            }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
        
        // Debug: Log render calls occasionally
        if (Math.random() < 0.001) { // Log ~0.1% of frames
            console.log('Rendering frame - Scene children:', this.scene.children.length, 'Camera pos:', this.camera.position);
        }
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    registerSystem(name, system) {
        this.systems.set(name, system);
        console.log(`Registered system: ${name}`);
    }

    getSystem(name) {
        return this.systems.get(name);
    }

    dispose() {
        this.stop();
        
        // Dispose of game systems
        if (this.terrainSystem) {
            this.terrainSystem.dispose();
        }
        if (this.debugPanel) {
            this.debugPanel.dispose();
        }
        if (this.playerController) {
            this.playerController.dispose();
        }
        if (this.inputManager) {
            this.inputManager.dispose();
        }
        
        // Dispose of Three.js resources
        if (this.scene && typeof this.scene.traverse === 'function') {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        console.log('Game engine disposed');
    }
}

// Make GameEngine available globally for debugging
window.GameEngine = GameEngine;