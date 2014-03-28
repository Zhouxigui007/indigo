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
		adobe_startup: "/Adobe/Startup Scripts CS3/Adobe Bridge",
		// Task configuration.
		concat: {
			// Очередность файлов важна, поэтому они перечисляются явно
			options: {
				banner: '<%= banner %>',
				separator: '\n'
			},
			estk: {
				src: [
					'include/Base.jsx',
					'include/Utils.jsx',
					'include/BaseImposer.jsx',
					'include/AssemblyImposer.jsx',
					'include/AchtungImposer.jsx',
					'include/MatchingImposer.jsx',
					'include/BlankComposer.jsx',
					'include/DataBroker.jsx',
					'include/JsonBroker.jsx',
					'include/Messenger.jsx',
					'include/HTTPMessenger.jsx',
					'include/Controller.jsx',
				],
				dest: 'include/<%= pkg.name %>.jsxinc'
			},
			tests: {
				src: [
					'tests/testSuite.jsx',
					'tests/*.jsxinc',
					'tests/testRun.jsx'
				],
				dest: 'bin/tests.js',
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
				// Illustrator stuff, not known by JSHint:
				predef: [
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
				src: ['<%= concat.tests.dest %>'],
			},
			nodejs: {
				src: ['indigoWebApp/app.js', 'indigoWebApp/routes/*.js', 'indigoWebApp/lib/*.js', 'Gruntfile.js'],
			}
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
		less: {
			minified: {
				options: {
					cleancss: true
				},
				files: {
					'indigoWebApp/public/css/indigo.css': 'indigoWebApp/less/indigo.less'
				}
			}
		},
		watch: {
			estk: {
				files: '<%= concat.estk.src %>',
				tasks: ['concat', 'jshint', 'sed']
			},
			nodejs: {
				files: '<%= jshint.nodejs.src %>',
				tasks: ['jshint:nodejs']
			},
			tests: {
				files: '<%= concat.tests.src %>',
				tasks: ['concat:tests','jshint:tests', 'sed']
			},
			less: {
				files: 'indigoWebApp/less/*',
				tasks: ['less']
			}
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
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-jsdoc');
	grunt.loadNpmTasks('grunt-env');
	grunt.loadNpmTasks('grunt-sed');

	// OS specific tasks
	var envTasks = [];
	if (process.env.OS === 'Windows_NT') {
		envTasks.push('env:windows');
	} else {
		envTasks.push('env:linux');
	}
	grunt.registerTask('os_spec', envTasks);

	grunt.registerTask('docs', ['concat', 'os_spec', 'jsdoc:dist', 'sed']);
	grunt.registerTask('tests', ['concat', 'jshint', 'sed']);
	// Default task.
	grunt.registerTask('default', ['concat', 'os_spec', 'jshint:estk', 'sed']);
};
