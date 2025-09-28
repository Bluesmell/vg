import * as THREE from 'three';

/**
 * TerrainSystem - Generates realistic terrain from Viimsi Parish elevation data
 * Processes DEM data and creates optimized terrain meshes with LOD support
 */
export class TerrainSystem {
    constructor(gameEngine, mapDataManager) {
        this.gameEngine = gameEngine;
        this.mapDataManager = mapDataManager;
        
        // Terrain configuration
        this.config = {
            // Terrain mesh resolution
            segments: 64, // Reduced for better performance and visibility
            
            // Game world size (matches MapDataManager)
            worldSize: 1000, // Larger for better visibility
            
            // Height scaling factor
            heightScale: 100.0, // High but not too extreme for better visibility
            
            // LOD configuration
            lod: {
                levels: 2, // Reduced LOD levels for simplicity
                distances: [1000, 2000], // Much larger distances so LOD 0 is always visible
                segments: [64, 32]
            },
            
            // Texture configuration
            textures: {
                grass: null,
                forest: null,
                sand: null,
                water: null
            }
        };
        
        // Terrain state
        this.terrainMesh = null;
        this.lodMeshes = [];
        this.currentLOD = 0;
        this.heightmapData = null;
        this.textureAtlas = null;
        
        // Performance tracking
        this.stats = {
            triangles: 0,
            vertices: 0,
            lodSwitches: 0,
            lastLODSwitch: 0
        };
        
        console.log('TerrainSystem initialized for Viimsi Parish terrain generation');
    }

    /**
     * Initialize the terrain system with map data
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('🏔️ Initializing TerrainSystem with Viimsi Parish data...');
        
        try {
            // Load map data if not already loaded
            const mapData = await this.mapDataManager.loadMapData();
            
            if (!mapData.elevation) {
                console.warn('⚠️ No elevation data available - terrain will use procedural generation');
                this.heightmapData = null;
            } else {
                console.log('✅ Real Viimsi Parish elevation data loaded!');
                this.heightmapData = mapData.elevation;
            }
            
            // Store additional map data for visualization
            this.buildingData = mapData.buildings || [];
            this.roadData = mapData.roads || [];
            this.forestData = mapData.forests || [];
            
            // Initialize textures
            console.log('🎨 Initializing terrain textures...');
            await this.initializeTextures();
            console.log('✅ Terrain textures initialized');
            
            // Generate terrain meshes with LOD
            console.log('🏗️ Generating terrain meshes with LOD...');
            await this.generateTerrainLOD();
            console.log('✅ Terrain meshes generated');
            
            // Add terrain to scene
            console.log('🎬 Adding terrain to scene...');
            this.addToScene();
            console.log('✅ Terrain added to scene');
            
            // Add real Viimsi Parish features if we have the data
            if (this.buildingData.length > 0 || this.roadData.length > 0) {
                console.log('🏘️ Adding real Viimsi Parish features to terrain...');
                this.addRealViimsiFeatures();
            }
            
            console.log('🎯 TerrainSystem initialized successfully:', {
                dataSource: this.heightmapData ? 'REAL Viimsi Parish elevation data' : 'Procedural Estonian terrain',
                heightmapSize: this.heightmapData ? Math.sqrt(this.heightmapData.length) : 'N/A',
                buildings: this.buildingData.length,
                roads: this.roadData.length,
                forests: this.forestData.length,
                lodLevels: this.lodMeshes.length,
                triangles: this.stats.triangles,
                vertices: this.stats.vertices
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize TerrainSystem:', error);
            throw error;
        }
    }

    /**
     * Initialize terrain textures based on Viimsi Parish landscape types
     * @returns {Promise<void>}
     */
    async initializeTextures() {
        console.log('Initializing Viimsi Parish terrain textures...');
        
        // Create procedural textures for Viimsi Parish landscape types
        this.config.textures = {
            grass: this.createGrassTexture(),
            forest: this.createForestTexture(),
            sand: this.createSandTexture(),
            water: this.createWaterTexture()
        };
        
        // Create texture atlas for efficient rendering
        this.textureAtlas = this.createTextureAtlas();
        
        console.log('Terrain textures initialized for Estonian coastal landscape');
    }

