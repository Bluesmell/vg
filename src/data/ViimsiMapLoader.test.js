import { ViimsiMapLoader } from './ViimsiMapLoader.js';

// Mock fetch for testing
global.fetch = jest.fn();

describe('ViimsiMapLoader', () => {
    let mapLoader;

    beforeEach(() => {
        mapLoader = new ViimsiMapLoader();
        fetch.mockClear();
    });

    afterEach(() => {
        mapLoader.clearCache();
    });

    test('should initialize with Viimsi Parish bounds', () => {
        expect(mapLoader.viimsiParishBounds).toBeDefined();
        expect(mapLoader.viimsiParishBounds.north).toBeGreaterThan(mapLoader.viimsiParishBounds.south);
        expect(mapLoader.viimsiParishBounds.east).toBeGreaterThan(mapLoader.viimsiParishBounds.west);
    });

    test('should have correct Estonian endpoints', () => {
        expect(mapLoader.maaametEndpoints.elevation).toContain('maaamet.ee');
        expect(mapLoader.maaametEndpoints.buildings).toContain('maaamet.ee');
        expect(mapLoader.overpassEndpoint).toContain('overpass-api.de');
    });

    test('should generate fallback elevation data', () => {
        const elevationData = mapLoader.generateFallbackElevation();
        
        expect(elevationData).toBeInstanceOf(Float32Array);
        expect(elevationData.length).toBe(512 * 512);
        
        // Check that elevation values are reasonable for Viimsi Parish (0-50m)
        // Use a loop instead of spread operator to avoid stack overflow
        let maxElevation = 0;
        let minElevation = Infinity;
        for (let i = 0; i < elevationData.length; i++) {
            maxElevation = Math.max(maxElevation, elevationData[i]);
            minElevation = Math.min(minElevation, elevationData[i]);
        }
        
        expect(minElevation).toBeGreaterThanOrEqual(0);
        expect(maxElevation).toBeLessThan(50);
    });

    test('should generate Viimsi Parish forest data', () => {
        const forests = mapLoader.generateViimsiForestData();
        
        expect(Array.isArray(forests)).toBe(true);
        expect(forests.length).toBeGreaterThan(0);
        
        forests.forEach(forest => {
            expect(forest).toHaveProperty('name');
            expect(forest).toHaveProperty('type');
            expect(forest).toHaveProperty('bounds');
            expect(forest.bounds).toHaveProperty('north');
            expect(forest.bounds).toHaveProperty('south');
            expect(forest.bounds).toHaveProperty('east');
            expect(forest.bounds).toHaveProperty('west');
        });
    });

    test('should generate fallback building data for Viimsi landmarks', () => {
        const buildings = mapLoader.generateFallbackBuildings();
        
        expect(Array.isArray(buildings)).toBe(true);
        expect(buildings.length).toBeGreaterThan(0);
        
        // Check for key Viimsi Parish landmarks
        const viimsiManor = buildings.find(b => b.name === 'Viimsi Manor');
        expect(viimsiManor).toBeDefined();
        expect(viimsiManor.type).toBe('historic');
        
        const viimsiGym = buildings.find(b => b.name === 'Viimsi Gymnasium');
        expect(viimsiGym).toBeDefined();
        expect(viimsiGym.type).toBe('school');
    });

    test('should estimate building heights correctly', () => {
        // Test with explicit height
        expect(mapLoader.estimateBuildingHeight({ height: '15' })).toBe(15);
        
        // Test with levels
        expect(mapLoader.estimateBuildingHeight({ levels: '3' })).toBe(9);
        expect(mapLoader.estimateBuildingHeight({ 'building:levels': '2' })).toBe(6);
        
        // Test with building types
        expect(mapLoader.estimateBuildingHeight({ building: 'house' })).toBe(6);
        expect(mapLoader.estimateBuildingHeight({ building: 'school' })).toBe(8);
        expect(mapLoader.estimateBuildingHeight({ building: 'church' })).toBe(15);
        
        // Test default
        expect(mapLoader.estimateBuildingHeight({ building: 'unknown' })).toBe(6);
    });

    test('should process OSM building data correctly', () => {
        const mockOSMElements = [
            {
                type: 'way',
                id: 123,
                tags: {
                    building: 'house',
                    name: 'Test House',
                    levels: '2'
                },
                geometry: [{ lat: 59.5, lon: 24.8 }]
            },
            {
                type: 'way',
                id: 124,
                tags: {
                    building: 'school',
                    height: '12'
                },
                geometry: [{ lat: 59.49, lon: 24.79 }]
            }
        ];

        const processed = mapLoader.processOSMBuildings(mockOSMElements);
        
        expect(processed).toHaveLength(2);
        expect(processed[0].name).toBe('Test House');
        expect(processed[0].height).toBe(6); // 2 levels * 3m
        expect(processed[1].height).toBe(12);
    });

    test('should process OSM road data correctly', () => {
        const mockOSMElements = [
            {
                type: 'way',
                id: 456,
                tags: {
                    highway: 'primary',
                    name: 'Viimsi Road',
                    surface: 'asphalt'
                },
                geometry: [
                    { lat: 59.5, lon: 24.8 },
                    { lat: 59.49, lon: 24.79 }
                ]
            }
        ];

        const processed = mapLoader.processOSMRoads(mockOSMElements);
        
        expect(processed).toHaveLength(1);
        expect(processed[0].name).toBe('Viimsi Road');
        expect(processed[0].type).toBe('primary');
        expect(processed[0].surface).toBe('asphalt');
    });

    test('should handle cache correctly', () => {
        const testData = { test: 'data' };
        const cacheKey = 'test-key';
        
        // Initially cache should be invalid
        expect(mapLoader.isCacheValid(cacheKey)).toBe(false);
        
        // Set cache
        mapLoader.cache.set(cacheKey, {
            data: testData,
            timestamp: Date.now()
        });
        
        // Now cache should be valid
        expect(mapLoader.isCacheValid(cacheKey)).toBe(true);
        
        // Test cache stats
        const stats = mapLoader.getCacheStats();
        expect(stats.size).toBe(1);
        expect(stats.keys).toContain(cacheKey);
        
        // Clear cache
        mapLoader.clearCache();
        expect(mapLoader.cache.size).toBe(0);
    });

    test('should handle expired cache correctly', () => {
        const testData = { test: 'data' };
        const cacheKey = 'test-key';
        
        // Set cache with old timestamp
        mapLoader.cache.set(cacheKey, {
            data: testData,
            timestamp: Date.now() - (mapLoader.cacheTimeout + 1000)
        });
        
        // Cache should be invalid due to age
        expect(mapLoader.isCacheValid(cacheKey)).toBe(false);
    });

    test('should load complete Viimsi data with fallbacks', async () => {
        // Mock fetch to simulate network failures
        fetch.mockRejectedValue(new Error('Network error'));
        
        const mapData = await mapLoader.loadViimsiData();
        
        expect(mapData).toHaveProperty('elevation');
        expect(mapData).toHaveProperty('buildings');
        expect(mapData).toHaveProperty('roads');
        expect(mapData).toHaveProperty('forests');
        expect(mapData).toHaveProperty('bounds');
        expect(mapData).toHaveProperty('timestamp');
        
        expect(mapData.bounds).toEqual(mapLoader.viimsiParishBounds);
        expect(Array.isArray(mapData.buildings)).toBe(true);
        expect(Array.isArray(mapData.roads)).toBe(true);
        expect(Array.isArray(mapData.forests)).toBe(true);
    });

    test('should handle successful OSM building fetch', async () => {
        const mockOSMResponse = {
            elements: [
                {
                    type: 'way',
                    id: 123,
                    tags: {
                        building: 'house',
                        name: 'Viimsi House'
                    },
                    geometry: [{ lat: 59.5, lon: 24.8 }]
                }
            ]
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockOSMResponse)
        });

        const buildings = await mapLoader.fetchOSMBuildings();
        
        expect(buildings).toHaveLength(1);
        expect(buildings[0].name).toBe('Viimsi House');
        expect(fetch).toHaveBeenCalledWith(
            mapLoader.overpassEndpoint,
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            })
        );
    });

    test('should handle OSM API failures gracefully', async () => {
        fetch.mockRejectedValue(new Error('OSM API error'));
        
        const buildings = await mapLoader.fetchOSMBuildings();
        
        // Should return fallback buildings
        expect(Array.isArray(buildings)).toBe(true);
        expect(buildings.length).toBeGreaterThan(0);
        
        const viimsiManor = buildings.find(b => b.name === 'Viimsi Manor');
        expect(viimsiManor).toBeDefined();
    });
});