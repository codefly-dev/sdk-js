export class RouteNotFoundError extends Error {
    constructor(method: string, path: string) {
        super(`Route not found: ${method} ${path}`);
        this.name = 'RouteNotFoundError';
    }
} 