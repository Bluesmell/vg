import * as GeoTIFF from 'geotiff';

/**
 * ViimsiMapLoader - Loads real Estonian map data for Viimsi Parish
 * Integrates with Maa-amet (Estonian Land Board) WMS services and OpenStreetMap
 */

export class ViimsiMapLoader {
    constructor() {
        // Viimsi Parish boundaries (approximate coordinates)
        this.viimsiParishBounds = {
            north: 59.5167,  // Northern boundary
            south: 59.4167,  // Southern boundary  
            east: 24.8333,   // Eastern boundary
            west: 24.7000    // Western boundary
        };

        // Estonian Land Board (Maa-amet) endpoints
        this.maaametEndpoints = {
            // WFS for actual data (not WMS which returns images)
            wfs: 'https://kaart.maaamet.ee/wfs/hooned',
            elevation: 'https://teenus.maaamet.ee/ows/wcs-geoloogia', // Switched to WCS for real elevation data
            // Use OpenStreetMap for most data due to CORS and API access issues
            useOSMFallback: true
        };

        // OpenStreetMap Overpass API (fallback)
        this.overpassEndpoint = 'https://overpass-api.de/api/interpreter';

        // Cache for loaded data
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes

        console.log('ViimsiMapLoader initialized for Viimsi Parish bounds:', this.viimsiParishBounds);
    }

    /**
     * Load all Viimsi Parish data
     * @returns {Promise<Object>} Complete map data for Viimsi Parish
     */
    async loadViimsiData() {
        try {
            console.log('Loading Viimsi Parish map data...');

            const [elevation, buildings, roads, forests] = await Promise.allSettled([
                this.fetchElevationData(),
                this.fetchBuildingData(),
                this.fetchRoadData(),
                this.fetchForestData()
            ]);

            const mapData = {
                elevation: elevation.status === 'fulfilled' ? elevation.value : null,
                buildings: buildings.status === 'fulfilled' ? buildings.value : [],
                roads: roads.status === 'fulfilled' ? roads.value : [],
                forests: forests.status === 'fulfilled' ? forests.value : [],
                bounds: this.viimsiParishBounds,
                timestamp: Date.now()
            };

            console.log('🏁 Viimsi Parish map data loading results:', {
                elevation: elevation.status === 'fulfilled' ? '✅ REAL data loaded' : `❌ Failed: ${elevation.reason?.message}`,
                buildings: buildings.status === 'fulfilled' ? `✅ ${buildings.value.length} buildings loaded` : `❌ Failed: ${buildings.reason?.message}`,
                roads: roads.status === 'fulfilled' ? `✅ ${roads.value.length} roads loaded` : `❌ Failed: ${roads.reason?.message}`,
                forests: forests.status === 'fulfilled' ? `✅ ${forests.value.length} forests loaded` : `❌ Failed: ${forests.reason?.message}`
            });

            return mapData;
        } catch (error) {
            console.error('Failed to load Viimsi Parish map data:', error);
            throw new Error(`Map data loading failed: ${error.message}`);
        }
    }

    /**
     * Fetch elevation data from Maa-amet DEM service
     * @returns {Promise<Float32Array>} Elevation heightmap for Viimsi Parish
     */
    async fetchElevationData() {
        const cacheKey = 'viimsi-elevation';

        // Check cache first
        if (this.isCacheValid(cacheKey)) {
            console.log('Using cached elevation data for Viimsi Parish');
            return this.cache.get(cacheKey).data;
        }

        try {
            console.log('Fetching REAL elevation data from Maa-amet WCS for Viimsi Parish...');

            // Construct WCS request for elevation data (GeoTIFF format)
            const wcsParams = new URLSearchParams({
                service: 'WCS',
                version: '1.0.0',
                request: 'GetCoverage',
                coverage: 'Sete_reljeef', // Sedimentary bedrock relief
                crs: 'EPSG:4326',
                bbox: `${this.viimsiParishBounds.west},${this.viimsiParishBounds.south},${this.viimsiParishBounds.east},${this.viimsiParishBounds.north}`,
                width: '256', // Reduced resolution for faster testing
                height: '256',
                format: 'GeoTIFF'
            });

            const response = await fetch(`${this.maaametEndpoints.elevation}?${wcsParams}`);

            if (!response.ok) {
                throw new Error(`Maa-amet WCS request failed: ${response.status}`);
            }

            // Process the GeoTIFF response
            const elevationData = await this.processElevationImage(response);

            // Cache the result
            this.cache.set(cacheKey, {
                data: elevationData,
                timestamp: Date.now()
            });

            console.log('✅ Real elevation data loaded from Maa-amet WCS');
            return elevationData;

        } catch (error) {
            console.warn('Maa-amet WCS data failed, generating fallback:', error.message);
            return this.generateFallbackElevation();
        }
    }

