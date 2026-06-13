import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------
const TENANT_NAMES: Record<string, string> = {
    'PadiwangiMSP':         'Koperasi Padiwangi',
    'MelatiJayaMSP':        'Koperasi Melati Jaya',
    'SumberMakmurMSP':      'Koperasi Sumber Makmur',
    'TirtaBersamaMSP':      'Koperasi Tirta Bersama',
    'HarapanBaruMSP':       'Koperasi Harapan Baru',
    'DinasMSP':             'Dinas Pertanian',
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
interface LoanApplication {
    applicationId: string;
    applicantId: string;
    targetTenantId: string;
    amount: number;
    purpose: string;
    submittedAt: string;
    status: string;                         // submitted | approved_by_pengurus | approved | rejected | overdue | settled
    txId: string;
}

interface TenantHistoryEntry {
    tenantId: string;
    tenantName: string;
    totalLoans: number;
    settledLoans: number;
    activeArrears: number;
    lastUpdated: string;
}

interface GradeDistribution {
    [grade: string]: number;
}

interface StockSummary {
    totalBatchesReceived: number;
    totalWeightKg: number;
    gradeDistribution: GradeDistribution;
    commodities: string[];
}

interface LoanSummary {
    totalApplications: number;
    approved: number;
    rejected: number;
    defaultRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toDate(timestamp: { seconds: { low: number }; nanos?: number }): Date {
    return new Date(timestamp.seconds.low * 1000);
}

function formatTimestamp(timestamp: { seconds: { low: number }; nanos?: number }): string {
    return toDate(timestamp).toISOString();
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------
@Info({ title: 'CreditHistory', description: 'Smart contract untuk riwayat kredit multi-tenant' })
export class CreditHistoryContract extends Contract {

    // ── Submit ──────────────────────────────────────────────────────────
    @Transaction()
    public async SubmitLoanApplication(ctx: Context, applicationJSON: string): Promise<string> {
        let app: Record<string, unknown>;
        try {
            app = JSON.parse(applicationJSON);
        } catch {
            throw new Error('Payload JSON tidak valid. Pastikan data berformat JSON string.');
        }

        if (!app.applicationId || !app.applicantId || !app.targetTenantId) {
            throw new Error('Field wajib: applicationId, applicantId, targetTenantId');
        }

        const txId = ctx.stub.getTxID();
        const timestamp = ctx.stub.getTxTimestamp();
        const timeString = formatTimestamp(timestamp);

        const loanApp: LoanApplication = {
            applicationId:  app.applicationId as string,
            applicantId:    app.applicantId as string,
            targetTenantId: app.targetTenantId as string,
            amount:         Number(app.amount) || 0,
            purpose:        (app.purpose as string) || '',
            submittedAt:    (app.submittedAt as string) || timeString,
            status:         'submitted',
            txId:           txId,
        };

        // Simpan data utama
        await ctx.stub.putState(`APP_${loanApp.applicationId}`, Buffer.from(JSON.stringify(loanApp)));

        // Composite key: applicant → applicationId   (untuk GetCreditHistory)
        const applicantKey = ctx.stub.createCompositeKey('applicant~appId', [loanApp.applicantId, loanApp.applicationId]);
        await ctx.stub.putState(applicantKey, Buffer.from('\u0000'));

        // Composite key: tenant → applicationId      (untuk GetPortfolioData)
        const tenantKey = ctx.stub.createCompositeKey('tenant~appId', [loanApp.targetTenantId, loanApp.applicationId]);
        await ctx.stub.putState(tenantKey, Buffer.from('\u0000'));

        return JSON.stringify({
            txId:      txId,
            status:    'committed',
            timestamp: timeString,
        });
    }

    // ── Auto Evaluate ───────────────────────────────────────────────────
    @Transaction(false)
    @Returns('string')
    public async AutoEvaluate(ctx: Context, applicationId: string): Promise<string> {
        const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
        if (!appBytes || appBytes.length === 0) {
            throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
        }
        const app: LoanApplication = JSON.parse(appBytes.toString());
        const applicantId = app.applicantId;

        const historyJsonStr = await this.GetCreditHistory(ctx, applicantId);
        const history = JSON.parse(historyJsonStr);

        let totalPinjaman = 0;
        let totalTunggakan = 0;

        for (const entry of (history.entries as TenantHistoryEntry[])) {
            totalPinjaman += entry.totalLoans;
            totalTunggakan += entry.activeArrears;
        }

        let verdict = 'pending_pengurus';
        let reason = 'clean_history';

        if (totalPinjaman > 0) {
            const rasioTunggakan = totalTunggakan / totalPinjaman;

            if (rasioTunggakan > 0.5 && totalTunggakan > 2) {
                verdict = 'rejected';
                reason = 'auto_reject_high_default';
            } else if (totalTunggakan > 0) {
                verdict = 'pending_pengurus';
                reason = 'minor_arrears_detected';
            }
        }

        return JSON.stringify({
            applicationId: applicationId,
            verdict:       verdict,
            reason:        reason,
            evaluatedAt:   formatTimestamp(ctx.stub.getTxTimestamp()),
        });
    }

    // ── Get Credit History ──────────────────────────────────────────────
    @Transaction(false)
    @Returns('string')
    public async GetCreditHistory(ctx: Context, applicantId: string): Promise<string> {
        const iterator = await ctx.stub.getStateByPartialCompositeKey('applicant~appId', [applicantId]);
        const tenantAgg: Record<string, {
            totalLoans: number;
            settledLoans: number;
            activeArrears: number;
            lastUpdated: string;
        }> = {};

        let result = await iterator.next();
        while (!result.done) {
            const splitKey = ctx.stub.splitCompositeKey(result.value.key);
            const appId = splitKey.attributes[1];

            const appBytes = await ctx.stub.getState(`APP_${appId}`);
            if (appBytes && appBytes.length > 0) {
                const app: LoanApplication = JSON.parse(appBytes.toString());
                const tid = app.targetTenantId;

                if (!tenantAgg[tid]) {
                    tenantAgg[tid] = { totalLoans: 0, settledLoans: 0, activeArrears: 0, lastUpdated: app.submittedAt };
                }

                tenantAgg[tid].totalLoans += 1;
                if (app.status === 'settled') {
                    tenantAgg[tid].settledLoans += 1;
                } else if (app.status === 'overdue') {
                    tenantAgg[tid].activeArrears += 1;
                }

                // Track latest timestamp
                if (app.submittedAt > tenantAgg[tid].lastUpdated) {
                    tenantAgg[tid].lastUpdated = app.submittedAt;
                }
            }

            result = await iterator.next();
        }
        await iterator.close();

        const entries: TenantHistoryEntry[] = Object.entries(tenantAgg).map(([tenantId, agg]) => ({
            tenantId:      tenantId,
            tenantName:    TENANT_NAMES[tenantId] || tenantId,
            totalLoans:    agg.totalLoans,
            settledLoans:  agg.settledLoans,
            activeArrears: agg.activeArrears,
            lastUpdated:   agg.lastUpdated,
        }));

        return JSON.stringify({
            applicantId: applicantId,
            entries:     entries,
        });
    }

    // ── Validator Decision ──────────────────────────────────────────────
    @Transaction()
    public async ValidatorDecision(ctx: Context, applicationId: string, decisionJSON: string): Promise<string> {
        const decision = JSON.parse(decisionJSON);
        const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
        if (!appBytes || appBytes.length === 0) {
            throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
        }
        const app: LoanApplication = JSON.parse(appBytes.toString());

        if (decision.validatorType === 'dinas' && app.status !== 'approved_by_pengurus') {
            throw new Error('Dinas tidak dapat memvalidasi sebelum Pengurus menyetujui');
        }

        if (decision.validatorType === 'pengurus') {
            app.status = decision.verdict === 'approved' ? 'approved_by_pengurus' : 'rejected';
        } else if (decision.validatorType === 'dinas') {
            app.status = decision.verdict === 'approved' ? 'approved' : 'rejected';
        }

        await ctx.stub.putState(`APP_${applicationId}`, Buffer.from(JSON.stringify(app)));

        return JSON.stringify({
            txId:      ctx.stub.getTxID(),
            status:    'committed',
            timestamp: formatTimestamp(ctx.stub.getTxTimestamp()),
        });
    }

    // ── Mark Loan Overdue ───────────────────────────────────────────────
    @Transaction()
    public async MarkLoanOverdue(ctx: Context, applicationId: string): Promise<string> {
        const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
        if (!appBytes || appBytes.length === 0) {
            throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
        }
        const app: LoanApplication = JSON.parse(appBytes.toString());

        if (app.status === 'settled' || app.status === 'rejected') {
            throw new Error(`Aplikasi ${applicationId} sudah ${app.status} — tidak bisa di-mark overdue`);
        }

        app.status = 'overdue';
        await ctx.stub.putState(`APP_${applicationId}`, Buffer.from(JSON.stringify(app)));

        return JSON.stringify({
            txId:      ctx.stub.getTxID(),
            status:    'committed',
            timestamp: formatTimestamp(ctx.stub.getTxTimestamp()),
        });
    }

    // ── Settle Loan ─────────────────────────────────────────────────────
    @Transaction()
    public async SettleLoan(ctx: Context, applicationId: string): Promise<string> {
        const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
        if (!appBytes || appBytes.length === 0) {
            throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
        }
        const app: LoanApplication = JSON.parse(appBytes.toString());

        if (app.status === 'settled') {
            throw new Error(`Aplikasi ${applicationId} sudah settled`);
        }

        app.status = 'settled';
        await ctx.stub.putState(`APP_${applicationId}`, Buffer.from(JSON.stringify(app)));

        return JSON.stringify({
            txId:      ctx.stub.getTxID(),
            status:    'committed',
            timestamp: formatTimestamp(ctx.stub.getTxTimestamp()),
        });
    }

    // ── Get Portfolio Data ──────────────────────────────────────────────
    @Transaction(false)
    @Returns('string')
    public async GetPortfolioData(ctx: Context, tenantId: string, periodStart: string, periodEnd: string): Promise<string> {
        const periodStartDate = new Date(periodStart);
        const periodEndDate = new Date(periodEnd);

        // ── 1. Loan data dari composite key tenant~appId ──
        const loanIterator = await ctx.stub.getStateByPartialCompositeKey('tenant~appId', [tenantId]);
        const loanApps: LoanApplication[] = [];

        let loanResult = await loanIterator.next();
        while (!loanResult.done) {
            const splitKey = ctx.stub.splitCompositeKey(loanResult.value.key);
            const appId = splitKey.attributes[1];

            const appBytes = await ctx.stub.getState(`APP_${appId}`);
            if (appBytes && appBytes.length > 0) {
                const app: LoanApplication = JSON.parse(appBytes.toString());
                const submittedDate = new Date(app.submittedAt);
                if (submittedDate >= periodStartDate && submittedDate <= periodEndDate) {
                    loanApps.push(app);
                }
            }
            loanResult = await loanIterator.next();
        }
        await loanIterator.close();

        const totalApplications = loanApps.length;
        const approvedCount = loanApps.filter(a => a.status === 'approved' || a.status === 'approved_by_pengurus').length;
        const rejectedCount = loanApps.filter(a => a.status === 'rejected').length;
        const overdueCount = loanApps.filter(a => a.status === 'overdue').length;
        const defaultRate = totalApplications > 0 ? overdueCount / totalApplications : 0;

        const loanSummary: LoanSummary = {
            totalApplications: totalApplications,
            approved:          approvedCount,
            rejected:          rejectedCount,
            defaultRate:       Number(defaultRate.toFixed(4)),
        };

        // ── 2. Stock data via cross-chaincode ke stock-trace ──
        let stockSummary: StockSummary = {
            totalBatchesReceived: 0,
            totalWeightKg:        0,
            gradeDistribution:    {},
            commodities:          [],
        };

        try {
            const response = await ctx.stub.invokeChaincode(
                'stock-trace',
                ['GetBatchesByTenant', tenantId],
                'arta-channel',
            );

            if (response.status === 200) {
                const batchesJson = Buffer.from(response.payload as Uint8Array).toString('utf8');
                const batches: Array<{
                    batchId: string;
                    entries: Array<{
                        action: string;
                        timestamp: string;
                        data: {
                            quantityKg?: number;
                            grade?: string;
                            commodity?: string;
                        };
                    }>;
                }> = JSON.parse(batchesJson);

                const gradeDist: GradeDistribution = {};
                const commoditySet = new Set<string>();
                let totalWeight = 0;
                let batchReceivedCount = 0;

                for (const batch of batches) {
                    for (const entry of batch.entries) {
                        // Filter by period
                        if (entry.timestamp && entry.timestamp >= periodStart && entry.timestamp <= periodEnd) {
                            if (entry.action === 'batch_received') {
                                batchReceivedCount += 1;

                                const qty = Number(entry.data?.quantityKg) || 0;
                                totalWeight += qty;

                                const grade = entry.data?.grade || 'unknown';
                                gradeDist[grade] = (gradeDist[grade] || 0) + 1;

                                if (entry.data?.commodity) {
                                    commoditySet.add(entry.data.commodity);
                                }
                            }
                        }
                    }
                }

                stockSummary = {
                    totalBatchesReceived: batchReceivedCount,
                    totalWeightKg:        totalWeight,
                    gradeDistribution:    gradeDist,
                    commodities:          Array.from(commoditySet).sort(),
                };
            }
        } catch (err) {
            // Cross-chaincode call gagal — stockSummary tetap kosong
            console.error(`[GetPortfolioData] Cross-chaincode ke stock-trace gagal: ${err}`);
        }

        // ── 3. Response ──
        return JSON.stringify({
            tenantId:    tenantId,
            tenantName:  TENANT_NAMES[tenantId] || tenantId,
            period:      { start: periodStart, end: periodEnd },
            stockSummary,
            loanSummary,
            signature:   '',                            // placeholder — akan diisi MSP signature nantinya
            signedAt:    formatTimestamp(ctx.stub.getTxTimestamp()),
            blockHeight: 0,                             // placeholder — ambil dari ctxStub jika perlu
        });
    }
}
