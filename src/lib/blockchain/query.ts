import { fabricPost } from '@/lib/blockchain/client';
import type {
  AutoEvaluateResult,
  CreditHistoryResponse,
  PortfolioData,
  TraceHistoryResponse,
} from '@/types/blockchain';

interface FabricEvaluatePayload {
  channelid: string;
  chaincodeid: string;
  function: string;
  args: string[];
}

const CHANNEL_ID = 'arta-channel';
const CHAINCODE_STOCK = 'stock-trace';
const CHAINCODE_CREDIT = 'credit-history';

export async function getTraceHistory(batchId: string): Promise<TraceHistoryResponse> {
  const payload: FabricEvaluatePayload = {
    channelid: CHANNEL_ID,
    chaincodeid: CHAINCODE_STOCK,
    function: 'GetTraceHistory',
    args: [batchId],
  };

  return fabricPost<FabricEvaluatePayload, TraceHistoryResponse>('/evaluate', payload);
}

export async function getBatchesByTenant(tenantId: string): Promise<TraceHistoryResponse[]> {
  const payload: FabricEvaluatePayload = {
    channelid: CHANNEL_ID,
    chaincodeid: CHAINCODE_STOCK,
    function: 'GetBatchesByTenant',
    args: [tenantId],
  };

  return fabricPost<FabricEvaluatePayload, TraceHistoryResponse[]>('/evaluate', payload);
}

export async function getCreditHistory(applicantId: string): Promise<CreditHistoryResponse> {
  const payload: FabricEvaluatePayload = {
    channelid: CHANNEL_ID,
    chaincodeid: CHAINCODE_CREDIT,
    function: 'GetCreditHistory',
    args: [applicantId],
  };

  return fabricPost<FabricEvaluatePayload, CreditHistoryResponse>('/evaluate', payload);
}

export async function autoEvaluateLoan(applicationId: string): Promise<AutoEvaluateResult> {
  const payload: FabricEvaluatePayload = {
    channelid: CHANNEL_ID,
    chaincodeid: CHAINCODE_CREDIT,
    function: 'AutoEvaluate',
    args: [applicationId],
  };

  return fabricPost<FabricEvaluatePayload, AutoEvaluateResult>('/evaluate', payload);
}

export async function getPortfolioData(
  tenantId: string,
  periodStart: string,
  periodEnd: string,
): Promise<PortfolioData> {
  const payload: FabricEvaluatePayload = {
    channelid: CHANNEL_ID,
    chaincodeid: CHAINCODE_CREDIT,
    function: 'GetPortfolioData',
    args: [tenantId, periodStart, periodEnd],
  };

  return fabricPost<FabricEvaluatePayload, PortfolioData>('/evaluate', payload);
}