    /**
     * Generate terrain meshes with different LOD levels
     * @returns {Promise<void>}
     */
    async generateTerrainLOD() {
        console.log('🏗️ Generating terrain LOD meshes for Viimsi Parish...');
        
        this.lodMeshes = [];
        
        for (let i = 0; i < this.config.lod.levels; i++) {
            console.log(`🔨 Generating LOD ${i} mesh...`);
            const segments = this.config.lod.segments[i];
            const mesh = this.generateTerrainMesh(segments, i);
            
            // Set visibility based on LOD level
            mesh.visible = (i === 0);
            mesh.userData.lodLevel = i;
            mesh.userData.maxDistance = this.config.lod.distances[i];
            
            this.lodMeshes.push(mesh);
            
            console.log(`✅ Generated LOD ${i} terrain mesh: ${segments}x${segments} segments, visible: ${mesh.visible}`);
        }
        
        // Set primary terrain mesh
        this.terrainMesh = this.lodMeshes[0];
        console.log(`🎯 Primary terrain mesh set: ${this.terrainMesh ? 'SUCCESS' : 'FAILED'}`);
    }

    /**
     * Generate a single terrain mesh from elevation data
     * @param {number} segments - Number of segments for the mesh
     * @param {number} lodLevel - LOD level for this mesh
     * @returns {THREE.Mesh} Generated terrain mesh
     */
    generateTerrainMesh(segments, lodLevel) {
        console.log(`🔨 Generating terrain mesh for LOD ${lodLevel} with ${segments} segments...`);
        
        try {
            // Create geometry
            console.log(`📐 Creating PlaneGeometry: ${this.config.worldSize}x${this.config.worldSize}, ${segments-1}x${segments-1} segments`);
            const geometry = new THREE.PlaneGeometry(
                this.config.worldSize,
                this.config.worldSize,
                segments - 1,
                segments - 1
            );
            console.log(`✅ Geometry created with ${geometry.attributes.position.count} vertices`);
            
            // Apply elevation data to vertices
            console.log('🏔️ Applying elevation data...');
            this.applyElevationData(geometry, segments);
            console.log('✅ Elevation data applied');
            
            // Calculate normals for proper lighting
            geometry.computeVertexNormals();
            
            // Create material with Viimsi Parish texturing
            console.log('🎨 Creating terrain material...');
            const material = this.createTerrainMaterial(lodLevel);
            console.log('✅ Material created:', material.type, material.color);
            
            // Create mesh
            console.log('🧩 Creating mesh...');
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2; // Rotate to horizontal
            mesh.position.set(0, -100, 0); // Position terrain BELOW the simple green plane
            mesh.receiveShadow = true;
            mesh.castShadow = false; // Terrain doesn't cast shadows
            mesh.name = `viimsi-terrain-lod-${lodLevel}`; // Name for debugging
            
            // Force mesh to be visible and update matrix
            mesh.visible = true;
            mesh.updateMatrix();
            mesh.updateMatrixWorld(true);
            
            console.log(`✅ Mesh created: ${mesh.name} at position (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
            console.log(`  Rotation: (${mesh.rotation.x}, ${mesh.rotation.y}, ${mesh.rotation.z})`);
            console.log(`  Scale: (${mesh.scale.x}, ${mesh.scale.y}, ${mesh.scale.z})`);
            console.log(`  Visible: ${mesh.visible}`);
            console.log(`  Material: ${material.type}, Color: ${material.color.getHexString()}, Wireframe: ${material.wireframe}`);
            
            // Update statistics
            this.stats.triangles += geometry.index ? geometry.index.count / 3 : (segments * segments * 2);
            this.stats.vertices += geometry.attributes.position.count;
            
            return mesh;
            
        } catch (error) {
            console.error(`❌ Failed to generate terrain mesh for LOD ${lodLevel}:`, error);
            throw error;
        }
    }

    /**
     * Apply elevation data to terrain geometry vertices
     * @param {THREE.PlaneGeometry} geometry - Terrain geometry
     * @param {number} segments - Number of segments
     */
    applyElevationData(geometry, segments) {
        const positions = geometry.attributes.position;
        
        // If no heightmap data, create simple procedural terrain
        if (!this.heightmapData || this.heightmapData.length === 0) {
            console.log('⚠️ No heightmap data available, generating DRAMATIC procedural terrain...');
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const z = positions.getZ(i);
                
                // Create a very obvious mountain in the center
                const distanceFromCenter = Math.sqrt(x * x + z * z);
                const mountainHeight = Math.max(0, 150 - distanceFromCenter * 0.3);
                
                // Add additional terrain features
                const height = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 50 + 
                              Math.sin(x * 0.005) * Math.cos(z * 0.005) * 30 +
                              Math.sin(x * 0.02) * Math.cos(z * 0.02) * 20 +
                              mountainHeight;
                
                positions.setY(i, Math.max(height, 0)); // Ensure above sea level
            }
            positions.needsUpdate = true;
            console.log('✅ DRAMATIC procedural terrain generated with central mountain');
            return;
        }
        
        const heightmapSize = Math.sqrt(this.heightmapData.length);
        console.log(`🗺️ Applying REAL Viimsi Parish elevation data from ${heightmapSize}x${heightmapSize} heightmap...`);
        
        // Debug: Check elevation data values
        let minHeight = Infinity;
        let maxHeight = -Infinity;
        let totalHeight = 0;
        let nonZeroCount = 0;
        
        for (let i = 0; i < Math.min(100, this.heightmapData.length); i++) {
            const val = this.heightmapData[i];
            if (val !== 0) nonZeroCount++;
            minHeight = Math.min(minHeight, val);
            maxHeight = Math.max(maxHeight, val);
            totalHeight += val;
        }
        
        console.log(`🔍 ELEVATION DATA DEBUG (first 100 values):`);
        console.log(`  Min height: ${minHeight}`);
        console.log(`  Max height: ${maxHeight}`);
        console.log(`  Average height: ${totalHeight / 100}`);
        console.log(`  Non-zero values: ${nonZeroCount}/100`);
        console.log(`  Height scale factor: ${this.config.heightScale}`);
        
        let appliedMinHeight = Infinity;
        let appliedMaxHeight = -Infinity;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            
            // Convert world coordinates to heightmap coordinates
            const u = (x + this.config.worldSize / 2) / this.config.worldSize;
            const v = (z + this.config.worldSize / 2) / this.config.worldSize;
            
            // Sample heightmap with bilinear interpolation
            const height = this.sampleHeightmap(u, v, heightmapSize);
            
            // Apply height with scaling
            const scaledHeight = height * this.config.heightScale;
            positions.setY(i, scaledHeight);
            
            appliedMinHeight = Math.min(appliedMinHeight, scaledHeight);
            appliedMaxHeight = Math.max(appliedMaxHeight, scaledHeight);
        }
        
        console.log(`🏔️ APPLIED TERRAIN HEIGHTS:`);
        console.log(`  Min applied height: ${appliedMinHeight}`);
        console.log(`  Max applied height: ${appliedMaxHeight}`);
        console.log(`  Height difference: ${appliedMaxHeight - appliedMinHeight}`);
        
        // If terrain is too flat, add some artificial height variation
        if (appliedMaxHeight - appliedMinHeight < 50) {
            console.log(`⚠️ Terrain is too flat (${appliedMaxHeight - appliedMinHeight}m difference), adding dramatic variation...`);
            
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const z = positions.getZ(i);
                
                // Create a very obvious mountain in the center
                const distanceFromCenter = Math.sqrt(x * x + z * z);
                const mountainHeight = Math.max(0, 200 - distanceFromCenter * 0.5);
                
                // Add procedural height variation
                const proceduralHeight = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 50 + 
                                        Math.sin(x * 0.005) * Math.cos(z * 0.005) * 30 +
                                        Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15;
                
                const currentHeight = positions.getY(i);
                positions.setY(i, currentHeight + proceduralHeight + mountainHeight);
            }
            
            console.log(`✅ Added dramatic height variation including central mountain to make terrain visible`);
        }
        
        positions.needsUpdate = true;
    }

    /**
     * Sample heightmap data with bilinear interpolation
     * @param {number} u - U coordinate (0-1)
     * @param {number} v - V coordinate (0-1)
     * @param {number} size - Heightmap size
     * @returns {number} Interpolated height value
     */
    sampleHeightmap(u, v, size) {
        // Clamp coordinates
        u = Math.max(0, Math.min(1, u));
        v = Math.max(0, Math.min(1, v));
        
        // Convert to heightmap coordinates
        const x = u * (size - 1);
        const y = v * (size - 1);
        
        // Get integer coordinates
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = Math.min(x0 + 1, size - 1);
        const y1 = Math.min(y0 + 1, size - 1);
        
        // Get fractional parts
        const fx = x - x0;
        const fy = y - y0;
        
        // Sample four corners
        const h00 = this.heightmapData[y0 * size + x0] || 0;
        const h10 = this.heightmapData[y0 * size + x1] || 0;
        const h01 = this.heightmapData[y1 * size + x0] || 0;
        const h11 = this.heightmapData[y1 * size + x1] || 0;
        
        // Bilinear interpolation
        const h0 = h00 * (1 - fx) + h10 * fx;
        const h1 = h01 * (1 - fx) + h11 * fx;
        
        return h0 * (1 - fy) + h1 * fy;
    }

    /**
     * Create terrain material with Viimsi Parish texturing
     * @param {number} lodLevel - LOD level for material optimization
     * @returns {THREE.Material} Terrain material
     */
    createTerrainMaterial(lodLevel) {
        // Use bright visible materials for all LOD levels
        const colors = [
            0x00ff00, // LOD 0: Bright green (most detailed)
            0x00ffff, // LOD 1: Cyan
            0xff0000, // LOD 2: Red  
            0xffff00  // LOD 3: Yellow
        ];
        
        // Use MeshBasicMaterial for better visibility (doesn't need lighting)
        return new THREE.MeshBasicMaterial({
            color: 0x8B4513, // Brown color for realistic terrain
            wireframe: false, // Use solid material for better visibility
            side: THREE.DoubleSide,
            transparent: false,
            opacity: 1.0
        });
    }

    /**
     * Create grass texture for Estonian meadows
     * @returns {THREE.Texture} Grass texture
     */
    createGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Estonian grass colors
        const grassColors = ['#4a7c59', '#5d8f6b', '#3e6b4f', '#6ba377'];
        
        // Fill with base grass color
        ctx.fillStyle = grassColors[0];
        ctx.fillRect(0, 0, 256, 256);
        
        // Add grass texture details
        for (let i = 0; i < 1000; i++) {
            ctx.fillStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
            ctx.fillRect(
                Math.random() * 256,
                Math.random() * 256,
                Math.random() * 3 + 1,
                Math.random() * 3 + 1
            );
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(16, 16);
        
        return texture;
    }

    /**
     * Create forest texture for Estonian woodlands
     * @returns {THREE.Texture} Forest texture
     */
    createForestTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Estonian forest colors (darker greens)
        const forestColors = ['#2d4a3a', '#3e5c4a', '#1f3d2e', '#4a6b5a'];
        
        ctx.fillStyle = forestColors[0];
        ctx.fillRect(0, 0, 256, 256);
        
        // Add forest floor texture
        for (let i = 0; i < 800; i++) {
            ctx.fillStyle = forestColors[Math.floor(Math.random() * forestColors.length)];
            ctx.fillRect(
                Math.random() * 256,
                Math.random() * 256,
                Math.random() * 4 + 2,
                Math.random() * 4 + 2
            );
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(12, 12);
        
        return texture;
    }

    /**
     * Create sand texture for Estonian coastal areas
     * @returns {THREE.Texture} Sand texture
     */
    createSandTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Estonian coastal sand colors
        const sandColors = ['#c4a882', '#d4b892', '#b49872', '#e4c8a2'];
        
        ctx.fillStyle = sandColors[0];
        ctx.fillRect(0, 0, 256, 256);
        
        // Add sand grain texture
        for (let i = 0; i < 2000; i++) {
            ctx.fillStyle = sandColors[Math.floor(Math.random() * sandColors.length)];
            ctx.fillRect(
                Math.random() * 256,
                Math.random() * 256,
                1,
                1
            );
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        
        return texture;
    }

    /**
     * Create water texture for Baltic Sea and coastal waters
     * @returns {THREE.Texture} Water texture
     */
    createWaterTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Baltic Sea colors
        const waterColors = ['#2c5f7c', '#3c6f8c', '#1c4f6c', '#4c7f9c'];
        
        ctx.fillStyle = waterColors[0];
        ctx.fillRect(0, 0, 256, 256);
        
        // Add water ripple texture
        for (let i = 0; i < 500; i++) {
            ctx.fillStyle = waterColors[Math.floor(Math.random() * waterColors.length)];
            ctx.fillRect(
                Math.random() * 256,
                Math.random() * 256,
                Math.random() * 2 + 1,
                Math.random() * 2 + 1
            );
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 8);
        
        return texture;
    }

    /**
     * Create texture atlas combining all terrain textures
     * @returns {THREE.Texture} Combined texture atlas
     */
    createTextureAtlas() {
        // For now, return grass texture as primary
        // In a full implementation, this would combine all textures
        return this.config.textures.grass;
    }

    /**
     * Add terrain to the game scene
     */
    addToScene() {
        console.log('Adding Viimsi Parish terrain to scene...');
        
        // Add all LOD meshes to scene
        this.lodMeshes.forEach((mesh, index) => {
            mesh.visible = (index === 0); // Only show LOD 0 initially
            this.gameEngine.scene.add(mesh);
            console.log(`✅ Added Viimsi Parish terrain LOD ${index} mesh to scene:`);
            console.log(`  Name: ${mesh.name}`);
            console.log(`  Position:`, mesh.position);
            console.log(`  Rotation:`, mesh.rotation);
            console.log(`  Scale:`, mesh.scale);
            console.log(`  Visible:`, mesh.visible);
            console.log(`  Material color:`, mesh.material.color);
            console.log(`  Geometry vertices:`, mesh.geometry.attributes.position.count);
            console.log(`  World size: ${this.config.worldSize}m`);
        });
        
        console.log(`Added ${this.lodMeshes.length} terrain LOD meshes to scene`);
        console.log('Total scene children after terrain:', this.gameEngine.scene.children.length);
        
        // Add visual indicator for data source
        this.addDataSourceIndicator();
        
        // Add a simple test plane that should definitely be visible
        this.addSimpleTestPlane();
        
        // Add debug cube at camera position for reference
        this.addCameraPositionDebugCube();
    }

    /**
     * Update terrain LOD based on camera position
     * @param {THREE.Vector3} cameraPosition - Current camera position
     */
    updateLOD(cameraPosition) {
        if (!this.terrainMesh || !cameraPosition) return;
        
        // Calculate distance from camera to terrain center
        const terrainCenter = new THREE.Vector3(0, 0, 0);
        const distance = cameraPosition.distanceTo(terrainCenter);
        
        // Determine appropriate LOD level
        let newLOD = this.config.lod.levels - 1;
        for (let i = 0; i < this.config.lod.distances.length; i++) {
            if (distance <= this.config.lod.distances[i]) {
                newLOD = i;
                break;
            }
        }
        
        // Switch LOD if needed
        if (newLOD !== this.currentLOD) {
            this.switchLOD(newLOD);
        }
    }

    /**
     * Switch to a different LOD level
     * @param {number} newLOD - New LOD level
     */
    switchLOD(newLOD) {
        if (newLOD < 0 || newLOD >= this.lodMeshes.length) return;
        
        // Hide current LOD
        if (this.lodMeshes[this.currentLOD]) {
            this.lodMeshes[this.currentLOD].visible = false;
        }
        
        // Show new LOD
        this.lodMeshes[newLOD].visible = true;
        this.currentLOD = newLOD;
        this.terrainMesh = this.lodMeshes[newLOD];
        
        // Update statistics
        this.stats.lodSwitches++;
        this.stats.lastLODSwitch = Date.now();
        
        console.log(`Switched to terrain LOD ${newLOD}`);
    }

    /**
     * Get height at specific world coordinates
     * @param {number} x - World X coordinate
     * @param {number} z - World Z coordinate
     * @returns {number} Height at the position
     */
    getHeightAt(x, z) {
        if (!this.heightmapData) return 0;
        
        // Convert world coordinates to heightmap coordinates
        const u = (x + this.config.worldSize / 2) / this.config.worldSize;
        const v = (z + this.config.worldSize / 2) / this.config.worldSize;
        
        const heightmapSize = Math.sqrt(this.heightmapData.length);
        return this.sampleHeightmap(u, v, heightmapSize) * this.config.heightScale;
    }

    /**
     * Get terrain statistics
     * @returns {Object} Terrain statistics
     */
    getStats() {
        return {
            ...this.stats,
            currentLOD: this.currentLOD,
            heightmapSize: this.heightmapData ? Math.sqrt(this.heightmapData.length) : 0,
            lodLevels: this.lodMeshes.length,
            worldSize: this.config.worldSize
        };
    }

    /**
     * Get the world boundaries for the minimap
     * @returns {Object} World boundaries
     */
    getWorldBounds() {
        const size = this.config.worldSize / 2;
        return {
            minX: -size,
            maxX: size,
            minZ: -size,
            maxZ: size,
        };
    }

    /**
     * Add real Viimsi Parish features to the terrain
     */
    addRealViimsiFeatures() {
        console.log('🏘️ Adding real Viimsi Parish buildings and roads...');
        
        // Add buildings as simple boxes
        this.buildingData.forEach((building, index) => {
            if (index < 20) { // Limit to first 20 buildings for performance
                const geometry = new THREE.BoxGeometry(
                    building.gameHeight || 6,
                    building.gameHeight || 6,
                    building.gameHeight || 6
                );
                const material = new THREE.MeshBasicMaterial({ 
                    color: 0xff6b6b, // Red color for buildings
                    wireframe: false
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(
                    building.gamePosition.x,
                    building.gamePosition.y + 10, // Elevate above terrain
                    building.gamePosition.z
                );
                mesh.name = `viimsi-building-${index}`;
                
                this.gameEngine.scene.add(mesh);
                console.log(`Added building: ${building.name || 'Unnamed'} at ${building.gamePosition.x}, ${building.gamePosition.z}`);
            }
        });
        
        // Add roads as simple lines
        this.roadData.forEach((road, index) => {
            if (index < 10 && road.gameGeometry && road.gameGeometry.length > 1) { // Limit to first 10 roads
                const points = road.gameGeometry.map(point => 
                    new THREE.Vector3(point.x, -40, point.z) // Position roads above the brown terrain
                );
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({ 
                    color: 0xffff00, // Bright yellow for visibility
                    linewidth: 5 // Thicker lines
                });
                
                const line = new THREE.Line(geometry, material);
                line.name = `viimsi-road-${index}`;
                
                this.gameEngine.scene.add(line);
                console.log(`Added road: ${road.name || 'Unnamed'} with ${points.length} points`);
            }
        });
        
        console.log(`✅ Added ${Math.min(20, this.buildingData.length)} buildings and ${Math.min(10, this.roadData.length)} roads from real Viimsi Parish data`);
    }

    /**
     * Add visual indicator showing data source
     */
    addDataSourceIndicator() {
        // Create a large cube as a visual indicator
        const geometry = new THREE.BoxGeometry(50, 50, 50);
        const material = new THREE.MeshBasicMaterial({ 
            color: this.heightmapData ? 0x00ff00 : 0xff0000, // Green for real data, red for fallback
            wireframe: true
        });
        
        const indicator = new THREE.Mesh(geometry, material);
        indicator.position.set(0, 100, 0); // High above terrain
        indicator.name = 'data-source-indicator';
        
        this.gameEngine.scene.add(indicator);
        
        console.log(`📍 Data source indicator added: ${this.heightmapData ? 'GREEN (Real Viimsi data)' : 'RED (Fallback data)'}`);
    }

    /**
     * Add debug cube at camera position for reference
     */
    addCameraPositionDebugCube() {
        console.log('📍 Adding debug cube at camera position...');
        
        const geometry = new THREE.BoxGeometry(20, 20, 20);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, // Red cube
            wireframe: true
        });
        
        const debugCube = new THREE.Mesh(geometry, material);
        debugCube.position.set(141, 1, -89); // Current camera position from debug panel
        debugCube.name = 'camera-position-debug';
        
        this.gameEngine.scene.add(debugCube);
        
        console.log('📍 Added red debug cube at camera position (141, 1, -89)');
    }

    /**
     * Add a simple test plane that should definitely be visible
     */
    addSimpleTestPlane() {
        console.log('🧪 Adding simple test terrain for visibility verification...');
        
        // Create a horizontal plane that mimics the terrain
        const geometry = new THREE.PlaneGeometry(800, 800, 20, 20);
        
        // Add height variation to make it look like terrain
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            
            // Create a simple mountain shape
            const distanceFromCenter = Math.sqrt(x * x + z * z);
            const height = Math.max(0, 100 - distanceFromCenter * 0.2);
            
            positions.setY(i, height);
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff00ff, // Bright magenta
            wireframe: true,
            side: THREE.DoubleSide
        });
        
        const testTerrain = new THREE.Mesh(geometry, material);
        testTerrain.rotation.x = -Math.PI / 2; // Rotate to horizontal like the main terrain
        testTerrain.position.set(200, 0, 0); // Position to the side so it doesn't overlap
        testTerrain.name = 'simple-test-terrain';
        
        this.gameEngine.scene.add(testTerrain);
        
        console.log('✅ Added bright magenta test terrain with mountain shape - this should be clearly visible!');
    }

    /**
     * Dispose of terrain resources
     */
    dispose() {
        console.log('Disposing TerrainSystem resources...');
        
        // Remove meshes from scene and dispose geometries/materials
        this.lodMeshes.forEach(mesh => {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
            
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(material => material.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        
        // Dispose textures
        Object.values(this.config.textures).forEach(texture => {
            if (texture && texture.dispose) {
                texture.dispose();
            }
        });
        
        // Clear references
        this.lodMeshes = [];
        this.terrainMesh = null;
        this.heightmapData = null;
        this.textureAtlas = null;
        
        console.log('TerrainSystem disposed');
    }
}