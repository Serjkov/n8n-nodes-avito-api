import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

// Импортируем роутеры для всех ресурсов
import { 
	routeItemOperation, 
	routePromotionOperation, 
	routeRatingsOperation,
	routeAutoloadOperation
} from './router/RouterUtils';

// Импортируем описания для всех ресурсов
import { baseProperties } from './Descriptions/BaseProperties';
import { itemOperations, itemFields } from './Descriptions/ItemDescription';
import { promotionOperations, promotionFields } from './Descriptions/PromotionDescription';
import { ratingsOperations, ratingsFields } from './Descriptions/RatingsDescription';
import { autoloadOperations, autoloadFields } from './Descriptions/AutoloadDescription';

export class Avito implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Avito',
		name: 'avito',
		icon: 'file:avito.svg',
		group: ['transform'],
		version: [1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Взаимодействие с API Авито для бизнеса',
		defaults: { name: 'Avito' },
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'avitoOAuth2Api',
				required: true,
			},
		],
		properties: [
			...baseProperties,
			...itemOperations,
			...promotionOperations,
			...ratingsOperations,
			...autoloadOperations,
			...itemFields,
			...promotionFields,
			...ratingsFields,
			...autoloadFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				// Роутинг по ресурсам
				if (resource === 'item') {
					responseData = await routeItemOperation.call(this, operation, i);
				} else if (resource === 'promotion') {
					responseData = await routePromotionOperation.call(this, operation, i);
				} else if (resource === 'ratings') {
					responseData = await routeRatingsOperation.call(this, operation, i);
				} else if (resource === 'autoload') {
					responseData = await routeAutoloadOperation.call(this, operation, i);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
						itemIndex: i,
					});
				}

				returnData.push({ json: responseData, pairedItem: { item: i } });
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}