///#target Illustrator-13

/**
 * В Indigo собран код, работающий под управлением  
 * Adobe Extended Script Tool Kit (`estk`)
 * @namespace 
 */
var Indigo = Indigo || {};
	
Indigo.config = {
	achtungFile: 'Y:/ACHTUNG.eps',
	webaccesslib: [
		$.getenv('ProgramFiles') + '/Adobe/Adobe Bridge CS3/webaccesslib.dll',
		'C:/Program Files (x86)/Adobe/Adobe Bridge CS3/webaccesslib.dll',
		'D:/bin/Adobe/Adobe Bridge CS3/webaccesslib.dll'
	],
	webserver : 'http://indigo.aicdr.pro:8080/',
	// Количество заданий на один активный цикл работы агента
	limit: 2,
	// Корень хотфолдеров
	HFRoot : 'X:/',
	// Корень шаблонов
	TmplRoot : 'D:/work/template',
};
