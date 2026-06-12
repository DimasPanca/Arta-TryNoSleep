import { fabricPost } from '@/lib/blockchain/client';
import type {
  BlockchainAction,
  BlockchainStockRecord,
  BlockchainSubmitResponse,
  LoanApplicationRecord,
  ValidatorDecisionRecord,
} from '@/types/blockchain';

interface FabricSubmitPayload {
  channelid: string;
  chaincodeid: string;
  function: string;
  args: string[];
}

const CHANNEL_ID = 'arta-channel';
const CHAINCODE_STOCK = 'stock-trace';
const CHAINCODE_CREDIT = 'credit-history';

export async function recordStockEvent(
  action: BlockchainAction,
  record: BlockchainStockRecord,
): Promise<BlockchainSubmitResponse> {
  const payload: FabricSubmitPayload = {
    channelid: CHANNEL_ID,
    chaincodeid: CHAINCODE_STOCK,
    function: 'RecordStockEvent',
    args: [action, JSON.stringify(record)],
  };

  return fabricPost<FabricSubmitPayload, BlockchainSubmitResponse>(
    '/transactions',
    payload,
  );
}

export async function recordBatchReceived(
  record: BlockchainStockRecord,
): Promise<BlockchainSubmitResponse> {
  return recordStockEvent('batch_received', record);
}

export async function recordBatchDispatched(
  record: BlockchainStockRecord,
): Promise<BlockchainSubmitResponse> {
  return recordStockEvent('batch_dispatched', record);
}

export async function recordQualityUpdate(
  record: BlockchainStockRecord,
): Promise<BlockchainSubmitResponse> {
  return recordStockEvent('quality_updated', record);
}

export async function submitLoanApplication(
  application: LoanApplicationRecord,
): Promise<BlockchainSubmitResponse> {
  const payload: FabricSubmitPayload = {
    channelid: CHANNEL_ID,
    chaincodeid: CHAINCODE_CREDIT,
    function: 'SubmitLoanApplication',
    args: [JSON.stringify(application)],
  };

  return fabricPost<FabricSubmitPayload, BlockchainSubmitResponse>(
    '/transactions',
    payload,
  );
}

export async function recordValidatorDecision(
  applicationId: string,
  decision: ValidatorDecisionRecord,
): Promise<BlockchainSubmitResponse> {
  const payload: FabricSubmitPayload = {
    channelid: CHANNEL_ID,
    chaincodeid: CHAINCODE_CREDIT,
    function: 'ValidatorDecision',
    args: [applicationId, JSON.stringify(decision)],
  };

  return fabricPost<FabricSubmitPayload, BlockchainSubmitResponse>(
    '/transactions',
    payload,
  );
}
