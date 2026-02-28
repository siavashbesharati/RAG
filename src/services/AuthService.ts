import crypto from 'crypto';

interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
}

interface TokenPayload {
  userId: string;
  username: string;
  role: 'user' | 'admin';
  iat: number;
}

/**
 * Simple in-memory authentication service.
 * In production, use a real database and OAuth/OpenID Connect.
 */
export class AuthService {
  private users = new Map<string, User>();
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.JWT_SECRET || 'dev-secret-key-change-me';
  }

  public userCount(): number {
    return this.users.size;
  }

  /**
   * If there are no users yet, create a default admin account and return its
   * credentials.  Otherwise returns null.
   */
  public seedAdmin(username = 'admin', password = 'admin'):
    | { userId: string; token: string; role: 'user' | 'admin' }
    | null {
    if (this.userCount() === 0) {
      return this.register(username, password);
    }
    return null;
  }

  public register(username: string, password: string): { userId: string; token: string; role: 'user' | 'admin' } {
    // Check if user exists
    const existing = Array.from(this.users.values()).find((u) => u.username === username);
    if (existing) {
      throw new Error('User already exists');
    }

    const userId = crypto.randomUUID();
    const passwordHash = this.hashPassword(password);
    // first registered user becomes admin automatically
    const role: 'user' | 'admin' = this.users.size === 0 ? 'admin' : 'user';
    this.users.set(userId, { id: userId, username, passwordHash, role });

    const token = this.generateToken(userId, username, role);
    return { userId, token, role };
  }

  public login(username: string, password: string): { userId: string; token: string; role: 'user' | 'admin' } {
    const user = Array.from(this.users.values()).find((u) => u.username === username);
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new Error('Invalid username or password');
    }

    const token = this.generateToken(user.id, user.username, user.role);
    return { userId: user.id, token, role: user.role };
  }

  public verifyToken(token: string): TokenPayload {
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
    } catch (e) {
      throw new Error('Token verification failed');
    }
  }

  private generateToken(userId: string, username: string, role: 'user' | 'admin' = 'user'): string {
    const payload: TokenPayload = {
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

  private sign(data: string): string {
    return crypto.createHmac('sha256', this.secret).update(data).digest('hex').slice(0, 43);
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password + this.secret).digest('hex');
  }

  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }
}
