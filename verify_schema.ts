import { CampaignEntity, SessionEntity } from './src/lib/db/schema';

console.log("Campaign PK/SK Template:");
// @ts-ignore - accessing internal templates for verification
console.log("PK:", CampaignEntity.model.indexes.byUser.pk.template);
// @ts-ignore
console.log("SK:", CampaignEntity.model.indexes.byUser.sk.template);

console.log("\nSession PK/SK Template:");
// @ts-ignore
console.log("PK:", SessionEntity.model.indexes.byCampaign.pk.template);
// @ts-ignore
console.log("SK:", SessionEntity.model.indexes.byCampaign.sk.template);

const mockCampaign = CampaignEntity.put({
    id: 'camp_123',
    userId: 'user_456',
    name: 'Test Campaign'
}).params();

console.log("\nMock Campaign Put Params:");
console.log(JSON.stringify(mockCampaign, null, 2));

const mockSession = SessionEntity.put({
    id: 'sess_789',
    campaignId: 'camp_123',
    userId: 'user_456',
    name: 'Test Session',
    shareToken: 'token_abc'
}).params();

console.log("\nMock Session Put Params:");
console.log(JSON.stringify(mockSession, null, 2));