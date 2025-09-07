import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class AvitoOAuth2Api implements ICredentialType {
	name = 'avitoOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Avito OAuth2 API';
	documentationUrl = 'https://developers.avito.ru/api-catalog/auth';
	icon: Icon = 'file:../nodes/Avito/avito.svg';
	
	properties: INodeProperties[] = [
		// Выбор типа авторизации
		{
			displayName: 'Тип авторизации',
			name: 'grantType',
			type: 'options',
			options: [
				{
					name: 'Client Credentials',
					value: 'clientCredentials',
					description: 'Для персонального доступа к API (проще для тестирования)',
				},
				{
					name: 'Authorization Code',
					value: 'authorizationCode', 
					description: 'Для доступа к API от имени пользователей через приложение',
				},
			],
			default: 'clientCredentials',
		},

		// Скрытые технические поля - пользователю не нужно их видеть
		{
			displayName: 'Access Token URL', 
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.avito.ru/token',
		},

		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			displayOptions: {
				show: {
					grantType: ['authorizationCode'],
				},
			},
			default: 'https://avito.ru/oauth',
		},

		// {
		// 	displayName: 'Authorization URL',
		// 	name: 'authUrl', 
		// 	type: 'hidden',
		// 	displayOptions: {
		// 		show: {
		// 			grantType: ['clientCredentials'],
		// 		},
		// 	},
		// 	default: '',
		// },

		// Основное поле для настройки разрешений
		{
			displayName: 'Разрешения (Scope)',
			name: 'scope',
			type: 'string',
			default: '',
			description: 'Разрешения для доступа к API Авито.<br/>Для Client Credentials: <b>Оставьте пустым</b>.<br/>Для Authorization Code: Укажите значения SCOPE через запятую без пробелов.<br/>Пример: items:info,items:apply_vas,stats:read,cpxpromo:read,cpxpromo:edit',
			placeholder: 'items:info,stats:read,cpxpromo:read',
		},

		// Подсказки для правильного заполнения разрешений
		{
			displayName: 'Для Client Credentials оставьте поле "Разрешения" пустым',
			name: 'scopeClientCredentialsHint',
			type: 'notice',
			displayOptions: {
				show: {
					grantType: ['clientCredentials'],
				},
			},
			default: '',
		},

		{
			displayName: 'Для Authorization Code укажите необходимые разрешения <b>через запятую без пробелов</b> (например, "items:info,stats:read,cpxpromo:read")',
			name: 'scopeAuthCodeHint',
			type: 'notice',
			displayOptions: {
				show: {
					grantType: ['authorizationCode'],
				},
			},
			default: '',
		},

		// Скрытые технические параметры OAuth2
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		
		{
			displayName: 'Send Additional Body Properties',
			name: 'sendAdditionalBodyProperties',
			type: 'hidden',
			default: false,
		},
		
		{
			displayName: 'Additional Body Properties',
			name: 'additionalBodyProperties',
			type: 'hidden',
			default: '',
		},

		// Подробные инструкции по настройке с полным списком разрешений
		{
			displayName: '<b>Client Credentials</b> (Персональный доступ к API):<br/>• Получите Client ID и Client Secret в <a href="https://www.avito.ru/professionals/api" target="_blank">личном кабинете Авито</a><br/>• <b>Оставьте поле "Разрешения" пустым</b><br/>• Токен действует 24 часа',
			name: 'clientCredentialsNotice',
			type: 'notice',
			displayOptions: {
				show: {
					grantType: ['clientCredentials'],
				},
			},
			default: '',
		},
		{
			displayName: '<b>Authorization Code</b> (Доступ через приложение):<br/>• Зарегистрируйте приложение на <a href="https://developers.avito.ru/applications" target="_blank">developers.avito.ru</a>. Авито регистрирует только проверенные приложения партнеров.<br/>• Получите Client ID и Client Secret при регистрации<br/>• <b>Укажите необходимые разрешения</b> из списка ниже<br/><br/><b>Доступные разрешения (Scope):</b><br/>• `<b>items:info</b>` - Получение информации об объявлениях<br/>• `<b>items:apply_vas</b>` - Применение дополнительных услуг<br/>• `<b>stats:read</b>` - Получение статистики объявлений<br/>• `<b>user:read</b>` - Получение информации о пользователе<br/>• `<b>user_balance:read</b>` - Получение баланса пользователя<br/>• `<b>user_operations:read</b>` - Получение истории операций пользователя<br/>• `<b>messenger:read</b>` - Чтение сообщений в мессенджере Авито<br/>• `<b>messenger:write</b>` - Отправка сообщений в мессенджере Авито<br/>• `<b>autoload:reports</b>` - Получение отчетов Автозагрузки<br/>• `<b>job:applications</b>` - Получение информации об откликах на вакансии<br/>• `<b>job:cv</b>` - Получение информации резюме<br/>• `<b>job:vacancy</b>` - Работа с вакансиями<br/>• `<b>job:write</b>` - Изменение объявлений вертикали Работа<br/>• `<b>short_term_rent:read</b>` - Получение информации об объявлениях краткосрочной аренды<br/>• `<b>short_term_rent:write</b>` - Изменение объявлений краткосрочной аренды<br/>• `<b>ratings:read</b>` - Получение отзывов<br/>• `<b>ratings:write</b>` - Отправка ответа на отзыв<br/>• `<b>cpxpromo:read</b>` - Получение ставок продвижения<br/>• `<b>cpxpromo:edit</b>` - Редактирование ставок продвижения<br/><br/><b>Примеры комбинаций:</b><br/>• Базовая работа с объявлениями: `items:info,stats:read`<br/>• Полная работа с объявлениями: `items:info,items:apply_vas,stats:read,user:read`<br/>• Мессенджер: `messenger:read,messenger:write,user:read`<br/>• Продвижение: `items:info,cpxpromo:read,cpxpromo:edit,stats:read`',
			name: 'authCodeNotice', 
			type: 'notice',
			displayOptions: {
				show: {
					grantType: ['authorizationCode'],
				},
			},
			default: '',
		},
	];
}