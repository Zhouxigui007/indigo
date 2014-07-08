
/*
 * GET home page.
 */

var ObjectID = require('mongodb').ObjectID,
	model = require('../lib/model'),
	_ = require('lodash'),
	io = require('../lib/socket.js');

/**
 * Закодировать не-ASCII символы в текстовых полях передаваемого объекта
 *
 * Похоже, что объект http из Adobe webaccesslib.dll кладёт с пробором на кодировку ответа. 
 * Ответ уходит в utf8 (проверено в Wireshark), однако в http.response оказывается хрень.
 * Установка http.responseencoding='utf8', как показано в документации Adobe, не помогает.
 *
 * Поэтому: здесь закодируем кириллицу в encodeURIComponent, а в Иллюстраторе вытащим ее 
 * обратно.
 *
 * @todo Рекурсивный обход объекта
 *
 * @param {object} 
 * @return {object}
 */
function encodeAdobe(obj) {
	Object.keys(obj).forEach(function(key) {
		if (typeof(obj[key]) === 'string') {
			obj[key] = encodeURIComponent(obj[key]);
		}
	});
	return obj;
}

exports.data = function(req,res) {

	var megaSwitch = {
		error: function() {
			var message = {};
			if (req.method === 'POST') {
				message = JSON.parse(req.body.parcel);
				var id = new ObjectID(message.jobid);
				var jobsCollection = req.db.collection('indigoJobs');
				var now = new Date();
				jobsCollection.update({_id: id}, {$set: {status: 'error', error: message.error, agent: message.host, updated: now.getTime()}}, function() {
					console.info('[%s]: Job %s raised error on %s', new Date(), message.jobid, message.host, message.user);
					io.emit('jobstatus:changed', { status: message.info, _id: id });
				});
			}
			res.end();
		},
		/**
		 * Тут маршрутизируются запросы от Иллюстратора со статусом `info`
		 *
		 * При получении запроса мы:
		 * 
		 * * преобразуем сообщение из тела запроса в объект `message`;
		 * * достаем из этого объекта id задания и делаем из него монговский ObjectID;
		 * * тянем из коллекции indigoJobs это задание по его ObjectID и смотрим массив callbacks;
		 * * если в массиве callbacks нашлись функции, которые можно выполнить, то 
		 *   выполняем их асинхронно (точнее, ставим в очередь на выполнение в process.nextTick);
		 * * 
		 */
		info: function() {
			var message = {};
			if (req.method === 'POST') {
				message = JSON.parse(req.body.parcel);
				var id = new ObjectID(message.jobid);
				var jobsCollection = req.db.collection('indigoJobs');
				jobsCollection.find({_id: id}).nextObject(function(err, parcel) {
					// Возможно, именно этот запрос к info не требует дополнительной
					// обработки. Другими словами, если в задании массив callbacks 
					// пустой или его нет, то и предпринимать ничего не надо;
					var callbacks = parcel.callbacks ? parcel.callbacks : [];
					var i = message.info;
					Object.keys(callbacks).forEach(function(key) {
						try {
							var fn = model[i][callbacks[key]];
							if (typeof(fn) === 'function') {
								process.nextTick(function() {
									fn(req.db, message);
								});
							}
						} catch (e) {
							console.error('Requested method not implemented yet: %s.%s', i, callbacks[key]);
						}
					});
				});
				var now = new Date();
				jobsCollection.update({_id: id}, {$set: {status: message.info, agent: message.host, updated: now.getTime()}}, function() {
					console.info('[%s]: Job %s %s from %s by %s', new Date(), message.jobid, message.info, message.host, message.user);
					io.emit('jobstatus:changed', { status: message.info, _id: id });
				});
			}
			res.end();
		},
		fetchJobs: function() {
			var jobsCollection = req.db.collection('indigoJobs');
			// Болше двух заданий в одни руки не давать!
			jobsCollection.find({status:'pending'}).limit(2).toArray(function(err, parcel) {
				// Создаём массив заданий для Иллюстратора, если есть
				if (!parcel || parcel.lenght === 0) {
					// а если нет, возвращаем пустой объект
					res.json(200, {});
					return;
				}
				var jobs = [];
				parcel.forEach(function(job) {
					jobs.push({
						action: job.action,
						data: encodeAdobe(job),
					});
				});
				// Держи, кормилец:
				res.json( 200, jobs );
				res.end();
				// Сохраняем отметку, что задание взял на себя какой-то хост из кластера.
				// Имя исполнителя передается в запросе (а это GET) в параметре agent.
				// В dev-логе Экспресса выглядеть это будет так: `GET /data/json/fetchJobs?agent=WINCLONE`
				// где WINCLONE -- это имя хоста, который забрал задание.
				// Если параметра agent в запросе нет, считаем, что это наши партизаны;
				parcel.forEach(function(job) {
					var agent = req.query.agent ? req.query.agent : 'PARTIZANEN';
					var now = new Date();
					jobsCollection.update({_id: job._id}, {$set: {status: "fetched", agent: agent, updated: now.getTime()}}, function() {
						console.info('[%s]: Job %s fetched from database by %s', new Date(), job._id, agent);
						io.emit('jobstatus:changed', { status: 'fetched', _id: job._id });
					});
				});
			});
		},
		pushJob: function() {
			var workset = req.body;
			// Если в запросе есть имя метода для особой обработки задания, выполнить его, иначе вставить что есть.
			if ((typeof(workset.run) !== 'undefined') && typeof(this[workset.run]) === 'function') {
				this[workset.run]();
			} else {
				// 
				// Распараллеливаем задания
				//
				// Мотивация: распиливание одного большого задания на много мелких
				// позволит распределить их выполнение между хостами кластера; 
				var actions = workset.actions ? workset.actions : [];
				var splitJobs = [];
				actions.forEach(function(action){
					// this -- это объект workset
					//
					// Задание не отмечено галкой:
					if (!action.process) { return; }
					
					var job = {};
					
					// Задание Assembly создаём для каждой этикетки в принт-листе
					if (action.name === 'AssemblyImposer') {
						var labels = this.label_path.split('\n');
						labels.forEach(function(path) {
							job = _.clone(this);
							job.action = 'AssemblyImposer';
							delete job.actions;
							job.label_path = path;
							job.updated = new Date().getTime();
							splitJobs.push(job);
						},this);
					}
					// Matching должен иметь весь принт-лист
					if (action.name === 'MatchingImposer') {
						job = _.clone(this);
						job.action = 'MatchingImposer';
						delete job.actions;
						job.updated = new Date().getTime();
						splitJobs.push(job);
					}
					// Achtung
					if (action.name === 'AchtungImposer') {
						job = _.clone(this);
						job.action = 'AchtungImposer';
						delete job.actions;
						job.updated = new Date().getTime();
						splitJobs.push(job);
					}
				}, workset);
				var jobs = req.db.collection('indigoJobs');
				
				if (splitJobs.lenght === 0) { return; }
				
				jobs.insert(splitJobs, function(err) {
					if (err) {
						res.send(500);
					} else {
						res.send(200);//, result);
					}
				});
			}
		},
		//
		// Запрос на создание задания для TemplateScanner, из браузера:
		// 
		// Если параметр rescan установлен, то база шаблонов будет сброшена 
		// и сканирование шаблонов будет выполнено "с чистого листа".
		// По умолчанию (т.е. когда rescan не установлен) будут сканироваться 
		// только недостающие шаблоны, которые есть на диске, но отсутствуют в базе.
		// 
		chargeTS: function() {
			var rescan = req.body['rescan'] ? true : false;
			process.nextTick(function() {
				model.chargeTS(req.db, rescan);
			});
			res.end();
		},
		templates: function() {
			var templates = req.db.collection('indigoTemplates');
			templates.find().toArray(function(err, docs) {
				res.json(docs);
			});
		},
		jobs: function() {
			var templates = req.db.collection('indigoJobs');
			// Сортировка по умолчанию: сначала свежие задания
			templates.find().sort('updated', -1).toArray(function(err, docs) {
				res.json(docs);
			});
		},
	};
	// req.params[1] пока что всегда 'json'; будут другие дата-брокеры -- будет разговор;
	var action = req.params[2];

	if (typeof(megaSwitch[action]) !== 'function') {
		res.send(404);
		return;
	}

	megaSwitch[action]();
};

