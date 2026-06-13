"use strict";
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditHistoryContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------
const TENANT_NAMES = {
  PadiwangiMSP: "Koperasi Padiwangi",
  MelatiJayaMSP: "Koperasi Melati Jaya",
  SumberMakmurMSP: "Koperasi Sumber Makmur",
  TirtaBersamaMSP: "Koperasi Tirta Bersama",
  HarapanBaruMSP: "Koperasi Harapan Baru",
  DinasMSP: "Dinas Pertanian",
};
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toDate(timestamp) {
  return new Date(timestamp.seconds.low * 1000);
}
function formatTimestamp(timestamp) {
  return toDate(timestamp).toISOString();
}
// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------
let CreditHistoryContract = class CreditHistoryContract
  extends fabric_contract_api_1.Contract
{
  // ── Submit ──────────────────────────────────────────────────────────
  async SubmitLoanApplication(ctx, applicationJSON) {
    let app;
    try {
      app = JSON.parse(applicationJSON);
    } catch {
      throw new Error(
        "Payload JSON tidak valid. Pastikan data berformat JSON string.",
      );
    }
    if (!app.applicationId || !app.applicantId || !app.targetTenantId) {
      throw new Error(
        "Field wajib: applicationId, applicantId, targetTenantId",
      );
    }
    const txId = ctx.stub.getTxID();
    const timestamp = ctx.stub.getTxTimestamp();
    const timeString = formatTimestamp(timestamp);
    const loanApp = {
      applicationId: app.applicationId,
      applicantId: app.applicantId,
      targetTenantId: app.targetTenantId,
      amount: Number(app.amount) || 0,
      purpose: app.purpose || "",
      submittedAt: app.submittedAt || timeString,
      status: "submitted",
      txId: txId,
    };
    // Simpan data utama
    await ctx.stub.putState(
      `APP_${loanApp.applicationId}`,
      Buffer.from(JSON.stringify(loanApp)),
    );
    // Composite key: applicant → applicationId   (untuk GetCreditHistory)
    const applicantKey = ctx.stub.createCompositeKey("applicant~appId", [
      loanApp.applicantId,
      loanApp.applicationId,
    ]);
    await ctx.stub.putState(applicantKey, Buffer.from("\u0000"));
    // Composite key: tenant → applicationId      (untuk GetPortfolioData)
    const tenantKey = ctx.stub.createCompositeKey("tenant~appId", [
      loanApp.targetTenantId,
      loanApp.applicationId,
    ]);
    await ctx.stub.putState(tenantKey, Buffer.from("\u0000"));
    return JSON.stringify({
      txId: txId,
      status: "committed",
      timestamp: timeString,
    });
  }
  // ── Auto Evaluate ───────────────────────────────────────────────────
  async AutoEvaluate(ctx, applicationId) {
    const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
    if (!appBytes || appBytes.length === 0) {
      throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
    }
    const app = JSON.parse(appBytes.toString());
    const applicantId = app.applicantId;
    const historyJsonStr = await this.GetCreditHistory(ctx, applicantId);
    const history = JSON.parse(historyJsonStr);
    let totalPinjaman = 0;
    let totalTunggakan = 0;
    for (const entry of history.entries) {
      totalPinjaman += entry.totalLoans;
      totalTunggakan += entry.activeArrears;
    }
    let verdict = "pending_pengurus";
    let reason = "clean_history";
    if (totalPinjaman > 0) {
      const rasioTunggakan = totalTunggakan / totalPinjaman;
      if (rasioTunggakan > 0.5 && totalTunggakan > 2) {
        verdict = "rejected";
        reason = "auto_reject_high_default";
      } else if (totalTunggakan > 0) {
        verdict = "pending_pengurus";
        reason = "minor_arrears_detected";
      }
    }
    return JSON.stringify({
      applicationId: applicationId,
      verdict: verdict,
      reason: reason,
      evaluatedAt: formatTimestamp(ctx.stub.getTxTimestamp()),
    });
  }
  // ── Get Credit History ──────────────────────────────────────────────
  async GetCreditHistory(ctx, applicantId) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey(
      "applicant~appId",
      [applicantId],
    );
    const tenantAgg = {};
    let result = await iterator.next();
    while (!result.done) {
      const splitKey = ctx.stub.splitCompositeKey(result.value.key);
      const appId = splitKey.attributes[1];
      const appBytes = await ctx.stub.getState(`APP_${appId}`);
      if (appBytes && appBytes.length > 0) {
        const app = JSON.parse(appBytes.toString());
        const tid = app.targetTenantId;
        if (!tenantAgg[tid]) {
          tenantAgg[tid] = {
            totalLoans: 0,
            settledLoans: 0,
            activeArrears: 0,
            lastUpdated: app.submittedAt,
          };
        }
        tenantAgg[tid].totalLoans += 1;
        if (app.status === "settled") {
          tenantAgg[tid].settledLoans += 1;
        } else if (app.status === "overdue") {
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
    const entries = Object.entries(tenantAgg).map(([tenantId, agg]) => ({
      tenantId: tenantId,
      tenantName: TENANT_NAMES[tenantId] || tenantId,
      totalLoans: agg.totalLoans,
      settledLoans: agg.settledLoans,
      activeArrears: agg.activeArrears,
      lastUpdated: agg.lastUpdated,
    }));
    return JSON.stringify({
      applicantId: applicantId,
      entries: entries,
    });
  }
    // ── Validator Decision ──────────────────────────────────────────────
    async ValidatorDecision(ctx, applicationId, decisionJSON) {
        const INTERNAL_VALIDATORS = ['bendahara', 'ketua', 'wakil_ketua'];
        const decision = JSON.parse(decisionJSON);
        const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
        if (!appBytes || appBytes.length === 0) {
            throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
        }
        const app = JSON.parse(appBytes.toString());
        if (decision.validatorType === 'dinas' && app.status !== 'approved_by_pengurus') {
            throw new Error('Dinas tidak dapat memvalidasi sebelum pengurus internal menyetujui');
        }
        if (INTERNAL_VALIDATORS.includes(decision.validatorType)) {
            app.status = decision.verdict === 'approved' ? 'approved_by_pengurus' : 'rejected';
        }
        else if (decision.validatorType === 'dinas') {
            app.status = decision.verdict === 'approved' ? 'approved' : 'rejected';
        }
        await ctx.stub.putState(`APP_${applicationId}`, Buffer.from(JSON.stringify(app)));
        return JSON.stringify({
            txId: ctx.stub.getTxID(),
            status: 'committed',
            timestamp: formatTimestamp(ctx.stub.getTxTimestamp()),
        });
    }
    // ── Mark Loan Overdue ───────────────────────────────────────────────
  async MarkLoanOverdue(ctx, applicationId) {
    const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
    if (!appBytes || appBytes.length === 0) {
      throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
    }
    const app = JSON.parse(appBytes.toString());
    if (app.status === "settled" || app.status === "rejected") {
      throw new Error(
        `Aplikasi ${applicationId} sudah ${app.status} — tidak bisa di-mark overdue`,
      );
    }
    app.status = "overdue";
    await ctx.stub.putState(
      `APP_${applicationId}`,
      Buffer.from(JSON.stringify(app)),
    );
    return JSON.stringify({
      txId: ctx.stub.getTxID(),
      status: "committed",
      timestamp: formatTimestamp(ctx.stub.getTxTimestamp()),
    });
  }
  // ── Settle Loan ─────────────────────────────────────────────────────
  async SettleLoan(ctx, applicationId) {
    const appBytes = await ctx.stub.getState(`APP_${applicationId}`);
    if (!appBytes || appBytes.length === 0) {
      throw new Error(`Aplikasi pinjaman ${applicationId} tidak ditemukan`);
    }
    const app = JSON.parse(appBytes.toString());
    if (app.status === "settled") {
      throw new Error(`Aplikasi ${applicationId} sudah settled`);
    }
    app.status = "settled";
    await ctx.stub.putState(
      `APP_${applicationId}`,
      Buffer.from(JSON.stringify(app)),
    );
    return JSON.stringify({
      txId: ctx.stub.getTxID(),
      status: "committed",
      timestamp: formatTimestamp(ctx.stub.getTxTimestamp()),
    });
  }
  // ── Get Portfolio Data ──────────────────────────────────────────────
  async GetPortfolioData(ctx, tenantId, periodStart, periodEnd) {
    const periodStartDate = new Date(periodStart);
    const periodEndDate = new Date(periodEnd);
    // ── 1. Loan data dari composite key tenant~appId ──
    const loanIterator = await ctx.stub.getStateByPartialCompositeKey(
      "tenant~appId",
      [tenantId],
    );
    const loanApps = [];
    let loanResult = await loanIterator.next();
    while (!loanResult.done) {
      const splitKey = ctx.stub.splitCompositeKey(loanResult.value.key);
      const appId = splitKey.attributes[1];
      const appBytes = await ctx.stub.getState(`APP_${appId}`);
      if (appBytes && appBytes.length > 0) {
        const app = JSON.parse(appBytes.toString());
        const submittedDate = new Date(app.submittedAt);
        if (
          submittedDate >= periodStartDate &&
          submittedDate <= periodEndDate
        ) {
          loanApps.push(app);
        }
      }
      loanResult = await loanIterator.next();
    }
    await loanIterator.close();
    const totalApplications = loanApps.length;
    const approvedCount = loanApps.filter(
      (a) => a.status === "approved" || a.status === "approved_by_pengurus",
    ).length;
    const rejectedCount = loanApps.filter(
      (a) => a.status === "rejected",
    ).length;
    const overdueCount = loanApps.filter((a) => a.status === "overdue").length;
    const defaultRate =
      totalApplications > 0 ? overdueCount / totalApplications : 0;
    const loanSummary = {
      totalApplications: totalApplications,
      approved: approvedCount,
      rejected: rejectedCount,
      defaultRate: Number(defaultRate.toFixed(4)),
    };
    // ── 2. Stock data via cross-chaincode ke stock-trace ──
    let stockSummary = {
      totalBatchesReceived: 0,
      totalWeightKg: 0,
      gradeDistribution: {},
      commodities: [],
    };
    try {
      const response = await ctx.stub.invokeChaincode(
        "stock-trace",
        ["GetBatchesByTenant", tenantId],
        "arta-channel",
      );
      if (response.status === 200) {
        const batchesJson = Buffer.from(response.payload).toString("utf8");
        const batches = JSON.parse(batchesJson);
        const gradeDist = {};
        const commoditySet = new Set();
        let totalWeight = 0;
        let batchReceivedCount = 0;
        for (const batch of batches) {
          for (const entry of batch.entries) {
            // Filter by period
            if (
              entry.timestamp &&
              entry.timestamp >= periodStart &&
              entry.timestamp <= periodEnd
            ) {
              if (entry.action === "batch_received") {
                batchReceivedCount += 1;
                const qty = Number(entry.data?.quantityKg) || 0;
                totalWeight += qty;
                const grade = entry.data?.grade || "unknown";
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
          totalWeightKg: totalWeight,
          gradeDistribution: gradeDist,
          commodities: Array.from(commoditySet).sort(),
        };
      }
    } catch (err) {
      // Cross-chaincode call gagal — stockSummary tetap kosong
      console.error(
        `[GetPortfolioData] Cross-chaincode ke stock-trace gagal: ${err}`,
      );
    }
    // ── 3. Response ──
    return JSON.stringify({
      tenantId: tenantId,
      tenantName: TENANT_NAMES[tenantId] || tenantId,
      period: { start: periodStart, end: periodEnd },
      stockSummary,
      loanSummary,
      signature: "", // placeholder — akan diisi MSP signature nantinya
      signedAt: formatTimestamp(ctx.stub.getTxTimestamp()),
      blockHeight: 0, // placeholder — ambil dari ctxStub jika perlu
    });
  }
};
exports.CreditHistoryContract = CreditHistoryContract;
__decorate(
  [
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise),
  ],
  CreditHistoryContract.prototype,
  "SubmitLoanApplication",
  null,
);
__decorate(
  [
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)("string"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise),
  ],
  CreditHistoryContract.prototype,
  "AutoEvaluate",
  null,
);
__decorate(
  [
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)("string"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise),
  ],
  CreditHistoryContract.prototype,
  "GetCreditHistory",
  null,
);
__decorate(
  [
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [
      fabric_contract_api_1.Context,
      String,
      String,
    ]),
    __metadata("design:returntype", Promise),
  ],
  CreditHistoryContract.prototype,
  "ValidatorDecision",
  null,
);
__decorate(
  [
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise),
  ],
  CreditHistoryContract.prototype,
  "MarkLoanOverdue",
  null,
);
__decorate(
  [
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise),
  ],
  CreditHistoryContract.prototype,
  "SettleLoan",
  null,
);
__decorate(
  [
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)("string"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [
      fabric_contract_api_1.Context,
      String,
      String,
      String,
    ]),
    __metadata("design:returntype", Promise),
  ],
  CreditHistoryContract.prototype,
  "GetPortfolioData",
  null,
);
exports.CreditHistoryContract = CreditHistoryContract = __decorate(
  [
    (0, fabric_contract_api_1.Info)({
      title: "CreditHistory",
      description: "Smart contract untuk riwayat kredit multi-tenant",
    }),
  ],
  CreditHistoryContract,
);
