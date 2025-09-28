# Map Integration Module

This module handles integration with Estonian map data sources for Viimsi Parish:

- `ViimsiMapLoader.js` - Main map data loading class
- `TerrainGenerator.js` - Terrain mesh generation from elevation data
- `LandmarkLoader.js` - Loading of key Viimsi Parish landmarks
- `MapDataCache.js` - Caching system for map data

## Data Sources

- Estonian Land Board (Maa-amet) WMS services
- OpenStreetMap Overpass API (fallback)
- Estonian DEM elevation data
- Estonian Address Data System (EHAK)