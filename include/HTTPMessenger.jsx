/**
 * @classdesc Обмен сообщениями по протоколу HTTP между Иллюстратором 
 * и неким web-сервером
 *
 * @constructor
 */
Indigo.HTTPMessenger = function(dataBroker) {
	this.dataBroker = dataBroker;
	this.remote = Indigo.config.webserver;
	this.http = new HttpConnection();
};

Indigo.HTTPMessenger.prototype = new Indigo.Messenger();
Indigo.HTTPMessenger.prototype.constructor = Indigo.HTTPMessenger;

/**
 * Соединение закрываем в конце цикла жизни приложения
 */
Indigo.HTTPMessenger.prototype.cleanup = function() {
	this.http.close();
};

/**
 * **Светим наружу метод `http.pump()`**
 *
 * Получение данных с асинхронного запроса (`http.async = true`).  
 * Это как-бы для тестов только. В реальных условиях надеюсь *это* не использовать.
 *
 * @return {boolean} false -- данные ещё остались
 */
Indigo.HTTPMessenger.prototype._pump = function() {
	var enough = true;
	if (this.http.status >= HttpConnection.statusCompleted && this.http.lastread < 0) {
		return this.http;
	} else {
		this.http.pump();
		enough = false;
	}
	return enough;
};

/**
 * @param {string} type 
 * @param {objects} data JavaScript object
 */
Indigo.HTTPMessenger.prototype.receive = function(type, data) {
	var result = null;
	switch(type) {
		case "fetchJobs":
			result = this.fetchJobs();
		break;
	}
	return result;
};

Indigo.HTTPMessenger.prototype.send = function(type, data) {
	// Установка значений по умолчанию
	if (typeof(data.status) === 'undefined') {
		data.status = 'finished';
	}
	// Запрос будет асинхронным, если свойство async не установлено явно в false
	if (typeof(data.async) === 'undefined') {
		data.async = true;
	}
	// По умолчанию маршрутизация на info, если иное не укзазно явно 
	if (!type) { 
		type = 'info'; 
	}
	
	data.path = type;
	
	// При возникновении ошибки исходный код пересылать не обязательно
	if (type === 'error' && data.source) {
		delete data.source;
	}
	this.post(data);
};

/**
 * POST на сервер
 * @protected
 */
Indigo.HTTPMessenger.prototype.post = function(message) {
	var httpPath = this.remote + this.dataBroker.getURI() + message.path;
	var http = this.http;
	http.url = httpPath;
	delete message.path;
	if (message.async) {
		http.async = true;
		// Если передана колбэк-функция, навесить её
		if (typeof(message.callback) === 'function') {
			http.onCallback = message.callback;
		}
	}
	var parcel = this.dataBroker.encode(message);
	http.mime = "application/x-www-form-urlencoded";
	http.requestheaders = ["User-Agent", "Indigo 1.0"];
	http.request = 'parcel=' + parcel;
	http.method = "POST";
	http.execute();
	var response = http.response;
	var result = this.dataBroker.decode(response);
	return result;
};

/**
 * GET на сервер
 * @protected
 */
Indigo.HTTPMessenger.prototype.get = function(from) {
	var http = this.http;
	http.url = encodeURI(from);
	http.requestheaders = ["User-Agent", "Indigo 1.0"];
	http.method = "GET";
	http.execute();
	var response = http.response;
	return response;
};

/**
 * Parse jobs from remote source to JavaScript job object
 *
 * @protected
 * @return {array} data Array of Job objects
 */
Indigo.HTTPMessenger.prototype.fetchJobs = function() {
	var message = {
		agent: $.getenv('computername'),
		user: $.getenv('username'),
		limit: Indigo.config.limit,
		path: 'jobs/fetch',
	};
	this.http.async = false;
	var response = this.post(message);
	return response;
};
