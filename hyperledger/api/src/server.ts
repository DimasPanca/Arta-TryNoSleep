import express from 'express';
import cors from 'cors';
import type { 
    AutoEvaluateResult, 
    CreditHistoryResponse, 
    PortfolioData 
} from '@/types/blockchain';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/transactions', async (req, res) => {
    try {
        const { channelid, chaincodeid, function: funcName, args } = req.body;
        
        if (channelid !== 'arta-channel') {
            return res.status(400).json({ error: "channelid tidak valid, harus arta-channel" });
        }

        console.log(`[INVOKE] Memanggil Chaincode: ${chaincodeid}, Fungsi: ${funcName}, Argumen:`, args);
        
        res.json({
            txId: "mock-tx-id",
            status: "committed",
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("Kesalahan Transaksi:", error);
        res.status(500).json({ error: "eksekusi chaincode gagal: " + error.message });
    }
});

app.post('/evaluate', async (req, res) => {
    try {
        const { channelid, chaincodeid, function: funcName, args } = req.body;
        
        if (channelid !== 'arta-channel') {
            return res.status(400).json({ error: "channelid tidak valid, harus arta-channel" });
        }

        console.log(`[QUERY] Membaca Chaincode: ${chaincodeid}, Fungsi: ${funcName}, Argumen:`, args);
        
        // Provide mock responses based on function called
        if (funcName === "AutoEvaluate") {
             const result: AutoEvaluateResult = {
                 applicationId: args[0], 
                 verdict: "pending_pengurus", 
                 reason: "clean_history", 
                 evaluatedAt: new Date().toISOString()
             };
             res.json(result);
        } else if (funcName === "GetCreditHistory") {
             const result: CreditHistoryResponse = {
                 applicantId: args[0], 
                 entries: []
             };
             res.json(result);
        } else {
             res.json({ mock: "query_result" });
        }

    } catch (error: any) {
        console.error("Kesalahan Evaluasi:", error);
        res.status(500).json({ error: "query chaincode gagal: " + error.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Fabric REST Gateway berjalan pada port ${PORT}`);
});
