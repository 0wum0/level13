define([], function () {

	let ArrayUtils = {

		filterIfAny: function (arr, filter, min) {
			min = min || 1;
			if (!arr || arr.length <= min) return arr;
			
			let filtered = arr.filter(filter);
			if (filtered.length >= min) return filtered;
			
			return arr;
		}

	};

	return ArrayUtils;
});
