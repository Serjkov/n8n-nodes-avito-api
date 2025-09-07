import type { INodeProperties } from 'n8n-workflow';

export const baseProperties: INodeProperties[] = [
	{
		displayName: 'Ресурс',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		default: 'item',
		options: [
			{ name: 'Объявление', value: 'item' },
			{ name: 'Продвижение', value: 'promotion' },
			{ name: 'Рейтинги и Отзывы', value: 'ratings' },
			{ name: 'Автозагрузка', value: 'autoload' },
		],
	},
];