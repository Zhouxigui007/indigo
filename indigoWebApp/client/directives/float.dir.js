/**
 * Валидация формы: ожидается положительный float 
 *
 * В чём прикол: разделитель дробной части может 
 * быть как точкой, так и запятой
 *
 * @stolen: https://docs.angularjs.org/guide/forms
 */
indigoDirectives.directive('smartFloat', function() {
	var FLOAT_REGEXP = /^\d+((\.|\,)\d+)?$/;
	return {
		require: 'ngModel',
		link: function(scope, elm, attrs, ctrl) {
			ctrl.$parsers.unshift(function(viewValue) {
				if (FLOAT_REGEXP.test(viewValue)) {
					ctrl.$setValidity('float', true);
					return parseFloat(viewValue.replace(',', '.'));
				} else {
					ctrl.$setValidity('float', false);
					return undefined;
				}
			});
		}
	};
});

