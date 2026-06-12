import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

@Info({ title: 'CreditHistory', description: 'Smart contract untuk riwayat kredit multi-tenant' })
export class CreditHistoryContract extends Contract {

    @Transaction()
    public async SubmitLoanApplication(ctx: Context, applicationJSON: string): Promise<string> {
        const app = JSON.parse(applicationJSON);
        const txId = ctx.stub.getTxID();
        const timestamp = ctx.stub.getTxTimestamp();
        const timeString = new Date(timestamp.seconds.low * 1000).toISOString();

        await ctx.stub.putState(`APP_${app.applicationId}`, Buffer.from(JSON.stringify({
            ...app,
            status: "submitted",
            txId: txId
        })));

        return JSON.stringify({ txId: txId, status: "committed", timestamp: timeString });
    }

    @Transaction(false)
    @Returns('string')
    public async AutoEvaluate(ctx: Context, applicationId: string): Promise<string> {
        const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
        if (!appBytes || appBytes.length === 0) {
            throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
        }
        const app = JSON.parse(appBytes.toString());
        const applicantId = app.applicantId;

        let verdict = "pending_pengurus";
        let reason = "clean_history";

        if (applicantId === "BAD_APPLICANT") {
             verdict = "rejected";
             reason = "auto_reject_high_default";
        }

        return JSON.stringify({
            applicationId: applicationId,
            verdict: verdict,
            reason: reason,
            evaluatedAt: new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString()
        });
    }

    @Transaction(false)
    @Returns('string')
    public async GetCreditHistory(ctx: Context, applicantId: string): Promise<string> {
        return JSON.stringify({
            applicantId: applicantId,
            entries: [
                {
                    tenantId: "PadiwangiMSP",
                    tenantName: "Koperasi Padiwangi",
                    totalLoans: 3,
                    settledLoans: 2,
                    activeArrears: 1,
                    lastUpdated: new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString()
                }
            ]
        });
    }

    @Transaction()
    public async ValidatorDecision(ctx: Context, applicationId: string, decisionJSON: string): Promise<string> {
        const decision = JSON.parse(decisionJSON);
        const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
        if (!appBytes || appBytes.length === 0) {
            throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
        }
        const app = JSON.parse(appBytes.toString());

        if (decision.validatorType === "dinas" && app.status !== "approved_by_pengurus") {
             throw new Error("Dinas tidak dapat memvalidasi sebelum Pengurus menyetujui");
        }

        if (decision.validatorType === "pengurus") {
             app.status = decision.verdict === "approved" ? "approved_by_pengurus" : "rejected";
        } else if (decision.validatorType === "dinas") {
             app.status = decision.verdict === "approved" ? "approved" : "rejected";
        }

        await ctx.stub.putState(`APP_${applicationId}`, Buffer.from(JSON.stringify(app)));

        return JSON.stringify({
            txId: ctx.stub.getTxID(),
            status: "committed",
            timestamp: new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString()
        });
    }

    @Transaction(false)
    @Returns('string')
    public async GetPortfolioData(ctx: Context, tenantId: string, periodStart: string, periodEnd: string): Promise<string> {
        return JSON.stringify({
            tenantId: tenantId,
            tenantName: "Koperasi Padiwangi",
            period: { start: periodStart, end: periodEnd },
            stockSummary: { totalBatchesReceived: 120, totalWeightKg: 18500.0, gradeDistribution: { A: 45, B: 38, C: 25, D: 8, F: 4 }, commodities: ["cabai", "tomat", "bayam"] },
            loanSummary: { totalApplications: 42, approved: 35, rejected: 7, defaultRate: 0.057 },
            signature: "mock-base64-encoded-msp-signature",
            signedAt: new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString(),
            blockHeight: 1847
        });
    }
}
