import { MapDataManager } from './MapDataManager.js';
import { ViimsiMapLoader } from './ViimsiMapLoader.js';

// Mock ViimsiMapLoader
jest.mock('./ViimsiMapLoader.js');

describe('MapDataManager', () => {
    let mapDataManager;
    let mockGameEngine;
    let mockMapLoader;

    beforeEach(() => {
        mockGameEngine = {
            scene: { add: jest.fn() },
            physics: { addBody: jest.fn() }
        };

        mockMapLoader = {
            viimsiParishBounds: {
                north: 59.5167,
                south: 59.4167,
                east: 24.8333,
                west: 24.7000
            },
            loadViimsiData: jest.fn(),
            getCacheStats: jest.fn(() => ({ size: 0, keys: [], totalSize: 0 })),
            clearCache: jest.fn()
        };

        ViimsiMapLoader.mockImplementation(() => mockMapLoader);
        mapDataManager = new MapDataManager(mockGameEngine);
    });

    afterEach(() => {
        mapDataManager.dispose();
    });

    test('should initialize with coordinate transformation', () => {
        expect(mapDataManager.coordinateTransform).toBeDefined();
        expect(mapDataManager.coordinateTransform.gameWorldSize).toBe(2000);
        expect(mapDataManager.coordinateTransform.scaleX).toBeGreaterThan(0);
        expect(mapDataManager.coordinateTransform.scaleZ).toBeGreaterThan(0);
    });

    test('should transform real-world coordinates to game world', () => {
        // Test center of Viimsi Parish
        const centerLat = (59.5167 + 59.4167) / 2;
        const centerLon = (24.8333 + 24.7000) / 2;
        
        const gameCoords = mapDataManager.realWorldToGameWorld(centerLat, centerLon);
        
        // Center should be near origin
        expect(Math.abs(gameCoords.x)).toBeLessThan(100);
        expect(Math.abs(gameCoords.z)).toBeLessThan(100);
    });

    test('should transform game world coordinates to real-world', () => {
        // Test origin (center of game world)
        const realCoords = mapDataManager.gameWorldToRealWorld(0, 0);
        
        // Should be near center of Viimsi Parish
        const expectedLat = (59.5167 + 59.4167) / 2;
        const expectedLon = (24.8333 + 24.7000) / 2;
        
        expect(Math.abs(realCoords.lat - expectedLat)).toBeLessThan(0.01);
        expect(Math.abs(realCoords.lon - expectedLon)).toBeLessThan(0.01);
    });

    test('should handle coordinate transformation round-trip', () => {
        const originalLat = 59.4833;
        const originalLon = 24.7667;
        
        const gameCoords = mapDataManager.realWorldToGameWorld(originalLat, originalLon);
        const backToReal = mapDataManager.gameWorldToRealWorld(gameCoords.x, gameCoords.z);
        
        expect(Math.abs(backToReal.lat - originalLat)).toBeLessThan(0.001);
        expect(Math.abs(backToReal.lon - originalLon)).toBeLessThan(0.001);
    });

    test('should load and transform map data', async () => {
        const mockRawData = {
            elevation: new Float32Array([1, 2, 3, 4]),
            buildings: [
                {
                    name: 'Viimsi Manor',
                    lat: 59.4833,
                    lon: 24.7667,
                    height: 12
                }
            ],
            roads: [
                {
                    name: 'Test Road',
                    type: 'primary',
                    geometry: [
                        { lat: 59.5, lon: 24.8 },
                        { lat: 59.49, lon: 24.79 }
                    ]
                }
            ],
            forests: [
                {
                    name: 'Test Forest',
                    bounds: {
                        north: 59.5,
                        south: 59.48,
                        east: 24.82,
                        west: 24.78
                    }
                }
            ],
            bounds: mockMapLoader.viimsiParishBounds,
            timestamp: Date.now()
        };

        mockMapLoader.loadViimsiData.mockResolvedValue(mockRawData);

        const mapData = await mapDataManager.loadMapData();

        expect(mapData).toBeDefined();
        expect(mapData.buildings).toHaveLength(1);
        expect(mapData.roads).toHaveLength(1);
        expect(mapData.forests).toHaveLength(1);
        expect(mapData.elevation).toBeInstanceOf(Float32Array);

        // Check building transformation
        const building = mapData.buildings[0];
        expect(building.gamePosition).toBeDefined();
        expect(building.gamePosition.x).toBeDefined();
        expect(building.gamePosition.z).toBeDefined();
        expect(building.realWorldCoords).toBeDefined();
    });

    test('should transform building data correctly', () => {
        const buildings = [
            {
                name: 'Test Building',
                lat: 59.4833,
                lon: 24.7667,
                height: 15
            },
            {
                name: 'Building with geometry',
                geometry: [
                    { lat: 59.5, lon: 24.8 },
                    { lat: 59.49, lon: 24.79 }
                ],
                height: 8
            }
        ];

        const transformed = mapDataManager.transformBuildingData(buildings);

        expect(transformed).toHaveLength(2);
        
        // First building
        expect(transformed[0].gamePosition).toBeDefined();
        expect(transformed[0].gameHeight).toBe(15);
        expect(transformed[0].realWorldCoords.lat).toBe(59.4833);
        
        // Second building (uses first geometry point)
        expect(transformed[1].gamePosition).toBeDefined();
        expect(transformed[1].gameHeight).toBe(8);
    });

    test('should transform road data correctly', () => {
        const roads = [
            {
                name: 'Test Road',
                type: 'primary',
                geometry: [
                    { lat: 59.5, lon: 24.8 },
                    { lat: 59.49, lon: 24.79 }
                ]
            }
        ];

        const transformed = mapDataManager.transformRoadData(roads);

        expect(transformed).toHaveLength(1);
        expect(transformed[0].gameGeometry).toHaveLength(2);
        expect(transformed[0].width).toBe(8); // Primary road width
        
        const firstPoint = transformed[0].gameGeometry[0];
        expect(firstPoint.x).toBeDefined();
        expect(firstPoint.z).toBeDefined();
        expect(firstPoint.realLat).toBe(59.5);
        expect(firstPoint.realLon).toBe(24.8);
    });

    test('should get correct road widths', () => {
        expect(mapDataManager.getRoadWidth('motorway')).toBe(12);
        expect(mapDataManager.getRoadWidth('primary')).toBe(8);
        expect(mapDataManager.getRoadWidth('residential')).toBe(4);
        expect(mapDataManager.getRoadWidth('footway')).toBe(1.5);
        expect(mapDataManager.getRoadWidth('unknown')).toBe(4);
    });

    test('should find buildings in area', async () => {
        const mockRawData = {
            elevation: new Float32Array([1, 2, 3, 4]),
            buildings: [
                { name: 'Near Building', lat: 59.4833, lon: 24.7667, height: 12 },
                { name: 'Far Building', lat: 59.5100, lon: 24.8200, height: 8 }
            ],
            roads: [],
            forests: [],
            bounds: mockMapLoader.viimsiParishBounds,
            timestamp: Date.now()
        };

        mockMapLoader.loadViimsiData.mockResolvedValue(mockRawData);
        await mapDataManager.loadMapData();

        // Get buildings near origin
        const nearbyBuildings = mapDataManager.getBuildingsInArea(0, 0, 500);
        
        expect(nearbyBuildings.length).toBeGreaterThan(0);
        expect(nearbyBuildings[0].name).toBeDefined();
    });

    test('should get elevation at coordinates', async () => {
        const elevationData = new Float32Array(4);
        elevationData[0] = 10;
        elevationData[1] = 15;
        elevationData[2] = 20;
        elevationData[3] = 25;

        const mockRawData = {
            elevation: elevationData,
            buildings: [],
            roads: [],
            forests: [],
            bounds: mockMapLoader.viimsiParishBounds,
            timestamp: Date.now()
        };

        mockMapLoader.loadViimsiData.mockResolvedValue(mockRawData);
        await mapDataManager.loadMapData();

        const elevation = mapDataManager.getElevationAt(0, 0);
        expect(typeof elevation).toBe('number');
        expect(elevation).toBeGreaterThanOrEqual(0);
    });

    test('should check if coordinates are in Viimsi Parish', () => {
        // Inside Viimsi Parish
        expect(mapDataManager.isInViimsiParish(59.4833, 24.7667)).toBe(true);
        
        // Outside Viimsi Parish
        expect(mapDataManager.isInViimsiParish(59.6, 24.9)).toBe(false);
        expect(mapDataManager.isInViimsiParish(59.3, 24.6)).toBe(false);
    });

    test('should get location info', async () => {
        const mockRawData = {
            elevation: new Float32Array([10, 15, 20, 25]),
            buildings: [
                { name: 'Test Building', lat: 59.4833, lon: 24.7667, height: 12 }
            ],
            roads: [
                {
                    name: 'Test Road',
                    type: 'primary',
                    geometry: [{ lat: 59.4833, lon: 24.7667 }]
                }
            ],
            forests: [],
            bounds: mockMapLoader.viimsiParishBounds,
            timestamp: Date.now()
        };

        mockMapLoader.loadViimsiData.mockResolvedValue(mockRawData);
        await mapDataManager.loadMapData();

        const locationInfo = mapDataManager.getLocationInfo(0, 0);

        expect(locationInfo.gameCoords).toEqual({ x: 0, z: 0 });
        expect(locationInfo.realWorldCoords).toBeDefined();
        expect(locationInfo.elevation).toBeDefined();
        expect(locationInfo.inViimsiParish).toBe(true);
        expect(Array.isArray(locationInfo.nearbyBuildings)).toBe(true);
        expect(Array.isArray(locationInfo.nearbyRoads)).toBe(true);
    });

    test('should get map data statistics', async () => {
        const mockRawData = {
            elevation: new Float32Array([1, 2, 3, 4]),
            buildings: [{ name: 'Test', lat: 59.5, lon: 24.8, height: 10 }],
            roads: [{ name: 'Road', type: 'primary', geometry: [] }],
            forests: [{ name: 'Forest', bounds: {} }],
            bounds: mockMapLoader.viimsiParishBounds,
            timestamp: Date.now()
        };

        mockMapLoader.loadViimsiData.mockResolvedValue(mockRawData);
        await mapDataManager.loadMapData();

        const stats = mapDataManager.getStats();

        expect(stats.loaded).toBe(true);
        expect(stats.buildings).toBe(1);
        expect(stats.roads).toBe(1);
        expect(stats.forests).toBe(1);
        expect(stats.elevationPoints).toBe(4);
        expect(stats.cacheStats).toBeDefined();
    });

    test('should handle loading errors gracefully', async () => {
        mockMapLoader.loadViimsiData.mockRejectedValue(new Error('Network error'));

        await expect(mapDataManager.loadMapData()).rejects.toThrow('Network error');
        expect(mapDataManager.isLoading).toBe(false);
    });

    test('should prevent concurrent loading', async () => {
        const mockRawData = {
            elevation: new Float32Array([1, 2, 3, 4]),
            buildings: [],
            roads: [],
            forests: [],
            bounds: mockMapLoader.viimsiParishBounds,
            timestamp: Date.now()
        };

        mockMapLoader.loadViimsiData.mockResolvedValue(mockRawData);

        // Start two concurrent loads
        const promise1 = mapDataManager.loadMapData();
        const promise2 = mapDataManager.loadMapData();

        const [result1, result2] = await Promise.all([promise1, promise2]);

        // Should return the same data (deep equality since objects are recreated)
        expect(result1).toEqual(result2);
        expect(mockMapLoader.loadViimsiData).toHaveBeenCalledTimes(1);
    });
});