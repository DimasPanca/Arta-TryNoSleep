import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

@Info({ title: 'StockTrace', description: 'Smart contract untuk pelacakan stok' })
export class StockTraceContract extends Contract {
    @Transaction()
    public async RecordStockEvent(ctx: Context, action: string, recordJSON: string): Promise<string> {
        const record = JSON.parse(recordJSON);
        const batchId = record.batchId;
        const txId = ctx.stub.getTxID();
        const timestamp = ctx.stub.getTxTimestamp();
        const timeString = new Date(timestamp.seconds.low * 1000).toISOString();

        const newEntry = {
            txId: txId,
            timestamp: timeString,
            tenantId: record.tenantId,
            action: action,
            data: record
        };

        const existingDataBytes = await ctx.stub.getState(batchId);
        let history = { batchId: batchId, entries: [] as any[] };
        
        if (existingDataBytes && existingDataBytes.length > 0) {
            history = JSON.parse(existingDataBytes.toString());
        }

        history.entries.push(newEntry);
        await ctx.stub.putState(batchId, Buffer.from(JSON.stringify(history)));

        const tenantBatchKey = ctx.stub.createCompositeKey('tenant~batch', [record.tenantId, batchId]);
        await ctx.stub.putState(tenantBatchKey, Buffer.from('\u0000'));

        return JSON.stringify({
            txId: txId,
            status: "committed",
            timestamp: timeString
        });
    }

    @Transaction(false)
    @Returns('string')
    public async GetTraceHistory(ctx: Context, batchId: string): Promise<string> {
        const dataBytes = await ctx.stub.getState(batchId);
        if (!dataBytes || dataBytes.length === 0) {
            return JSON.stringify({ batchId: batchId, entries: [] });
        }
        return dataBytes.toString();
    }

    @Transaction(false)
    @Returns('string')
    public async GetBatchesByTenant(ctx: Context, tenantId: string): Promise<string> {
        const iterator = await ctx.stub.getStateByPartialCompositeKey('tenant~batch', [tenantId]);
        const allResults: any[] = [];
        let result = await iterator.next();
        
        while (!result.done) {
            const splitKey = ctx.stub.splitCompositeKey(result.value.key);
            const batchId = splitKey.attributes[1];
            
            const batchBytes = await ctx.stub.getState(batchId);
            if (batchBytes && batchBytes.length > 0) {
                allResults.push(JSON.parse(batchBytes.toString()));
            }
            result = await iterator.next();
        }
        await iterator.close();
        
        return JSON.stringify(allResults);
    }
}
