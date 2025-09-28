import { TerrainSystem } from './TerrainSystem.js';
import * as THREE from 'three';

// Mock Three.js components
jest.mock('three', () => ({
    PlaneGeometry: jest.fn().mockImplementation((width, height, widthSegments, heightSegments) => ({
        attributes: {
            position: {
                count: (widthSegments + 1) * (heightSegments + 1),
                getX: jest.fn().mockReturnValue(0),
                getZ: jest.fn().mockReturnValue(0),
                setY: jest.fn(),
                needsUpdate: false
            }
        },
        computeVertexNormals: jest.fn(),
        dispose: jest.fn()
    })),
    MeshStandardMaterial: jest.fn().mockImplementation(() => ({
        dispose: jest.fn()
    })),
    MeshLambertMaterial: jest.fn().mockImplementation(() => ({
        dispose: jest.fn()
    })),
    Mesh: jest.fn().mockImplementation((geometry, material) => ({
        geometry,
        material,
        rotation: { x: 0 },
        receiveShadow: false,
        castShadow: false,
        visible: true,
        userData: {},
        parent: null
    })),
    CanvasTexture: jest.fn().mockImplementation(() => ({
        wrapS: null,
        wrapT: null,
        repeat: { set: jest.fn() },
        dispose: jest.fn()
    })),
    TextureLoader: jest.fn().mockImplementation(() => ({
        load: jest.fn()
    })),
    Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
        x, y, z,
        distanceTo: jest.fn().mockReturnValue(100)
    })),
    RepeatWrapping: 'RepeatWrapping',
    DoubleSide: 'DoubleSide'
}));

