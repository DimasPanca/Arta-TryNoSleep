import express from 'express';
import cors from 'cors';
import * as grpc from '@grpc/grpc-js';
import { connect, Contract, signers } from '@hyperledger/fabric-gateway';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CRYPTO_PATH = path.resolve(__dirname, '..', '..', 'network', 'crypto-config', 'peerOrganizations', 'padiwangi.arta.com', 'users', 'User1@padiwangi.arta.com', 'msp');

const app = express();
app.use(cors());
app.use(express.json());

async function getContract(channelName: string, chaincodeName: string): Promise<Contract> {
    const certPath = fs.readdirSync(path.resolve(CRYPTO_PATH, 'signcerts'))[0];
    const credentials = fs.readFileSync(path.resolve(CRYPTO_PATH, 'signcerts', certPath));
    const identity = { mspId: 'PadiwangiMSP', credentials };

    const keyPath = fs.readdirSync(path.resolve(CRYPTO_PATH, 'keystore'))[0];
    const privateKeyPem = fs.readFileSync(path.resolve(CRYPTO_PATH, 'keystore', keyPath));
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const signer = signers.newPrivateKeySigner(privateKey);

    const client = new grpc.Client('localhost:7051', grpc.credentials.createInsecure());

    const gateway = connect({
        client,
        identity,
        signer,
        evaluateOptions: () => { return { deadline: Date.now() + 5000 }; },
        endorseOptions: () => { return { deadline: Date.now() + 15000 }; },
    });

    const network = gateway.getNetwork(channelName);
    return network.getContract(chaincodeName);
}

app.post('/transactions', async (req, res) => {
    try {
        const { channelid, chaincodeid, function: funcName, args } = req.body;
        
        if (channelid !== 'arta-channel') {
            return res.status(400).json({ error: "channelid tidak valid, harus arta-channel" });
        }

        console.log(`[INVOKE] Memanggil Chaincode: ${chaincodeid}, Fungsi: ${funcName}`);
        
        const contract = await getContract(channelid, chaincodeid);
        const resultBytes = await contract.submitTransaction(funcName, ...args);
        
        const resultJson = Buffer.from(resultBytes).toString('utf8');
        res.json(JSON.parse(resultJson));

    } catch (error: any) {
        console.error("[ERROR] Kesalahan Transaksi:", error.message);
        res.status(500).json({ error: "Gagal menghubungkan ke jaringan Hyperledger atau eksekusi chaincode gagal" });
    }
});

app.post('/evaluate', async (req, res) => {
    try {
        const { channelid, chaincodeid, function: funcName, args } = req.body;
        
        if (channelid !== 'arta-channel') {
            return res.status(400).json({ error: "channelid tidak valid, harus arta-channel" });
        }

        console.log(`[QUERY] Membaca Chaincode: ${chaincodeid}, Fungsi: ${funcName}`);
        
        const contract = await getContract(channelid, chaincodeid);
        const resultBytes = await contract.evaluateTransaction(funcName, ...args);
        
        const resultJson = Buffer.from(resultBytes).toString('utf8');
        res.json(JSON.parse(resultJson));

    } catch (error: any) {
        console.error("[ERROR] Kesalahan Evaluasi:", error.message);
        res.status(500).json({ error: "Gagal menghubungkan ke jaringan Hyperledger atau query chaincode gagal" });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Fabric REST Gateway berjalan pada port ${PORT}`);
});