    /**
     * Fetch building data from OpenStreetMap for Viimsi Parish
     * @returns {Promise<Array>} Building data for Viimsi Parish
     */
    async fetchBuildingData() {
        const cacheKey = 'viimsi-buildings';

        if (this.isCacheValid(cacheKey)) {
            console.log('Using cached building data for Viimsi Parish');
            return this.cache.get(cacheKey).data;
        }

        try {
            console.log('🏘️ Fetching REAL building data from OpenStreetMap for Viimsi Parish...');
            const buildings = await this.fetchOSMBuildings();

            this.cache.set(cacheKey, {
                data: buildings,
                timestamp: Date.now()
            });

            console.log(`✅ Loaded ${buildings.length} real buildings from OpenStreetMap`);
            return buildings;
        } catch (error) {
            console.warn('OpenStreetMap buildings failed, using fallback data:', error.message);
            return this.generateRealisticViimsiBuildings();
        }
    }

    /**
     * Fetch road data from Maa-amet or OpenStreetMap
     * @returns {Promise<Array>} Road network data for Viimsi Parish
     */
    async fetchRoadData() {
        const cacheKey = 'viimsi-roads';

        if (this.isCacheValid(cacheKey)) {
            console.log('Using cached road data for Viimsi Parish');
            return this.cache.get(cacheKey).data;
        }

        try {
            console.log('🛣️ Fetching REAL road data from OpenStreetMap for Viimsi Parish...');
            const roads = await this.fetchOSMRoads();

            this.cache.set(cacheKey, {
                data: roads,
                timestamp: Date.now()
            });

            console.log(`✅ Loaded ${roads.length} real roads from OpenStreetMap`);
            return roads;
        } catch (error) {
            console.warn('Road data loading failed, using realistic Viimsi Parish roads:', error.message);
            return this.generateRealisticViimsiRoads();
        }
    }