describe('TerrainSystem', () => {
    let terrainSystem;
    let mockGameEngine;
    let mockMapDataManager;

    beforeEach(() => {
        // Mock game engine
        mockGameEngine = {
            scene: {
                add: jest.fn()
            }
        };

        // Mock map data manager
        mockMapDataManager = {
            loadMapData: jest.fn()
        };

        // Mock canvas and context for texture generation
        global.document = {
            createElement: jest.fn().mockReturnValue({
                width: 256,
                height: 256,
                getContext: jest.fn().mockReturnValue({
                    fillStyle: '',
                    fillRect: jest.fn()
                })
            })
        };

        terrainSystem = new TerrainSystem(mockGameEngine, mockMapDataManager);
    });

    afterEach(() => {
        if (terrainSystem) {
            terrainSystem.dispose();
        }
    });

    test('should initialize with correct configuration', () => {
        expect(terrainSystem.config.segments).toBe(512);
        expect(terrainSystem.config.worldSize).toBe(2000);
        expect(terrainSystem.config.lod.levels).toBe(4);
        expect(terrainSystem.config.lod.distances).toHaveLength(4);
        expect(terrainSystem.lodMeshes).toEqual([]);
        expect(terrainSystem.currentLOD).toBe(0);
    });

    test('should initialize successfully with elevation data', async () => {
        const mockElevationData = new Float32Array(512 * 512);
        for (let i = 0; i < mockElevationData.length; i++) {
            mockElevationData[i] = Math.random() * 50; // 0-50m elevation
        }

        const mockMapData = {
            elevation: mockElevationData,
            buildings: [],
            roads: [],
            forests: []
        };

        mockMapDataManager.loadMapData.mockResolvedValue(mockMapData);

        await terrainSystem.initialize();

        expect(mockMapDataManager.loadMapData).toHaveBeenCalled();
        expect(terrainSystem.heightmapData).toBe(mockElevationData);
        expect(terrainSystem.lodMeshes).toHaveLength(4);
        expect(terrainSystem.terrainMesh).toBe(terrainSystem.lodMeshes[0]);
        expect(mockGameEngine.scene.add).toHaveBeenCalledTimes(4);
    });

    test('should throw error when no elevation data available', async () => {
        const mockMapData = {
            elevation: null,
            buildings: [],
            roads: [],
            forests: []
        };

        mockMapDataManager.loadMapData.mockResolvedValue(mockMapData);

        await expect(terrainSystem.initialize()).rejects.toThrow('No elevation data available for terrain generation');
    });

    test('should handle map data loading failure', async () => {
        mockMapDataManager.loadMapData.mockRejectedValue(new Error('Network error'));

        await expect(terrainSystem.initialize()).rejects.toThrow('Network error');
    });

    test('should create grass texture with Estonian colors', () => {
        const texture = terrainSystem.createGrassTexture();
        
        expect(texture).toBeDefined();
        expect(THREE.CanvasTexture).toHaveBeenCalled();
        expect(texture.repeat.set).toHaveBeenCalledWith(16, 16);
    });

    test('should create forest texture with darker colors', () => {
        const texture = terrainSystem.createForestTexture();
        
        expect(texture).toBeDefined();
        expect(THREE.CanvasTexture).toHaveBeenCalled();
        expect(texture.repeat.set).toHaveBeenCalledWith(12, 12);
    });

    test('should create sand texture for coastal areas', () => {
        const texture = terrainSystem.createSandTexture();
        
        expect(texture).toBeDefined();
        expect(THREE.CanvasTexture).toHaveBeenCalled();
        expect(texture.repeat.set).toHaveBeenCalledWith(20, 20);
    });

    test('should create water texture for Baltic Sea', () => {
        const texture = terrainSystem.createWaterTexture();
        
        expect(texture).toBeDefined();
        expect(THREE.CanvasTexture).toHaveBeenCalled();
        expect(texture.repeat.set).toHaveBeenCalledWith(8, 8);
    });

    test('should generate terrain mesh with correct parameters', () => {
        const segments = 256;
        const lodLevel = 1;
        
        // Set up heightmap data
        terrainSystem.heightmapData = new Float32Array(16);
        
        const mesh = terrainSystem.generateTerrainMesh(segments, lodLevel);
        
        expect(THREE.PlaneGeometry).toHaveBeenCalledWith(
            terrainSystem.config.worldSize,
            terrainSystem.config.worldSize,
            segments - 1,
            segments - 1
        );
        
        expect(THREE.Mesh).toHaveBeenCalled();
        expect(mesh.rotation.x).toBe(-Math.PI / 2);
        expect(mesh.receiveShadow).toBe(true);
        expect(mesh.castShadow).toBe(false);
    });

    test('should sample heightmap with bilinear interpolation', () => {
        // Create test heightmap data
        const size = 4;
        terrainSystem.heightmapData = new Float32Array([
            0, 10, 20, 30,
            5, 15, 25, 35,
            10, 20, 30, 40,
            15, 25, 35, 45
        ]);

        // Test center sampling
        const height = terrainSystem.sampleHeightmap(0.5, 0.5, size);
        expect(height).toBeCloseTo(22.5, 1); // Interpolated value

        // Test corner sampling
        const cornerHeight = terrainSystem.sampleHeightmap(0, 0, size);
        expect(cornerHeight).toBe(0);

        // Test edge clamping
        const clampedHeight = terrainSystem.sampleHeightmap(-0.1, 1.1, size);
        expect(clampedHeight).toBe(15); // Should clamp to valid range
    });

    test('should apply elevation data to geometry vertices', () => {
        const mockGeometry = {
            attributes: {
                position: {
                    count: 4,
                    getX: jest.fn().mockReturnValueOnce(-1000).mockReturnValueOnce(1000).mockReturnValueOnce(-1000).mockReturnValueOnce(1000),
                    getZ: jest.fn().mockReturnValueOnce(-1000).mockReturnValueOnce(-1000).mockReturnValueOnce(1000).mockReturnValueOnce(1000),
                    setY: jest.fn(),
                    needsUpdate: false
                }
            }
        };

        // Set up test heightmap
        terrainSystem.heightmapData = new Float32Array([0, 10, 20, 30]);

        terrainSystem.applyElevationData(mockGeometry, 2);

        expect(mockGeometry.attributes.position.setY).toHaveBeenCalledTimes(4);
        expect(mockGeometry.attributes.position.needsUpdate).toBe(true);
    });

    test('should create appropriate material for different LOD levels', () => {
        // Test detailed material for low LOD
        const detailedMaterial = terrainSystem.createTerrainMaterial(0);
        expect(THREE.MeshStandardMaterial).toHaveBeenCalled();

        // Test simple material for high LOD
        const simpleMaterial = terrainSystem.createTerrainMaterial(3);
        expect(THREE.MeshLambertMaterial).toHaveBeenCalled();
    });

    test('should update LOD based on camera distance', async () => {
        // Initialize with mock data
        const mockElevationData = new Float32Array(4);
        mockMapDataManager.loadMapData.mockResolvedValue({
            elevation: mockElevationData
        });

        await terrainSystem.initialize();

        // Mock camera positions at different distances
        const nearCamera = new THREE.Vector3(0, 0, 100);
        const farCamera = new THREE.Vector3(0, 0, 1500);

        // Test near camera (should use LOD 0)
        terrainSystem.updateLOD(nearCamera);
        expect(terrainSystem.currentLOD).toBe(0);

        // Mock far distance for far camera
        farCamera.distanceTo = jest.fn().mockReturnValue(1500);
        
        // Test far camera (should use higher LOD)
        terrainSystem.updateLOD(farCamera);
        expect(terrainSystem.currentLOD).toBeGreaterThan(0);
    });

    test('should switch LOD correctly', async () => {
        // Initialize with mock data
        const mockElevationData = new Float32Array(4);
        mockMapDataManager.loadMapData.mockResolvedValue({
            elevation: mockElevationData
        });

        await terrainSystem.initialize();

        const initialLOD = terrainSystem.currentLOD;
        const newLOD = 2;

        terrainSystem.switchLOD(newLOD);

        expect(terrainSystem.currentLOD).toBe(newLOD);
        expect(terrainSystem.terrainMesh).toBe(terrainSystem.lodMeshes[newLOD]);
        expect(terrainSystem.stats.lodSwitches).toBe(1);
    });

    test('should not switch to invalid LOD levels', async () => {
        // Initialize with mock data
        const mockElevationData = new Float32Array(4);
        mockMapDataManager.loadMapData.mockResolvedValue({
            elevation: mockElevationData
        });

        await terrainSystem.initialize();

        const initialLOD = terrainSystem.currentLOD;

        // Test invalid LOD levels
        terrainSystem.switchLOD(-1);
        expect(terrainSystem.currentLOD).toBe(initialLOD);

        terrainSystem.switchLOD(10);
        expect(terrainSystem.currentLOD).toBe(initialLOD);
    });

    test('should get height at world coordinates', async () => {
        // Set up test heightmap
        terrainSystem.heightmapData = new Float32Array([0, 10, 20, 30]);
        terrainSystem.config.heightScale = 1.0;

        const height = terrainSystem.getHeightAt(0, 0);
        expect(typeof height).toBe('number');
        expect(height).toBeGreaterThanOrEqual(0);
    });

    test('should return 0 height when no heightmap data', () => {
        terrainSystem.heightmapData = null;
        
        const height = terrainSystem.getHeightAt(0, 0);
        expect(height).toBe(0);
    });

    test('should provide terrain statistics', async () => {
        // Initialize with mock data
        const mockElevationData = new Float32Array(16);
        mockMapDataManager.loadMapData.mockResolvedValue({
            elevation: mockElevationData
        });

        await terrainSystem.initialize();

        const stats = terrainSystem.getStats();

        expect(stats).toHaveProperty('triangles');
        expect(stats).toHaveProperty('vertices');
        expect(stats).toHaveProperty('lodSwitches');
        expect(stats).toHaveProperty('currentLOD');
        expect(stats).toHaveProperty('heightmapSize');
        expect(stats).toHaveProperty('lodLevels');
        expect(stats).toHaveProperty('worldSize');
        
        expect(stats.heightmapSize).toBe(4); // sqrt(16)
        expect(stats.lodLevels).toBe(4);
        expect(stats.worldSize).toBe(2000);
    });

    test('should dispose resources properly', async () => {
        // Initialize with mock data
        const mockElevationData = new Float32Array(4);
        mockMapDataManager.loadMapData.mockResolvedValue({
            elevation: mockElevationData
        });

        await terrainSystem.initialize();

        // Mock parent for meshes
        terrainSystem.lodMeshes.forEach(mesh => {
            mesh.parent = { remove: jest.fn() };
        });

        terrainSystem.dispose();

        // Check that resources are disposed
        expect(terrainSystem.lodMeshes).toEqual([]);
        expect(terrainSystem.terrainMesh).toBeNull();
        expect(terrainSystem.heightmapData).toBeNull();
        expect(terrainSystem.textureAtlas).toBeNull();

        // Check that geometries and materials are disposed
        terrainSystem.lodMeshes.forEach(mesh => {
            if (mesh.geometry && mesh.geometry.dispose) {
                expect(mesh.geometry.dispose).toHaveBeenCalled();
            }
            if (mesh.material && mesh.material.dispose) {
                expect(mesh.material.dispose).toHaveBeenCalled();
            }
        });
    });

    test('should handle texture initialization', async () => {
        await terrainSystem.initializeTextures();

        expect(terrainSystem.config.textures.grass).toBeDefined();
        expect(terrainSystem.config.textures.forest).toBeDefined();
        expect(terrainSystem.config.textures.sand).toBeDefined();
        expect(terrainSystem.config.textures.water).toBeDefined();
        expect(terrainSystem.textureAtlas).toBeDefined();
    });

    test('should generate LOD meshes with correct visibility', async () => {
        const mockElevationData = new Float32Array(4);
        terrainSystem.heightmapData = mockElevationData;

        await terrainSystem.generateTerrainLOD();

        expect(terrainSystem.lodMeshes).toHaveLength(4);
        
        // Only LOD 0 should be visible initially
        expect(terrainSystem.lodMeshes[0].visible).toBe(true);
        for (let i = 1; i < terrainSystem.lodMeshes.length; i++) {
            expect(terrainSystem.lodMeshes[i].visible).toBe(false);
        }

        // Check LOD metadata
        terrainSystem.lodMeshes.forEach((mesh, index) => {
            expect(mesh.userData.lodLevel).toBe(index);
            expect(mesh.userData.maxDistance).toBe(terrainSystem.config.lod.distances[index]);
        });
    });

    test('should handle edge cases in heightmap sampling', () => {
        terrainSystem.heightmapData = new Float32Array([10, 20, 30, 40]);

        // Test boundary conditions
        expect(terrainSystem.sampleHeightmap(0, 0, 2)).toBe(10);
        expect(terrainSystem.sampleHeightmap(1, 1, 2)).toBe(40);
        
        // Test out-of-bounds clamping
        expect(terrainSystem.sampleHeightmap(-1, -1, 2)).toBe(10);
        expect(terrainSystem.sampleHeightmap(2, 2, 2)).toBe(40);
    });
});