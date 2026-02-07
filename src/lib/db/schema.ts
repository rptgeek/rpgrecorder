import { Entity, Service } from 'electrodb';
import { docClient, DYNAMODB_TABLE_NAME } from '../aws/dynamo';

export const CampaignEntity = new Entity({
  model: {
    entity: 'campaign',
    version: '1',
    service: 'rpg'
  },
  attributes: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    userId: { type: 'string', required: true },
    createdAt: { type: 'string', required: true, default: () => new Date().toISOString() },
    updatedAt: { type: 'string', required: true, default: () => new Date().toISOString(), watch: '*' }
  },
  indexes: {
    byUser: {
      pk: {
        field: 'pk',
        template: 'USER#${userId}'
      },
      sk: {
        field: 'sk',
        template: 'CAMP#${id}'
      }
    }
  }
}, { client: docClient, table: DYNAMODB_TABLE_NAME });

export const SessionEntity = new Entity({
  model: {
    entity: 'session',
    version: '1',
    service: 'rpg'
  },
  attributes: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    userId: { type: 'string', required: true },
    campaignId: { type: 'string', required: true },
    createdAt: { type: 'string', required: true, default: () => new Date().toISOString() },
    updatedAt: { type: 'string', required: true, default: () => new Date().toISOString(), watch: '*' },
    audioStorageKey: { type: 'string' },
    transcriptStorageKey: { type: 'string' }, // S3 Pointer Pattern
    transcriptionJobId: { type: 'string' },
    notes: { type: 'string' },
    summary: { type: 'string' },
    metrics: { type: 'any' },
    playerRecap: { type: 'string' },
    shareToken: { type: 'string', required: true },
    speakerNames: { type: 'any' }
  },
  indexes: {
    byCampaign: {
      pk: {
        field: 'pk',
        template: 'CAMP#${campaignId}'
      },
      sk: {
        field: 'sk',
        template: 'SESS#${id}'
      }
    },
    byUser: {
      index: 'gsi1',
      pk: {
        field: 'gsi1pk',
        template: 'USER#${userId}'
      },
      sk: {
        field: 'gsi1sk',
        template: 'SESS#${id}'
      }
    }
  }
}, { client: docClient, table: DYNAMODB_TABLE_NAME });

export const rpgService = new Service({
  campaign: CampaignEntity,
  session: SessionEntity
});