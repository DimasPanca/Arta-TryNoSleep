import express from 'express';
import cors from 'cors';
import { Gateway, Wallets, DefaultEventHandlerStrategies } from 'fabric-network';
import path from 'path';

// ── Tenant Configuration ──────────────────────────────────────
const BASE_CRYPTO = process.env.CRYPTO_PATH
  ? path.resolve(process.env.CRYPTO_PATH)
  : path.resolve(__dirname, '..', '..', 'network', 'crypto-config', 'peerOrganizations');

const PORT = parseInt(process.env.PORT || '4000', 10);

interface TenantConfig {
  mspId: string;
  domain: string;
  peerEndpoint: string;
}

const TENANTS: Record<string, TenantConfig> = {
  padiwangi:    { mspId: 'PadiwangiMSP',    domain: 'padiwangi.arta.com',    peerEndpoint: 'peer0.padiwangi.arta.com:7051' },
  melatijaya:   { mspId: 'MelatiJayaMSP',   domain: 'melatijaya.arta.com',   peerEndpoint: 'peer0.melatijaya.arta.com:8051' },
  sumbermakmur: { mspId: 'SumberMakmurMSP', domain: 'sumbermakmur.arta.com', peerEndpoint: 'peer0.sumbermakmur.arta.com:9051' },
  tirtabersama: { mspId: 'TirtaBersamaMSP', domain: 'tirtabersama.arta.com', peerEndpoint: 'peer0.tirtabersama.arta.com:10051' },
  harapanbaru:  { mspId: 'HarapanBaruMSP',  domain: 'harapanbaru.arta.com',  peerEndpoint: 'peer0.harapanbaru.arta.com:11051' },
  dinas:        { mspId: 'DinasMSP',        domain: 'dinas.arta.com',        peerEndpoint: 'peer0.dinas.arta.com:12051' },
};

// Allow overriding peer endpoints via env vars, e.g. PEER_PADIWANGI_ENDPOINT
for (const tenantId of Object.keys(TENANTS)) {
  const envKey = `PEER_${tenantId.toUpperCase()}_ENDPOINT`;
  if (process.env[envKey]) {
    TENANTS[tenantId].peerEndpoint = process.env[envKey]!;
  }
}

// ── Connection Profile Builder ─────────────────────────────────
function buildConnectionProfile(tenant: TenantConfig): Record<string, any> {
  return {
    name: `arta-${tenant.mspId}`,
    version: '1.0.0',
    client: {
      organization: tenant.mspId,
      connection: {
        timeout: {
          peer: { endorser: '300', eventHub: '300', eventReg: '300' },
          orderer: '300',
        },
      },
    },
    channels: {
      'arta-channel': {
        orderers: ['orderer.example.com'],
        peers: {
          [tenant.peerEndpoint]: {
            endorsingPeer: true,
            chaincodeQuery: true,
            ledgerQuery: true,
            eventSource: true,
          },
        },
      },
    },
    organizations: {
      [tenant.mspId]: {
        mspid: tenant.mspId,
        peers: [tenant.peerEndpoint],
        certificateAuthorities: [],
      },
    },
    orderers: {
      'orderer.example.com': {
        url: `grpc://orderer.example.com:7050`,
      },
    },
    peers: {
      [tenant.peerEndpoint]: {
        url: `grpc://${tenant.peerEndpoint}`,
      },
    },
  };
}

// ── Gateway Cache ──────────────────────────────────────────────
const gatewayCache = new Map<string, Gateway>();

async function getGateway(tenantId: string): Promise<Gateway> {
  const cached = gatewayCache.get(tenantId);
  if (cached) return cached;

  const tenant = TENANTS[tenantId];
  if (!tenant) throw new Error(`Unknown tenant: ${tenantId}. Available: ${Object.keys(TENANTS).sort().join(', ')}`);

  // Build connection profile
  const ccp = buildConnectionProfile(tenant);

  // Create a wallet from the admin's crypto material
  const wallet = await Wallets.newInMemoryWallet();
  const cryptoPath = path.resolve(BASE_CRYPTO, tenant.domain, 'users', `Admin@${tenant.domain}`, 'msp');

  const fs = await import('fs');
  const certDir = path.resolve(cryptoPath, 'signcerts');
  const certFile = fs.readdirSync(certDir)[0];
  const certificate = fs.readFileSync(path.resolve(certDir, certFile), 'utf8');

  const keyDir = path.resolve(cryptoPath, 'keystore');
  const keyFile = fs.readdirSync(keyDir)[0];
  const privateKey = fs.readFileSync(path.resolve(keyDir, keyFile), 'utf8');

  const identity = {
    credentials: { certificate, privateKey },
    mspId: tenant.mspId,
    type: 'X.509',
  };

  await wallet.put(`admin-${tenantId}`, identity);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: `admin-${tenantId}`,
    discovery: { enabled: false, asLocalhost: false },
    eventHandlerOptions: {
      endorseTimeout: 300,
      commitTimeout: 300,
      strategy: DefaultEventHandlerStrategies.MSPID_SCOPE_ALLFORTX,
    },
  });

  gatewayCache.set(tenantId, gateway);
  return gateway;
}

