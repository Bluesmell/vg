// Jest setup file for Viimsi Parish 3D Game tests

// Mock Three.js for testing
global.THREE = {
  WebGLRenderer: jest.fn(),
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    traverse: jest.fn()
  })),
  PerspectiveCamera: jest.fn(),
  Clock: jest.fn(() => ({
    getDelta: jest.fn(() => 0.016)
  })),
  Vector3: jest.fn(),
  Euler: jest.fn(),
  Color: jest.fn(),
  Fog: jest.fn(),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(),
  PlaneGeometry: jest.fn(),
  MeshLambertMaterial: jest.fn(),
  MeshBasicMaterial: jest.fn(),
  BoxGeometry: jest.fn(),
  SphereGeometry: jest.fn(),
  CylinderGeometry: jest.fn(),
  Mesh: jest.fn()
};

// Mock Cannon.js for testing
global.CANNON = {
  World: jest.fn(() => ({
    addBody: jest.fn(),
    removeBody: jest.fn(),
    addContactMaterial: jest.fn(),
    step: jest.fn(),
    bodies: [],
    defaultContactMaterial: {
      friction: 0,
      restitution: 0
    }
  })),
  Vec3: jest.fn(),
  Plane: jest.fn(),
  Body: jest.fn(() => ({
    position: { x: 0, y: 5, z: 10, copy: jest.fn(), set: jest.fn() },
    velocity: { x: 0, y: 0, z: 0 },
    force: { x: 0, y: 0, z: 0 },
    mass: 70,
    fixedRotation: false,
    updateMassProperties: jest.fn(),
    addShape: jest.fn(),
    addEventListener: jest.fn()
  })),
  Material: jest.fn(),
  ContactMaterial: jest.fn(),
  SAPBroadphase: jest.fn(),
  NaiveBroadphase: jest.fn(),
  Sphere: jest.fn(),
  Cylinder: jest.fn(),
  Box: jest.fn(),
  Shape: {
    types: {
      PLANE: 1,
      BOX: 2,
      SPHERE: 4,
      CYLINDER: 8
    }
  }
};

// Mock DOM elements
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn(cb => setTimeout(cb, 16))
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: jest.fn()
});

// Mock canvas context
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn()
}));

console.log('Viimsi Parish 3D Game test environment initialized');