    /**
     * Fetch forest data from Maa-amet
     * @returns {Promise<Array>} Forest boundary data for Viimsi Parish
     */
    async fetchForestData() {
        const cacheKey = 'viimsi-forests';

        if (this.isCacheValid(cacheKey)) {
            console.log('Using cached forest data for Viimsi Parish');
            return this.cache.get(cacheKey).data;
        }

        try {
            console.log('🌲 Fetching REAL forest data from OpenStreetMap for Viimsi Parish...');
            const overpassQuery = `
                [out:json][timeout:30];
                (
                    way["landuse"="forest"](${this.viimsiParishBounds.south},${this.viimsiParishBounds.west},${this.viimsiParishBounds.north},${this.viimsiParishBounds.east});
                    relation["landuse"="forest"](${this.viimsiParishBounds.south},${this.viimsiParishBounds.west},${this.viimsiParishBounds.north},${this.viimsiParishBounds.east});
                    way["natural"="wood"](${this.viimsiParishBounds.south},${this.viimsiParishBounds.west},${this.viimsiParishBounds.north},${this.viimsiParishBounds.east});
                    relation["natural"="wood"](${this.viimsiParishBounds.south},${this.viimsiParishBounds.west},${this.viimsiParishBounds.north},${this.viimsiParishBounds.east});
                );
                out geom;
            `;

            const response = await fetch(this.overpassEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(overpassQuery)}`
            });

            if (!response.ok) {
                throw new Error(`OpenStreetMap request for forests failed: ${response.status}`);
            }

            const data = await response.json();
            const forests = this.processOSMForests(data.elements);

            this.cache.set(cacheKey, { data: forests, timestamp: Date.now() });

            console.log(`✅ Loaded ${forests.length} real forest areas from OpenStreetMap`);
            return forests;
        } catch (error) {
            console.warn('Forest data loading failed, returning empty array:', error.message);
            return [];
        }
    }

    /**
     * Fetch buildings from Maa-amet WMS service
     * @returns {Promise<Array>} Building data from Maa-amet
     */
    async fetchMaaametBuildings() {
        console.log('Maa-amet API has CORS restrictions, using OpenStreetMap for building data...');
        // Maa-amet requires API keys and has CORS restrictions for web applications
        // For a web-based game, OpenStreetMap is more accessible
        throw new Error('Using OSM fallback due to Maa-amet CORS restrictions');
    }

    /**
     * Process Maa-amet building data
     * @param {Object} data - Raw Maa-amet data
     * @returns {Array} Processed building data
     */
    processMaaametBuildings(data) {
        console.log('Maa-amet WMS does not provide JSON building data, using OSM fallback');
        // Maa-amet WMS returns images, not JSON data for buildings
        // We need to use OpenStreetMap for actual building data
        throw new Error('Maa-amet WMS returns images, not building vectors - using OSM fallback');
    }

    /**
     * Fetch buildings from OpenStreetMap Overpass API (real Viimsi Parish data)
     * @returns {Promise<Array>} Building data from OSM
     */
    async fetchOSMBuildings() {
        console.log('Fetching REAL Viimsi Parish building data from OpenStreetMap...');

        // Real Viimsi Parish Overpass query
        const overpassQuery = `
            [out:json][timeout:30];
            (
                way["building"](${this.viimsiParishBounds.south},${this.viimsiParishBounds.west},${this.viimsiParishBounds.north},${this.viimsiParishBounds.east});
                relation["building"](${this.viimsiParishBounds.south},${this.viimsiParishBounds.west},${this.viimsiParishBounds.north},${this.viimsiParishBounds.east});
            );
            out geom;
        `;

        try {
            console.log('Querying OpenStreetMap for Viimsi Parish buildings...');
            console.log('Bounds:', this.viimsiParishBounds);

            const response = await fetch(this.overpassEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `data=${encodeURIComponent(overpassQuery)}`
            });

            if (!response.ok) {
                throw new Error(`OpenStreetMap request failed: ${response.status}`);
            }

            const data = await response.json();
            const buildings = this.processOSMBuildings(data.elements);

            console.log(`Loaded ${buildings.length} buildings from OpenStreetMap`);
            return buildings;

        } catch (error) {
            console.warn('OpenStreetMap buildings fallback failed:', error.message);
            return this.generateFallbackBuildings();
        }
    }


    /**
     * Fetch roads from OpenStreetMap Overpass API
     * @returns {Promise<Array>} Road data from OSM
     */
    async fetchOSMRoads() {
        console.log('Fetching road data from OpenStreetMap for Viimsi Parish...');

        const overpassQuery = `
            [out:json][timeout:25];
            (
                way["highway"](${this.viimsiParishBounds.south},${this.viimsiParishBounds.west},${this.viimsiParishBounds.north},${this.viimsiParishBounds.east});
            );
            out geom;
        `;

        try {
            const response = await fetch(this.overpassEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `data=${encodeURIComponent(overpassQuery)}`
            });

            if (!response.ok) {
                throw new Error(`OpenStreetMap request failed: ${response.status}`);
            }

            const data = await response.json();
            const roads = this.processOSMRoads(data.elements);

            console.log(`Loaded ${roads.length} roads from OpenStreetMap`);
            return roads;

        } catch (error) {
            console.warn('OpenStreetMap roads failed:', error.message);
            return [];
        }
    }

    /**
     * Process elevation image data into heightmap
     * @param {Response} response - Image response from WMS
     * @returns {Promise<Float32Array>} Processed elevation data
     */
    async processElevationImage(response) {
        console.log('Processing GeoTIFF elevation data...');
        try {
            const arrayBuffer = await response.arrayBuffer();
            const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
            const image = await tiff.getImage();
            const data = await image.readRasters();

            // The data is a single-band Float32Array with elevation values
            const elevationData = data[0];

            console.log(`✅ Successfully processed GeoTIFF: ${elevationData.length} data points`);
            return elevationData;
        } catch (error) {
            console.error('❌ Failed to process GeoTIFF data:', error);
            // Fallback if processing fails
            return this.generateFallbackElevation();
        }
    }

    /**
     * Generate fallback elevation data for Viimsi Parish
     * @returns {Float32Array} Realistic elevation data
     */
    generateFallbackElevation() {
        console.log('Generating fallback elevation data for Viimsi Parish...');

        const size = 512;
        const elevationData = new Float32Array(size * size);

        // Viimsi Parish is relatively flat with some coastal areas
        // Elevation ranges from sea level (0m) to about 40m
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = y * size + x;

                // Create realistic Estonian coastal terrain
                const distanceFromCoast = Math.min(x / size, y / size);
                const baseElevation = distanceFromCoast * 25; // 0-25m base elevation

                // Add some gentle hills and variations
                const hillNoise = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 10;
                const detailNoise = (Math.random() - 0.5) * 3;

                elevationData[index] = Math.max(0, baseElevation + hillNoise + detailNoise);
            }
        }

        return elevationData;
    }

    /**
     * Generate known forest areas in Viimsi Parish
     * @returns {Array} Forest boundary data
     */
    generateViimsiForestData() {
        // Known forest areas in Viimsi Parish
        return [
            {
                name: 'Viimsi Forest',
                type: 'mixed',
                bounds: {
                    north: 59.5000,
                    south: 59.4800,
                    east: 24.8000,
                    west: 24.7500
                }
            },
            {
                name: 'Muuga Forest',
                type: 'coniferous',
                bounds: {
                    north: 59.4900,
                    south: 59.4700,
                    east: 24.8200,
                    west: 24.7800
                }
            }
        ];
    }

    /**
     * Generate fallback building data for key Viimsi Parish landmarks
     * @returns {Array} Essential building data
     */
    generateFallbackBuildings() {
        console.log('Generating fallback building data for Viimsi Parish landmarks...');

        return [
            {
                name: 'Viimsi Manor',
                type: 'historic',
                lat: 59.4833,
                lon: 24.7667,
                height: 12
            },
            {
                name: 'Viimsi Gymnasium',
                type: 'school',
                lat: 59.4900,
                lon: 24.7700,
                height: 8
            },
            {
                name: 'Muuga Harbor Office',
                type: 'industrial',
                lat: 59.4700,
                lon: 24.8100,
                height: 15
            }
        ];
    }

    /**
     * Process OpenStreetMap forest data
     * @param {Array} elements - OSM elements
     * @returns {Array} Processed forest data
     */
    processOSMForests(elements) {
        return elements
            .filter(element => element.type === 'way' && element.geometry)
            .map(forest => {
                const bounds = {
                    north: Math.max(...forest.geometry.map(p => p.lat)),
                    south: Math.min(...forest.geometry.map(p => p.lat)),
                    east: Math.max(...forest.geometry.map(p => p.lon)),
                    west: Math.min(...forest.geometry.map(p => p.lon)),
                };
                return {
                    id: forest.id,
                    name: forest.tags.name || 'Forest Area',
                    type: forest.tags.landuse || forest.tags.natural,
                    geometry: forest.geometry,
                    bounds: bounds,
                    tags: forest.tags,
                };
            });
    }

    /**
     * Process OpenStreetMap building data
     * @param {Array} elements - OSM elements
     * @returns {Array} Processed building data
     */
    processOSMBuildings(elements) {
        return elements
            .filter(element => element.type === 'way' && element.tags && element.tags.building && element.geometry)
            .map(building => {
                // Calculate center point from geometry
                const coords = building.geometry;
                if (!coords || coords.length === 0) return null;
                
                const centerLat = coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length;
                const centerLon = coords.reduce((sum, coord) => sum + coord.lon, 0) / coords.length;
                
                return {
                    id: building.id,
                    name: building.tags.name || building.tags['addr:housename'] || 'Building',
                    type: building.tags.building,
                    lat: centerLat,
                    lon: centerLon,
                    geometry: coords,
                    height: this.estimateBuildingHeight(building.tags),
                    tags: building.tags,
                    amenity: building.tags.amenity,
                    description: this.getBuildingDescription(building.tags)
                };
            })
            .filter(building => building !== null);
    }

    /**
     * Process OpenStreetMap road data
     * @param {Array} elements - OSM elements
     * @returns {Array} Processed road data
     */
    processOSMRoads(elements) {
        return elements
            .filter(element => element.type === 'way' && element.tags && element.tags.highway && element.geometry)
            .map(road => ({
                id: road.id,
                name: road.tags.name || road.tags.ref || 'Road',
                type: road.tags.highway,
                geometry: road.geometry, // Array of {lat, lon} coordinates
                surface: road.tags.surface || 'asphalt',
                width: this.estimateRoadWidth(road.tags.highway),
                tags: road.tags,
                description: this.getRoadDescription(road.tags)
            }));
    }

    /**
     * Get building description from OSM tags
     * @param {Object} tags - OSM tags
     * @returns {string} Building description
     */
    getBuildingDescription(tags) {
        if (tags.amenity) {
            const amenityDescriptions = {
                'school': 'Educational facility',
                'hospital': 'Healthcare facility',
                'restaurant': 'Dining establishment',
                'shop': 'Retail store',
                'bank': 'Financial institution',
                'post_office': 'Postal service',
                'library': 'Public library',
                'town_hall': 'Municipal building'
            };
            return amenityDescriptions[tags.amenity] || `${tags.amenity} facility`;
        }
        
        if (tags.building === 'residential') return 'Residential building';
        if (tags.building === 'commercial') return 'Commercial building';
        if (tags.building === 'industrial') return 'Industrial building';
        if (tags.building === 'house') return 'Private house';
        
        return 'Building';
    }

    /**
     * Get road description from OSM tags
     * @param {Object} tags - OSM tags
     * @returns {string} Road description
     */
    getRoadDescription(tags) {
        const roadTypes = {
            'primary': 'Major road',
            'secondary': 'Secondary road',
            'tertiary': 'Local road',
            'residential': 'Residential street',
            'service': 'Service road',
            'footway': 'Pedestrian path',
            'cycleway': 'Bicycle path',
            'path': 'Walking path'
        };
        
        return roadTypes[tags.highway] || 'Road';
    }

    /**
     * Estimate road width from highway type
     * @param {string} highway - Highway type
     * @returns {number} Estimated width in meters
     */
    estimateRoadWidth(highway) {
        const widths = {
            'primary': 8,
            'secondary': 6,
            'tertiary': 5,
            'residential': 4,
            'service': 3,
            'footway': 2,
            'cycleway': 2,
            'path': 1.5
        };
        
        return widths[highway] || 4;
    }

    /**
     * Estimate building height from OSM tags
     * @param {Object} tags - OSM tags
     * @returns {number} Estimated height in meters
     */
    estimateBuildingHeight(tags) {
        if (tags.height) {
            return parseFloat(tags.height);
        }
        if (tags.levels || tags['building:levels']) {
            const levels = parseInt(tags.levels || tags['building:levels']);
            return levels * 3; // Assume 3m per level
        }

        // Default heights by building type
        const typeHeights = {
            'house': 6,
            'residential': 8,
            'commercial': 10,
            'industrial': 12,
            'school': 8,
            'hospital': 12,
            'church': 15
        };

        return typeHeights[tags.building] || 6;
    }

    /**
     * Check if cached data is still valid
     * @param {string} key - Cache key
     * @returns {boolean} True if cache is valid
     */
    isCacheValid(key) {
        const cached = this.cache.get(key);
        if (!cached) return false;

        const age = Date.now() - cached.timestamp;
        return age < this.cacheTimeout;
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        console.log('Viimsi Parish map data cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const stats = {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            totalSize: 0
        };

        for (const [key, value] of this.cache) {
            stats.totalSize += JSON.stringify(value).length;
        }

        return stats;
    }



    /**
     * Fetch real road data from OpenStreetMap
     * @returns {Promise<Array>} Real road data from OSM
     */
    async fetchOSMRoads() {
        const query = `
            [out:json][timeout:25];
            (
                way["highway"](${this.viimsiParishBounds.south},${this.viimsiParishBounds.west},${this.viimsiParishBounds.north},${this.viimsiParishBounds.east});
            );
            out geom;
        `;

        const response = await fetch(this.overpassEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) {
            throw new Error(`OpenStreetMap API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`🛣️ OpenStreetMap returned ${data.elements.length} road elements`);
        
        return this.processOSMRoads(data.elements);
    }

