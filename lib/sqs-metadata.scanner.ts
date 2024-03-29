import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@golevelup/nestjs-discovery/lib/discovery.service';

import { SQS_CONSUMER_EVENT_HANDLER, SQS_CONSUMER_METHOD, SQS_PROCESS } from './sqs.constants';
import { SqsConsumerEventHandlerMeta, SqsMessageHandlerMeta, SqsProcessMeta } from './sqs.interfaces';
import { SqsMetadata } from './sqs.types';

@Injectable()
export class SqsMetadataScanner implements OnModuleInit {
  public readonly sqsMetadatas = new Map<string, SqsMetadata>();

  public constructor(private readonly discover: DiscoveryService) {}

  public async onModuleInit(): Promise<void> {
    const processes = await this.discover.providersWithMetaAtKey<SqsProcessMeta>(SQS_PROCESS);

    await Promise.all(
      processes.map(
        (process) =>
          new Promise((resolve) => {
            const { meta, discoveredClass } = process;

            const messageHandlerMetadatas = this.discover.classMethodsWithMetaAtKey<SqsMessageHandlerMeta>(
              discoveredClass,
              SQS_CONSUMER_METHOD,
            );
            if (messageHandlerMetadatas.length > 1) {
              throw new Error("can't register multiple message handlers");
            }

            const eventHandlerMetadatas = this.discover.classMethodsWithMetaAtKey<SqsConsumerEventHandlerMeta>(
              discoveredClass,
              SQS_CONSUMER_EVENT_HANDLER,
            );

            const {
              meta: { batch },
              discoveredMethod: messageMethod,
            } = messageHandlerMetadatas[0];

            const sqsMetadata: SqsMetadata = {
              name: meta.name,
              messageHandler: {
                batch,
                handleMessage: messageMethod.handler.bind(messageMethod.parentClass.instance),
              },
              eventHandler: eventHandlerMetadatas.map((metadata) => ({
                eventName: metadata.meta.eventName,
                handleEvent: metadata.discoveredMethod.handler.bind(metadata.discoveredMethod.parentClass.instance),
              })),
            };

            resolve(this.sqsMetadatas.set(meta.name, sqsMetadata));
          }),
      ),
    );
  }
}
