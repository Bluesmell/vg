export const fromArrayBuffer = jest.fn().mockResolvedValue({
    getImage: jest.fn().mockResolvedValue({
        readRasters: jest.fn().mockResolvedValue([new Float32Array([10, 20, 30, 40])]),
    }),
});