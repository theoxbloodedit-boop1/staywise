import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

// Local signed JWTs and a real local JWKS endpoint. No Neon credentials used.
export async function createJwtFixture() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const server = createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No test port');
  const issuer = `http://127.0.0.1:${address.port}`;
  return {
    issuer,
    sign: (claims: Record<string, unknown> = {}, sub = 'auth-a') => new SignJWT({ email: 'a@example.test', email_verified: true, aud: 'staywise-test', ...claims }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject(sub).setIssuer(issuer).setIssuedAt().setExpirationTime(typeof claims.exp === 'number' ? claims.exp : '5m').sign(privateKey),
    close: () => new Promise<void>((resolve, reject) => { server.close(e => e ? reject(e) : resolve()); server.closeAllConnections(); }),
  };
}