async function getContract(tenantId: string, chaincodeName: string) {
  const gateway = await getGateway(tenantId);
  const network = await gateway.getNetwork('arta-channel');
  return network.getContract(chaincodeName);
}

// ── Request Handler ────────────────────────────────────────────
function createHandler(defaultTenantId: string) {
  return async (req: express.Request, res: express.Response): Promise<void> => {
    let tenantId = defaultTenantId;
    try {
      const { channelid, chaincodeid, function: funcName, args, tenantId: bodyTenant } = req.body;
      tenantId = bodyTenant || defaultTenantId;

      if (!TENANTS[tenantId]) {
        res.status(404).json({ error: `Unknown tenant: ${tenantId}. Available: ${Object.keys(TENANTS).sort().join(', ')}` });
        return;
      }
      if (channelid !== 'arta-channel') {
        res.status(400).json({ error: 'channelid tidak valid, harus arta-channel' });
        return;
      }
      if (!chaincodeid || typeof chaincodeid !== 'string') {
        res.status(400).json({ error: 'chaincodeid wajib diisi' });
        return;
      }
      if (!funcName || typeof funcName !== 'string') {
        res.status(400).json({ error: 'function wajib diisi' });
        return;
      }

      const isEvaluate = req.path.endsWith('/evaluate');
      const mode = isEvaluate ? 'QUERY' : 'INVOKE';

      console.log(`[${tenantId}] ${mode} ${chaincodeid}.${funcName} args=${JSON.stringify(args)}`);

      const contract = await getContract(tenantId, chaincodeid);
      const callArgs = Array.isArray(args) ? args : [];

      const resultBytes = isEvaluate
        ? await contract.evaluateTransaction(funcName, ...callArgs)
        : await contract.submitTransaction(funcName, ...callArgs);

      const resultStr = Buffer.from(resultBytes).toString('utf8');

      try {
        res.json(JSON.parse(resultStr));
      } catch {
        res.json({ result: resultStr });
      }
    } catch (error: any) {
      console.error(`[${tenantId}][ERROR] ${error.message}`);
      const status = error.message?.includes('not found') || error.message?.includes('Unknown') ? 404 : 500;
      res.status(status).json({ error: error.message || 'Internal server error' });
    }
  };
}

// ── Express App ───────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    tenants: Object.keys(TENANTS).sort(),
    timestamp: new Date().toISOString(),
  });
});

// Legacy (default: padiwangi)
app.post('/transactions', createHandler('padiwangi'));
app.post('/evaluate', createHandler('padiwangi'));

// Multi-tenant
app.post('/api/v1/:tenantId/transactions', (req, res) => {
  const { tenantId } = req.params;
  if (!TENANTS[tenantId]) {
    return res.status(404).json({ error: `Unknown tenant: ${tenantId}. Available: ${Object.keys(TENANTS).sort().join(', ')}` });
  }
  return createHandler(tenantId)(req, res);
});

app.post('/api/v1/:tenantId/evaluate', (req, res) => {
  const { tenantId } = req.params;
  if (!TENANTS[tenantId]) {
    return res.status(404).json({ error: `Unknown tenant: ${tenantId}. Available: ${Object.keys(TENANTS).sort().join(', ')}` });
  }
  return createHandler(tenantId)(req, res);
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Fabric REST Gateway (fabric-network) berjalan pada port ${PORT}`);
  console.log(`Tenants: ${Object.keys(TENANTS).sort().join(', ')}`);
  console.log(`Legacy: POST /transactions | /evaluate`);
  console.log(`Multi-tenant: POST /api/v1/:tenantId/{transactions|evaluate}`);
});

export default app;
