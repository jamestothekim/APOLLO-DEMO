// Demo user credentials
export const DEMO_CREDENTIALS = {
  email: 'demo@apollo.com',
  password: 'demo123',
  // Alternative credentials for testing
  admin: {
    email: 'admin@apollo.com', 
    password: 'admin123'
  }
};

// Utility to simulate API response delay
export const simulateApiDelay = (minMs: number = 300, maxMs: number = 800): Promise<void> => {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Utility to create fake JWT token
export const createDemoToken = (userId: number = 10): string => {
  // Create a realistic-looking but non-functional JWT token for demo
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    id: userId, 
    email: 'demo@apollo.com', 
    role: 'Market Manager',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }));
  const signature = 'demo_signature_not_real';
  return `${header}.${payload}.${signature}`;
}; 