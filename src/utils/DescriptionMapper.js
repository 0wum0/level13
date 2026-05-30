// maps a number of properties to text descriptions / templates, for example sector features to a sector description
// add descriptions with properties required to match them
// get description with a query object
// - returns description whose properties ALL match that of the object
// - if several match, returns a "random" one from matching (preferring one with many matching properties, and guaranteed to be the same every time for the exact same query object)
// define properties in descriptions as
// - simple (equals) or ranges (array of two values (inclusive))
// - WILDCARD to match any value but still count as 1 matching property for choosing one out of many matching
// set default value for properties to ensure they are checked even if input template does not explicitly define them

define(function () {
	
	let DescriptionMapper = {
		
		WILDCARD: "WILDCARD",

		descriptions: {},
		scores: {},
		
		add: function (type, props, text, score) {
			if (!this.descriptions[type]) this.descriptions[type] = [];
			this.descriptions[type].push({ props: props, text: text, score: score });
		},
		
		get: function (type, props) {
			if (!this.descriptions[type]) {
				log.w("no such description type: " + type);
				return "";
			}
			
			let matches = [];
			let weightedMatches = [];
			for (let i = 0; i < this.descriptions[type].length; i++) {
				let desc = this.descriptions[type][i];
				if (this.matches(props, desc)) {
					let score = this.getMatchScore(type, desc);
					matches.push(desc);
					for (let j = 0; j < score; j++) {
						weightedMatches.push(desc);
					}
				}
			}
			
			// no matches: warning
			if (matches.length == 0) {
				log.w("no matching description found for type " + type);
				return "";
			}
			
			// single match, return that
			if (matches.length == 1) {
				return matches[0].text;
			}
			
			// several matches, select one in a semi-random way (same object should return the same one if called again but should be different for different objects)
			return this.pickRandom(weightedMatches, props).text;
		},

		setDefaultValue: function (type, prop, value) {
			if (!this.descriptions[type]) {
				log.w("no such description type: " + type);
				return;
			}

			for (let i = 0; i < this.descriptions[type].length; i++) {
				let desc = this.descriptions[type][i];
				if (desc.props[prop] === undefined) {
					desc.props[prop] = value;
				}
			}
		},

		setParamScore: function (type, prop, score) {
			if (!this.scores[type]) this.scores[type] = [];
			this.scores[type][prop] = score;
		},
		
		matches: function (props, desc) {
			for (let [key, value] of Object.entries(desc.props)) {
				let propsValue = props[key];
				
				// test for simple value
				if (propsValue === value) continue;

				// test for wildcard
				if (value == this.WILDCARD) continue;

				let isPropsValueArray = propsValue && typeof propsValue == "object" && propsValue.length && propsValue.length > 0;
				let isDescValueArray = value && typeof value == "object" && value.length && value.length > 0;

				// test for range (props has value, desc has range)
				if (isDescValueArray && value.length == 2 && typeof value[0] == "number" &&  typeof value[1] == "number")
					if (propsValue >= value[0] && propsValue <= value[1]) continue;
				// test for array of possible values in props (props has array, desc has one value)
				if (isPropsValueArray && !isDescValueArray)
					if (propsValue.indexOf(value) >= 0) continue;
				// test for array of possible values in desc (props has one value, desc has array)
				if (!isPropsValueArray && isDescValueArray)
					if (value.indexOf(propsValue) >= 0) continue;

				return false;
			}
			return true;
		},
		
		getMatchScore: function (type, desc) {
			if (desc.score) return desc.score;
			let result = 1;
			for (let [key, value] of Object.entries(desc.props)) {
				result += this.scores[type] && this.scores[type][key] ? this.scores[type][key] : 1 || 1;
			}
			return result;
		},
		
		pickRandom: function (candidates, props) {
			let checksum = this.getPropsChecksum(props);
			let index = checksum % candidates.length;
			return candidates[index];
		},
		
		getPropsChecksum: function (props) {
			let result = 0;
			for (let [key, value] of Object.entries(props)) {
				let t = typeof value;
				if (t == "number") {
					result += Math.abs(value);
				} else if (value == null) {
					result += 0;
				} else if (value.length) {
					result += value.length;
				} else {
					if (value) result++;
				}
			}
			return Math.round(result);
		}
		
	};
	return DescriptionMapper;
});
