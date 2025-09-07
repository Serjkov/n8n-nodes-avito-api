import type { IExecuteFunctions } from 'n8n-workflow';
import { avitoApiRequest } from '../GenericFunctions';

/**
 * Получение дерева категорий Авито
 * API: GET /autoload/v1/user-docs/tree
 * Scope: autoload:reports
 */
export async function getCategoryTree(this: IExecuteFunctions, itemIndex: number) {
	// Получаем дополнительные заголовки из фиксированной коллекции
	const additionalHeadersData = this.getNodeParameter('additionalHeaders', itemIndex, {}) as any;
	const additionalHeaders: any = {};
	
	// Преобразуем fixedCollection в объект заголовков
	if (additionalHeadersData.parameter && Array.isArray(additionalHeadersData.parameter)) {
		for (const header of additionalHeadersData.parameter) {
			if (header.name && header.value) {
				additionalHeaders[header.name] = header.value;
			}
		}
	}

	return await avitoApiRequest.call(
		this,
		'GET',
		'/autoload/v1/user-docs/tree',
		undefined,
		undefined,
		itemIndex,
		additionalHeaders,
	);
}