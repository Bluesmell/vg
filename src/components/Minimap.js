import React from 'react';
import './Minimap.css';

const Minimap = ({ playerPosition, playerRotation, worldBounds }) => {
    // Map dimensions - adjusted to better match the aspect ratio of the map image
    const mapDimensions = { width: 200, height: 150 };

    // Convert world coordinates to map coordinates using dynamic bounds
    let mapX = ((playerPosition.x - worldBounds.minX) / (worldBounds.maxX - worldBounds.minX)) * mapDimensions.width;
    let mapY = ((playerPosition.z - worldBounds.minZ) / (worldBounds.maxZ - worldBounds.minZ)) * mapDimensions.height;

    // Clamp values to ensure the marker stays within the minimap boundaries
    mapX = Math.max(0, Math.min(mapDimensions.width, mapX));
    mapY = Math.max(0, Math.min(mapDimensions.height, mapY));

    // Player marker style - rotation is negated to match camera movement
    const markerStyle = {
        left: `${mapX}px`,
        top: `${mapY}px`,
        transform: `translate(-50%, -50%) rotate(${-playerRotation.y}rad)`
    };

    return (
        <div className="minimap-container" style={{ width: mapDimensions.width, height: mapDimensions.height }}>
            <div className="minimap-player" style={markerStyle}></div>
        </div>
    );
};

export default Minimap;