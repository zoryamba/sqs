import { Test, TestingModule } from '@nestjs/testing';
import { SQS } from '@aws-sdk/client-sqs';
import { Consumer } from 'sqs-consumer';
import { Producer } from 'sqs-producer';

import { SqsConfig, SqsConfigOption, SqsMetadataScanner, SqsModule } from '../lib';
import { SqsService } from '../lib/sqs.service';

describe('SqsService', () => {
  let module: TestingModule;
  let sqsService: SqsService;
  const mockQueueName = 'mockQueue';
  const mockQueueUrl = 'mockQueueUrl';
  const mockConfig: SqsConfigOption = {
    region: 'region',
    endpoint: 'endpoint',
    accountNumber: '000000000000',
    credentials: {
      accessKeyId: 'temp',
      secretAccessKey: 'temp',
    },
  };
  const mockSqs = new SQS(mockConfig);

  const mockConsumer = Consumer.create({ queueUrl: mockQueueUrl, sqs: mockSqs, handleMessage: jest.fn() });
  const mockProducer = Producer.create({ sqs: mockSqs, queueUrl: mockQueueUrl });

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        SqsModule.forRootAsync({
          useFactory: () => new SqsConfig(mockConfig),
        }),
      ],
      providers: [
        {
          provide: SqsService,
          useFactory: (scanner: SqsMetadataScanner, sqsConfig: SqsConfig) => {
            return new SqsService(scanner, sqsConfig);
          },
          inject: [SqsMetadataScanner, SqsConfig],
        },
      ],
    }).compile();
    sqsService = module.get<SqsService>(SqsService);
    sqsService.consumers.set(mockQueueName, mockConsumer);
    sqsService.producers.set(mockQueueName, mockProducer);
  });
  describe('purgeQueue', () => {
    it('successfully call SQS.purgeQueue', async () => {
      const SqsPurgeQueueSpyOn = jest.spyOn(mockSqs, 'purgeQueue').mockImplementation(() => null);
      try {
        await sqsService.purgeQueue(mockQueueName);
      } catch (err) {}
      expect(SqsPurgeQueueSpyOn).toHaveBeenCalledWith({ QueueUrl: mockQueueUrl });
    });
  });

  describe('getProducerQueueSize', () => {
    it('successfully call producer.queueSize', () => {
      const mockProducerQueueSizeSpyOn = jest.spyOn(mockProducer, 'queueSize').mockImplementation(() => null);
      sqsService.getProducerQueueSize(mockQueueName);
      expect(mockProducerQueueSizeSpyOn).toBeCalled();
    });
  });
});
