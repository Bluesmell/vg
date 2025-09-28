# Viimsi Parish 3D Game

A web-based 3D open-world survival/adventure game set in Viimsi Parish, Estonia. Experience authentic Estonian geography, culture, and folklore in an immersive 3D environment.

## Features

- **Realistic Geography**: Accurate representation of Viimsi Parish using Estonian Land Board data
- **Estonian Culture**: Local landmarks, language, and traditions
- **Survival Mechanics**: Weather, day/night cycles, and resource management
- **Fantasy Elements**: Estonian folklore creatures and mythical encounters
- **Economic System**: Euro-based trading with local businesses
- **Educational Content**: Learn about Viimsi Parish history and culture

## Key Locations

- Viimsi Manor (historical landmark)
- Prangli Island (accessible by boat)
- Muuga Harbor (industrial hub)
- Viimsi Peninsula beaches and cliffs
- RMK forests and nature trails
- Local settlements: Viimsi center, Haabneeme, Muuga, Randvere

## Technology Stack

- **3D Engine**: Three.js
- **Physics**: Cannon.js
- **UI Framework**: React.js
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Testing**: Jest

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd viimsi-3d-game

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run test     # Run tests
```

## Project Structure

```
viimsi-3d-game/
├── src/
│   ├── core/           # Game engine and core systems
│   ├── map/            # Estonian map integration
│   ├── entities/       # Players, NPCs, creatures
│   ├── economy/        # Trading and crafting systems
│   ├── audio/          # Estonian sounds and music
│   ├── ui/             # React interface components
│   └── styles/         # CSS and styling
├── assets/
│   ├── models/         # 3D models
│   ├── textures/       # Materials and textures
│   └── sounds/         # Audio files
└── data/
    ├── maps/           # Processed map data
    └── quests/         # Story and mission data
```

## Controls

- **WASD**: Movement
- **Mouse**: Look around
- **E**: Interact
- **Tab**: Inventory
- **M**: Map
- **Shift**: Sprint
- **Ctrl**: Crouch

## Cultural Authenticity

This game respectfully represents Estonian culture and geography:

- Accurate Viimsi Parish topography from official Estonian sources
- Estonian language support with proper translations
- Historical information about local landmarks
- Traditional Estonian folklore and mythology
- Realistic representation of local businesses and economy

## Contributing

Please ensure all contributions maintain cultural accuracy and respect for Estonian heritage.

## License

MIT License - See LICENSE file for details

---

*Tere tulemast Viimsi valda!* (Welcome to Viimsi Parish!)