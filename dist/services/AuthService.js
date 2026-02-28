"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Simple in-memory authentication service.
 * In production, use a real database and OAuth/OpenID Connect.
 */
class AuthService {
    constructor(secret) {
        this.users = new Map();
        this.secret = secret || process.env.JWT_SECRET || 'dev-secret-key-change-me';
    }
    userCount() {
        return this.users.size;
    }
    /**
     * If there are no users yet, create a default admin account and return its
     * credentials.  Otherwise returns null.
     */
    seedAdmin(username = 'admin', password = 'admin') {
        if (this.userCount() === 0) {
            return this.register(username, password);
        }
        return null;
    }
    register(username, password) {
        // Check if user exists
        const existing = Array.from(this.users.values()).find((u) => u.username === username);
        if (existing) {
            throw new Error('User already exists');
        }
        const userId = crypto_1.default.randomUUID();
        const passwordHash = this.hashPassword(password);
        // first registered user becomes admin automatically
        const role = this.users.size === 0 ? 'admin' : 'user';
        this.users.set(userId, { id: userId, username, passwordHash, role });
        const token = this.generateToken(userId, username, role);
        return { userId, token, role };
    }
    login(username, password) {
        const user = Array.from(this.users.values()).find((u) => u.username === username);
        if (!user || !this.verifyPassword(password, user.passwordHash)) {
            throw new Error('Invalid username or password');
        }
        const token = this.generateToken(user.id, user.username, user.role);
        return { userId: user.id, token, role: user.role };
    }
    verifyToken(token) {
        try {
            // Simple JWT-like verification (in production use jsonwebtoken library)
            const [header, payload, signature] = token.split('.');
            if (!header || !payload || !signature) {
                throw new Error('Invalid token format');
            }
            const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
            const expectedSignature = this.sign(header + '.' + payload);
            if (signature !== expectedSignature) {
                throw new Error('Invalid signature');
            }
            return decoded;
        }
        catch (e) {
            throw new Error('Token verification failed');
        }
    }
    generateToken(userId, username, role = 'user') {
        const payload = {
            userId,
            username,
            role,
            iat: Date.now(),
        };
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
        const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
        const signature = this.sign(header + '.' + payloadStr);
        return `${header}.${payloadStr}.${signature}`;
    }
    sign(data) {
        return crypto_1.default.createHmac('sha256', this.secret).update(data).digest('hex').slice(0, 43);
    }
    hashPassword(password) {
        return crypto_1.default.createHash('sha256').update(password + this.secret).digest('hex');
    }
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }
}
exports.AuthService = AuthService;
