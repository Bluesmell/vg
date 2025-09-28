import { ViimsiMapLoader } from './ViimsiMapLoader.js';

/**
 * MapDataManager - Manages map data loading and integration with the game engine
 * Handles data transformation from real-world coordinates to game world coordinates
 */
export class MapDataManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.mapLoader = new ViimsiMapLoader();
        this.mapData = null;
        this.isLoading = false;
        
        // Coordinate transformation settings
        // Maps real-world Viimsi Parish coordinates to game world coordinates
        this.coordinateTransform = {
            // Game world bounds (-1000 to +1000 units)
            gameWorldSize: 2000,
            
            // Real-world Viimsi Parish bounds
            realWorldBounds: this.mapLoader.viimsiParishBounds,
            
            // Calculate scale factors
            get scaleX() {
                return this.gameWorldSize / (this.realWorldBounds.east - this.realWorldBounds.west);
            },
            
            get scaleZ() {
                return this.gameWorldSize / (this.realWorldBounds.north - this.realWorldBounds.south);
            }
        };
        
        console.log('MapDataManager initialized with coordinate transform:', {
            scaleX: this.coordinateTransform.scaleX,
            scaleZ: this.coordinateTransform.scaleZ
        });
    }

    /**
     * Initialize and load all Viimsi Parish data from Maa-amet APIs
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('🗺️ Loading REAL Viimsi Parish data from Maa-amet APIs...');
        
        try {
            // Load all map data using the existing loadMapData method
            await this.loadMapData();
            
            console.log('✅ Real Viimsi Parish data loaded successfully!');
            console.log('📊 Data summary:', {
                elevation: this.mapData.elevation ? `${Math.sqrt(this.mapData.elevation.length)}x${Math.sqrt(this.mapData.elevation.length)} heightmap` : 'none',
                buildings: `${this.mapData.buildings.length} buildings`,
                roads: `${this.mapData.roads.length} roads`,
                forests: `${this.mapData.forests.length} forest areas`
            });
            
        } catch (error) {
            console.error('❌ Failed to load Viimsi Parish data:', error);
            throw error;
        }
    }

    /**
     * Load and integrate Viimsi Parish map data into the game
     * @returns {Promise<Object>} Loaded and processed map data
     */
    async loadMapData() {
        if (this.isLoading) {
            console.log('Map data loading already in progress...');
            // Wait for the current loading to complete
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            return this.mapData;
        }

        try {
            this.isLoading = true;
            console.log('Loading Viimsi Parish map data for game integration...');

            // Load raw map data
            const rawMapData = await this.mapLoader.loadViimsiData();
            
            // Transform data for game world
            this.mapData = {
                elevation: this.transformElevationData(rawMapData.elevation),
                buildings: this.transformBuildingData(rawMapData.buildings),
                roads: this.transformRoadData(rawMapData.roads),
                forests: this.transformForestData(rawMapData.forests),
                bounds: rawMapData.bounds,
                gameWorldBounds: {
                    minX: -1000,
                    maxX: 1000,
                    minZ: -1000,
                    maxZ: 1000
                },
                timestamp: rawMapData.timestamp
            };

            console.log('Map data transformed for game world:', {
                elevationSize: this.mapData.elevation ? this.mapData.elevation.length : 0,
                buildingCount: this.mapData.buildings.length,
                roadCount: this.mapData.roads.length,
                forestCount: this.mapData.forests.length
            });

            return this.mapData;

        } catch (error) {
            console.error('Failed to load map data:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Transform real-world coordinates to game world coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Object} Game world coordinates {x, z}
     */
    realWorldToGameWorld(lat, lon) {
        const bounds = this.coordinateTransform.realWorldBounds;
        
        // Normalize to 0-1 range
        const normalizedX = (lon - bounds.west) / (bounds.east - bounds.west);
        const normalizedZ = (lat - bounds.south) / (bounds.north - bounds.south);
        
        // Scale to game world coordinates (-1000 to +1000)
        const gameX = (normalizedX - 0.5) * this.coordinateTransform.gameWorldSize;
        const gameZ = (normalizedZ - 0.5) * this.coordinateTransform.gameWorldSize;
        
        return { x: gameX, z: gameZ };
    }

    /**
     * Transform game world coordinates to real-world coordinates
     * @param {number} x - Game world X coordinate
     * @param {number} z - Game world Z coordinate
     * @returns {Object} Real-world coordinates {lat, lon}
     */
    gameWorldToRealWorld(x, z) {
        const bounds = this.coordinateTransform.realWorldBounds;
        
        // Normalize from game world to 0-1 range
        const normalizedX = (x / this.coordinateTransform.gameWorldSize) + 0.5;
        const normalizedZ = (z / this.coordinateTransform.gameWorldSize) + 0.5;
        
        // Scale to real-world coordinates
        const lon = bounds.west + normalizedX * (bounds.east - bounds.west);
        const lat = bounds.south + normalizedZ * (bounds.north - bounds.south);
        
        return { lat, lon };
    }

    /**
     * Transform elevation data for game world
     * @param {Float32Array} elevationData - Raw elevation data
     * @returns {Float32Array} Transformed elevation data
     */
    transformElevationData(elevationData) {
        if (!elevationData) return null;
        
        console.log('Transforming elevation data for game world...');
        
        // Elevation data is already in the correct format (heightmap)
        // Just ensure it's scaled appropriately for the game world
        const scaledElevation = new Float32Array(elevationData.length);
        
        for (let i = 0; i < elevationData.length; i++) {
            // Scale elevation to reasonable game world heights (0-50m becomes 0-50 units)
            scaledElevation[i] = elevationData[i];
        }
        
        return scaledElevation;
    }

    /**
     * Transform building data for game world
     * @param {Array} buildings - Raw building data
     * @returns {Array} Transformed building data
     */
    transformBuildingData(buildings) {
        console.log(`Transforming ${buildings.length} buildings for game world...`);
        
        return buildings.map(building => {
            let gameCoords;
            
            if (building.lat && building.lon) {
                // Transform coordinates
                gameCoords = this.realWorldToGameWorld(building.lat, building.lon);
            } else if (building.geometry && building.geometry.length > 0) {
                // Use first geometry point for position
                const firstPoint = building.geometry[0];
                gameCoords = this.realWorldToGameWorld(firstPoint.lat, firstPoint.lon);
            } else {
                // Default position if no coordinates available
                gameCoords = { x: 0, z: 0 };
            }
            
            return {
                ...building,
                gamePosition: {
                    x: gameCoords.x,
                    y: building.height ? building.height / 2 : 3, // Center at half height
                    z: gameCoords.z
                },
                gameHeight: building.height || 6,
                realWorldCoords: {
                    lat: building.lat,
                    lon: building.lon
                }
            };
        });
    }

    /**
     * Transform road data for game world
     * @param {Array} roads - Raw road data
     * @returns {Array} Transformed road data
     */
    transformRoadData(roads) {
        console.log(`Transforming ${roads.length} roads for game world...`);
        
        return roads.map(road => {
            const gameGeometry = road.geometry ? road.geometry.map(point => {
                const gameCoords = this.realWorldToGameWorld(point.lat, point.lon);
                return {
                    x: gameCoords.x,
                    z: gameCoords.z,
                    realLat: point.lat,
                    realLon: point.lon
                };
            }) : [];
            
            return {
                ...road,
                gameGeometry,
                width: this.getRoadWidth(road.type)
            };
        });
    }

    /**
     * Transform forest data for game world
     * @param {Array} forests - Raw forest data
     * @returns {Array} Transformed forest data
     */
    transformForestData(forests) {
        console.log(`Transforming ${forests.length} forest areas for game world...`);
        
        return forests.map(forest => {
            const bounds = forest.bounds;
            const gameNorthWest = this.realWorldToGameWorld(bounds.north, bounds.west);
            const gameSouthEast = this.realWorldToGameWorld(bounds.south, bounds.east);
            
            return {
                ...forest,
                gameBounds: {
                    minX: Math.min(gameNorthWest.x, gameSouthEast.x),
                    maxX: Math.max(gameNorthWest.x, gameSouthEast.x),
                    minZ: Math.min(gameNorthWest.z, gameSouthEast.z),
                    maxZ: Math.max(gameNorthWest.z, gameSouthEast.z)
                },
                realWorldBounds: bounds
            };
        });
    }

    /**
     * Get road width based on road type
     * @param {string} roadType - OSM highway type
     * @returns {number} Road width in game units
     */
    getRoadWidth(roadType) {
        const widths = {
            'motorway': 12,
            'trunk': 10,
            'primary': 8,
            'secondary': 6,
            'tertiary': 5,
            'residential': 4,
            'service': 3,
            'footway': 1.5,
            'path': 1
        };
        
        return widths[roadType] || 4;
    }

    /**
     * Get buildings within a specific area
     * @param {number} centerX - Center X coordinate
     * @param {number} centerZ - Center Z coordinate
     * @param {number} radius - Search radius
     * @returns {Array} Buildings within the area
     */
    getBuildingsInArea(centerX, centerZ, radius) {
        if (!this.mapData || !this.mapData.buildings) return [];
        
        return this.mapData.buildings.filter(building => {
            const dx = building.gamePosition.x - centerX;
            const dz = building.gamePosition.z - centerZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            return distance <= radius;
        });
    }

    /**
     * Get roads within a specific area
     * @param {number} centerX - Center X coordinate
     * @param {number} centerZ - Center Z coordinate
     * @param {number} radius - Search radius
     * @returns {Array} Roads within the area
     */
    getRoadsInArea(centerX, centerZ, radius) {
        if (!this.mapData || !this.mapData.roads) return [];
        
        return this.mapData.roads.filter(road => {
            return road.gameGeometry.some(point => {
                const dx = point.x - centerX;
                const dz = point.z - centerZ;
                const distance = Math.sqrt(dx * dx + dz * dz);
                return distance <= radius;
            });
        });
    }

    /**
     * Get elevation at specific game world coordinates
     * @param {number} x - Game world X coordinate
     * @param {number} z - Game world Z coordinate
     * @returns {number} Elevation at the point
     */
    getElevationAt(x, z) {
        if (!this.mapData || !this.mapData.elevation) return 0;
        
        // Convert game world coordinates to heightmap indices
        const size = Math.sqrt(this.mapData.elevation.length);
        const normalizedX = (x + 1000) / 2000; // Convert -1000:1000 to 0:1
        const normalizedZ = (z + 1000) / 2000;
        
        const mapX = Math.floor(normalizedX * size);
        const mapZ = Math.floor(normalizedZ * size);
        
        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(size - 1, mapX));
        const clampedZ = Math.max(0, Math.min(size - 1, mapZ));
        
        const index = clampedZ * size + clampedX;
        return this.mapData.elevation[index] || 0;
    }

    /**
     * Get current player location info
     * @param {number} x - Player X coordinate
     * @param {number} z - Player Z coordinate
     * @returns {Object} Location information
     */
    getLocationInfo(x, z) {
        const realWorldCoords = this.gameWorldToRealWorld(x, z);
        const elevation = this.getElevationAt(x, z);
        const nearbyBuildings = this.getBuildingsInArea(x, z, 100);
        const nearbyRoads = this.getRoadsInArea(x, z, 50);
        
        return {
            gameCoords: { x, z },
            realWorldCoords,
            elevation,
            nearbyBuildings: nearbyBuildings.slice(0, 5), // Limit to 5 closest
            nearbyRoads: nearbyRoads.slice(0, 3), // Limit to 3 closest
            inViimsiParish: this.isInViimsiParish(realWorldCoords.lat, realWorldCoords.lon)
        };
    }

    /**
     * Check if coordinates are within Viimsi Parish bounds
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {boolean} True if within Viimsi Parish
     */
    isInViimsiParish(lat, lon) {
        const bounds = this.mapLoader.viimsiParishBounds;
        return lat >= bounds.south && lat <= bounds.north &&
               lon >= bounds.west && lon <= bounds.east;
    }

    /**
     * Get map data statistics
     * @returns {Object} Map data statistics
     */
    getStats() {
        if (!this.mapData) return null;
        
        return {
            loaded: true,
            timestamp: this.mapData.timestamp,
            buildings: this.mapData.buildings.length,
            roads: this.mapData.roads.length,
            forests: this.mapData.forests.length,
            elevationPoints: this.mapData.elevation ? this.mapData.elevation.length : 0,
            cacheStats: this.mapLoader.getCacheStats()
        };
    }

    /**
     * Dispose of the map data manager
     */
    dispose() {
        this.mapLoader.clearCache();
        this.mapData = null;
        console.log('MapDataManager disposed');
    }
}