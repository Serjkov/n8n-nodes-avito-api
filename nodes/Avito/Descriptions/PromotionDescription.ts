import type { INodeProperties } from 'n8n-workflow';

export const promotionOperations: INodeProperties[] = [
	{
		displayName: 'Операция',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['promotion'] } },
		default: 'getBids',
		options: [
			{
				name: 'Настроить Авто Продвижение',
				value: 'setAuto',
				description: 'Настройка автоматического продвижения',
				action: 'Set automatic promotion',
			},
			{
				name: 'Остановить Продвижение',
				value: 'remove',
				description: 'Остановка продвижения и переход на базовые цены',
				action: 'Remove promotion',
			},
			{
				name: 'Получить Детали Ставок',
				value: 'getBids',
				description: 'Детализированная информация о ставках и бюджетах',
				action: 'Get bid details',
			},
			{
				name: 'Получить Продвижения По ID',
				value: 'getPromotionsByItemIds',
				description: 'Текущие цены целевого действия по нескольким объявлениям',
				action: 'Get promotions by item ids',
			},
			{
				name: 'Установить Ручную Ставку',
				value: 'setManual',
				description: 'Установка ручной ставки продвижения',
				action: 'Set manual promotion',
			},
		],
	},
];

export const promotionFields: INodeProperties[] = [
	// Общее поле ID Объявления для операций с одним объявлением
	{
		displayName: 'ID Объявления',
		name: 'itemId',
		type: 'number',
		description: 'Уникальный ID объявления',
		default: 0,
		required: true,
		displayOptions: {
			show: { resource: ['promotion'], operation: ['getBids', 'setManual', 'setAuto', 'remove'] },
		},
	},

	// Поля для getPromotionsByItemIds
	{
		displayName: 'ID Объявлений',
		name: 'itemIds',
		type: 'string',
		description: 'Список ID объявлений через запятую (максимум 200)',
		default: '',
		required: true,
		placeholder: '123456,789012,345678',
		hint: 'Максимум 200 ID в одном запросе',
		displayOptions: { show: { resource: ['promotion'], operation: ['getPromotionsByItemIds'] } },
	},

	// Поля для setManual
	{
		displayName: 'Ставка (в копейках)',
		name: 'bidPenny',
		type: 'number',
		description: 'Цена целевого действия в копейках',
		default: 0,
		required: true,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: { show: { resource: ['promotion'], operation: ['setManual'] } },
	},
	{
		displayName: 'Тип События',
		name: 'actionTypeId',
		type: 'options',
		options: [
			{ name: 'Звонок [1]', value: 1, description: 'Оплата за звонок по объявлению' },
			{ name: 'Пакет кликов [5]', value: 5, description: 'Оплата за переходы к объявлению' },
			{ name: 'Мессенджер, передача контакта в чате [7]', value: 7, description: 'Оплата за обращение через чат' },
		],
		default: 5,
		description: 'Тип целевого действия. Для установки цены за просмотр выберите "Пакет кликов [5]".',
		required: true,
		displayOptions: { show: { resource: ['promotion'], operation: ['setManual', 'setAuto'] } },
	},
	{
		displayName: 'Дневной лимит (в копейках)',
		name: 'limitPenny',
		type: 'number',
		description: 'Дневной лимит трат в копейках (необязательно)',
		default: 0,
		typeOptions: {
			minValue: 0,
		},
		displayOptions: { show: { resource: ['promotion'], operation: ['setManual'] } },
	},

	// Поля для setAuto
	{
		displayName: 'Бюджет (в копейках)',
		name: 'budgetPenny',
		type: 'number',
		description: 'Бюджет в копейках',
		default: 0,
		required: true,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: { show: { resource: ['promotion'], operation: ['setAuto'] } },
	},
	{
		displayName: 'Тип Бюджета',
		name: 'budgetType',
		type: 'options',
		options: [
			{ name: 'Дневной', value: '1d', description: 'Сутки' },
			{ name: 'Недельный', value: '7d', description: 'Неделя' },
			{ name: 'Месячный', value: '30d', description: 'Месяц' },
		],
		default: '1d',
		description: 'Срок, за который потратится бюджет',
		required: true,
		displayOptions: { show: { resource: ['promotion'], operation: ['setAuto'] } },
	},
];