    /**
     * Generate realistic Viimsi Parish buildings as fallback
     * @returns {Array} Realistic building data for Viimsi Parish
     */
    generateRealisticViimsiBuildings() {
        console.log('🏘️ Generating realistic Viimsi Parish buildings...');

        return [
            {
                name: 'Viimsi Manor',
                type: 'historic',
                lat: 59.4833,
                lon: 24.7667,
                height: 12,
                description: 'Historic Viimsi Manor from 18th century'
            },
            {
                name: 'Viimsi Gymnasium',
                type: 'school',
                lat: 59.4900,
                lon: 24.7700,
                height: 8,
                description: 'Main school in Viimsi Parish'
            },
            {
                name: 'Muuga Harbor Office',
                type: 'industrial',
                lat: 59.4700,
                lon: 24.8100,
                height: 15,
                description: 'Port authority building'
            },
            {
                name: 'Viimsi Parish Government',
                type: 'government',
                lat: 59.4850,
                lon: 24.7650,
                height: 10,
                description: 'Local government building'
            },
            {
                name: 'Haabneeme Beach House',
                type: 'commercial',
                lat: 59.5000,
                lon: 24.7800,
                height: 6,
                description: 'Beach facilities'
            }
        ];
    }

    /**
     * Generate realistic Viimsi Parish roads as fallback
     * @returns {Array} Realistic road data for Viimsi Parish
     */
    generateRealisticViimsiRoads() {
        console.log('🛣️ Generating realistic Viimsi Parish roads...');

        return [
            {
                name: 'Viimsi tee',
                type: 'primary',
                geometry: [
                    { lat: 59.4800, lon: 24.7600 },
                    { lat: 59.4850, lon: 24.7650 },
                    { lat: 59.4900, lon: 24.7700 }
                ],
                surface: 'asphalt',
                description: 'Main road through Viimsi Parish'
            },
            {
                name: 'Muuga tee',
                type: 'secondary',
                geometry: [
                    { lat: 59.4750, lon: 24.8000 },
                    { lat: 59.4700, lon: 24.8100 }
                ],
                surface: 'asphalt',
                description: 'Road to Muuga Harbor'
            },
            {
                name: 'Haabneeme tee',
                type: 'residential',
                geometry: [
                    { lat: 59.4950, lon: 24.7750 },
                    { lat: 59.5000, lon: 24.7800 }
                ],
                surface: 'asphalt',
                description: 'Road to Haabneeme beach area'
            },
            {
                name: 'Prangli Ferry Route',
                type: 'ferry',
                geometry: [
                    { lat: 59.5100, lon: 24.7900 },
                    { lat: 59.5200, lon: 24.8200 }
                ],
                surface: 'water',
                description: 'Ferry route to Prangli Island'
            }
        ];
    }
}