/*global module:false*/
module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		banner: '/**\n * <%= pkg.name %> - v<%= pkg.version %> - ' +
			'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
			' * Copyright (c) <%= grunt.template.today("yyyy") %> ' +
			'<%= pkg.author %>; Licensed MIT\n */\n\n',
		// Custom properties
		paths: {
			webapp:	'indigoWebApp',
		},
		// Task configuration.
		concat: {
			options: {
				banner: '<%= banner %>',
				separator: '\n'
			},
			estk: {
				// Очередность файлов важна, поэтому они перечисляются явно
				src: [
					'include/Config.jsx',
					'include/Utils.jsx',
					'include/BaseImposer.jsx',
					'include/AssemblyImposer.jsx',
					'include/AchtungImposer.jsx',
					'include/MatchingImposer.jsx',
					'include/TemplateScanner.jsx',
					'include/BlankComposer.jsx',
					'include/DataBroker.jsx',
					'include/JsonBroker.jsx',
					'include/Messenger.jsx',
					'include/HTTPMessenger.jsx',
					'include/Controller.jsx',
				],
				dest: 'include/<%= pkg.name %>.jsxinc'
			},
			// тесты для estk только
			tests: {
				options: {
					banner: '(function() {\n',
					footer: '})();',
				},
				src: [
					'tests/testSuite.jsx',
					'tests/html-reporter.jsx',
					'tests/coverage-reporter.jsx',
					'tests/*.jsxinc',
					'tests/testRun.jsx'
				],
				dest: 'bin/tests.js',
			},
			client: {
				options: {
					banner: '<%= banner %>\n(function() {\n',
					footer: '\n})();',
				},
				src: [
					'<%= paths.webapp %>/client/header.concat.js',
					'<%= paths.webapp %>/client/**/*.js',
				],
				dest: '<%= paths.webapp %>/public/js/<%= pkg.name %>.js',
			},
			styles: {
				src: [
					'<%= paths.webapp %>/bower_components/bootstrap/dist/css/bootstrap.css',
					'<%= paths.webapp %>/public/css/<%= pkg.name %>.css',
				],
				dest: '<%= paths.webapp %>/public/css/styles.css',
			},
			scripts: {
				src: [
					'<%= paths.webapp %>/bower_components/angular/angular.js',
					'<%= paths.webapp %>/bower_components/angular-resource/angular-resource.js',
					'<%= paths.webapp %>/bower_components/angular-route/angular-route.js',
					'<%= paths.webapp %>/bower_components/jquery/dist/jquery.js',
					'<%= paths.webapp %>/bower_components/bootstrap/dist/js/bootstrap.js',
					'<%= paths.webapp %>/public/js/<%= pkg.name %>.js',
				],
				dest: '<%= paths.webapp %>/public/js/scripts.js',
			},
		},
		jshint: {
			options: {
				boss: true,
				browser: true,
				curly: true,
				eqeqeq: true,
				eqnull: true,
				evil: true,
				expr: true,
				immed: true,
				jquery: true,
				latedef: true,
				newcap: true,
				noarg: true,
				node: true,
				predef: [
					// Illustrator stuff, not known by JSHint:
					'app',
					'Document',
					'ElementPlacement',
					'ExportOptionsJPEG',
					'ExportType',
					'ExternalObject',
					'File',
					'Folder',
					'HttpConnection',
					'Layer',
					'PathItem',
					'PDFSaveOptions',
					'SaveOptions',
					'UserInteractionLevel',
					'ZOrderMethod',
					// angular
					'angular',
					// tests
					'beforeEach',
					'browser',
					'by',
					'describe',
					'element',
					'it',
					'protractor',
					// blanket
					'_$jscoverage',
				],
				sub: true,
				undef: true,
				unused: true,
				globals: {}
			},
			estk: {
				src: [
					'<%= concat.estk.dest %>',
				],
				options : {
					unused: false,
				},
			},
			tests: {
				src: ['<%= concat.tests.dest %>', '<%= paths.webapp %>/test/**/*.js'],
			},
			nodejs: {
				src: ['<%= paths.webapp %>/app.js', '<%= paths.webapp %>/routes/*.js', '<%= paths.webapp %>/lib/*.js'],
			},
			grunt: {
				src: ['Gruntfile.js']
			},
			browser: {
				src: [
					'<%= concat.client.dest %>'
				],
			},
		},
		env: {
			// jsdoc вяло тербует пеменную среды JAVA_HOME
			// Фи! Зато быстро :)
			// @todo: Определять путь самостоятельно, если есть возможность
			linux: {
				JAVA_HOME : '/usr/lib/jvm/java-7-openjdk-i386/',
			},
			windows: {
				JAVA_HOME : 'D:/bin/Java/jre7/',
			},
		},
		jsdoc: {
			dist: {
				src: ['<%= jshint.estk.src %>'],
				options: {
					destination: 'docs/<%= pkg.name %>',
					configure: 'jsdoc.conf.json',
				},
			},
		},
		sed: {
			// Как обмануть JSHint и JSDoc по теме расширенного JavaScript
			// от Adobe? Конкретнее: как игнорировать конструкции типа
			// "#target Illustrator" или "#include filename.jscinx"?
			// Пока не придумал ничего лучшего, чем закомментировать их в
			// исходниках тремя слэшами, а последним проходом Гранта
			// убирать эти слеши нахрен. Топорно, но волки сыты.
			dist: {
				path: [
					'<%= concat.estk.dest %>',
					'<%= concat.tests.dest %>',
				],
				pattern: '///#',
				replacement: '#',
			},
		},
		blanket: {
			instrument: {
				options: {
					extensions: ['.jsxinc']
				},
				files: {
					'include/': ['include/'],
				},
			},
		},
		htmlangular: {
			options: {
				tmplext: 'html.tmpl',
				customtags: [ ],
				customattrs: [
					'smart-float',
				],
				relaxerror: [ 
					'The frameborder attribute on the iframe element is obsolete. Use CSS instead.',
					'Element head is missing a required instance of child element title.',
				],
				reportpath: null,
			},
			browser: {
				files: {
					src: ['<%= paths.webapp %>/public/**/*.html'],
				},
			}
		},
		shell: {
			codesynclin: {
				command: 'misc/codesync.sh',
			},
		},
		watch: {
			estk: {
				files: '<%= concat.estk.src %>',
				tasks: ['concat', 'jshint', 'sed', 'os_spec']
			},
			nodejs: {
				files: '<%= jshint.nodejs.src %>',
				tasks: ['jshint:nodejs']
			},
			tests: {
				files: ['<%= concat.tests.src %>', '<%= paths.webapp %>/test/**/*.js'],
				tasks: ['concat:tests','jshint:tests', 'sed']
			},
			browser: {
				files: ['<%= concat.client.src %>'],
				tasks: ['concat:client', 'concat:scripts', 'jshint:browser'],
			},
			validate: {
				files: ['<%= htmlangular.browser.files.src %>'],
				tasks: [ 'html' ],
			},
			grunt: {
				files: ['<%= jshint.grunt.src %>'],
				tasks: ['jshint:grunt'],
			},
			/**
			 * С сетевого диска не работает;
			 * С локального работает, но тогда теряет смысл;
			 * Пока запускать из-под windows вручную: grunt 
			windows: {
				files: ['W:/gruntwatch/*.js'],
				tasks: ['default'],
			},
			*/
		}
	});

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-blanket');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-html-angular-validate');
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-contrib-watch');
	//grunt.loadNpmTasks('grunt-jsdoc');
	grunt.loadNpmTasks('grunt-notify');
	grunt.loadNpmTasks('grunt-env');
	grunt.loadNpmTasks('grunt-sed');

	// OS specific tasks
	var envTasks = [];
	if (process.env.OS === 'Windows_NT') {
		envTasks.push('env:windows');
	} else {
		envTasks.push('env:linux');
		envTasks.push('shell:codesynclin');
	}
	grunt.registerTask('os_spec', envTasks);

	grunt.registerTask('docs', ['concat', 'os_spec', 'jsdoc:dist', 'sed']);
	grunt.registerTask('tests', ['concat', 'jshint', 'sed']);
	grunt.registerTask('html', ['htmlangular']);
	grunt.registerTask('instrument', ['concat', 'blanket', 'sed']);
	// Default task.
	grunt.registerTask('default', ['concat', 'jshint', 'sed']);
};