exports.tests = function(req, res) {
	switch(req.params[1]) {
		case 'fetchJobs':
			res.send(200, 'fetchjob.test');
		break;
		case 'info':
			res.send(200, 'info.test');
		break;
		case 'error':
			res.send(200, 'error.test');
		break;
	}
	res.end();
};

exports.forms = function(req, res) {
    // Если в запросе есть `_id`, заполним форму из базы, иначе покажем пустую
    if (typeof(req.query._id) !== 'undefined') {
		var	order = {
			"order": "214Ц01892/3",
			"customer": "Артлайф ООО",
			"order_name": "БАДы для Индии (в ассортименте)",
			"manager": "Лотфуллина Э.",
			"master": "Альмухаметов А.",
			"designer": "Сергеев Р.",
			"label_type": "self-label",
			"print_type": "digital",
			"cut": "ready",
			"cut_number": "1152704",
			"size_x": 53.5,
			"size_y": 153.75,
			labels: [
				{
					name: "Глюкосил 90 таб",
					file: '',
				},
				{
					name: "Джоинт флекс 90 таб",
					file: '',
				},
				{
					name: "Грин Стар 45 кап",
					file: '',
				},
				{
					name: "Бурдок С 90 таб",
					file: '',
				},
				{
					name: "Формула женщины 90 таб",
					file: '',
				},
				{
					name: "Мемори райс 90 таб",
					file: '',
				},
				{
					name: "Комплекс ферментов 90 таб",
					file: '',
				},
				{
					name: "Хепар 90 таб",
					file: '',
				},
			],
			inks: [
				{ name: 'Opaque', used: false },
				{ name: 'Cyan', used: true },
				{ name: 'Magenta', used: true },
				{ name: 'Yellow', used: true },
				{ name: 'Black', used: true },
				{ name: 'Orange', used: false },
				{ name: 'Violet', used: true },
			],
			"pms_1": "false",
			"pms_2": "false",
			"pms_3": "false",
			"pms_4": "false",
			"pms_5": "false",
			"pms_6": "false",
			"pms_7": "false",
			"lak": "select",
			"tis": "free",
			"roll": "auto", 
			"roll_type": "outside", 
			"roll_dir": "head_forward",
		};
		res.json(order);
    } else {
		res.json({});
    }
};

