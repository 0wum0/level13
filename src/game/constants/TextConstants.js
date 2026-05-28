// Level 13 specific text helpers

define(['ash',
	'utils/DescriptionMapper',
	'text/Text',
	'text/TextBuilder',
	'game/constants/GameConstants',
	'game/constants/EnemyConstants',
	'game/constants/ItemConstants',
	'game/constants/SectorConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/TradeConstants',
	'game/constants/WorldConstants',
],
function (Ash, DescriptionMapper, Text, TextBuilder, GameConstants, EnemyConstants, ItemConstants, SectorConstants, PositionConstants, MovementConstants, TradeConstants, WorldConstants) {
	
	let TextConstants = {

		getTextKey: function (trunk, modifiers) {
			for (let i = 0; i < modifiers.length; i++) {
				let modifier = modifiers[i];
				let key = trunk + "_" + modifier;
				if (Text.hasKey(key)) return key;
			}

			return trunk;
		},
		
		sentencify: function (s) {
			s = s.trim();
			if (s.length > 0) {
				if (s.endsWith(", ")) s = s.slice(0, -2);
				if (!this.isPunctuation(s[s.length - 1])) s = s + ".";
				if (s[s.length - 1] != " ") s = s + " ";
			}
			return s;
		},
		
		pluralify: function (s) {
			return Text.pluralify(s);
		},

		isPunctuation: function (c) {
			return c == "." || c == "!" || c == "?";
		},
		
		getActionName: function (baseActionID) {
			switch (baseActionID) {
				case "scavenge_heap": return "Scavenge";
				case "scout_locale_i":
				case "scout_locale_u":
					return "Scout";
				case "clear_waste_r": return "clear radioactive waste";
				case "clear_waste_t": return "clear toxic waste";
				case "build_out_greenhouse": return "build greenhouse";
				case "build_out_luxury_outpost": return "build resource outpost";
				case "build_out_tradepost_connector": "build elevator";
				case "build_out_sundome": "build sun dome";
				case "bridge_gap": return "bridge gap";
				case "repair_item": return "repair item";
				case "clear_workshop": return "clear workshop";
				default:
					return baseActionID;
			}
		},

		getLevelFeatureName: function (featureType) {
			switch (featureType) {
				case WorldConstants.FEATURE_HOLE_COLLAPSE_EDGE:
					return "collapse";
				case WorldConstants.FEATURE_HOLE_WELL_EDGE:
					return "sunwell";
				case WorldConstants.FEATURE_HOLE_MOUNTAIN_EDGE:
					return "mountain";
				case WorldConstants.FEATURE_STRUCTURE_GIGA_CENTER:
					return "giga center";
				case WorldConstants.FEATURE_STRUCTURE_PILLAR:
					return "pillar";
				case WorldConstants.FEATURE_TRAIN_TRACKS_NEW:
				case WorldConstants.FEATURE_TRAIN_TRACKS_OLD:
					return "train tracks";
			}
			log.w("no name defined for feature type [" +  featureType + "]");
			return featureType;
		},
		
		getSectorName: function (isScouted, features) {
			var template = "[a-sectortype] [n-street]";
			var params = this.getSectorTextParams(features);
			var phrase = TextBuilder.build(template, params);
			return Text.capitalize(phrase);
		},
		
		getSectorHeader: function (hasVision, features) {
			var template = "[a-street] [a-sectortype] [n-street]";
			if (features.hasCamp) {
				template = "[n-street] with camp";
			}
			if (features.hasGrove) {
				template = "[a-street] park";
			}
			if (!hasVision) {
				if (features.sunlit) {
					template = "sunlit [n-street]";
				} else {
					template = "dark [n-street]";
				}
			}
			var params = this.getSectorTextParams(features);
			var phrase = TextBuilder.build(template, params);
			return Text.capitalize(phrase);
		},
		
		getSectorDescription: function (hasVision, features) {
			let type = hasVision ? "sector-vision" : "sector-novision";
			let template = DescriptionMapper.get(type, features);
			if (features.hasGrove) {
				template = "[a] [a-street] park overrun by plant-life. In the middle there is a grove of tall trees. Though strange and wild, it also seems somehow peaceful";
			}
			let params = this.getSectorTextParams(features, hasVision);
			let phrase = TextBuilder.build(template, params);
			return Text.capitalize(phrase);
		},
		
		getSectorTextParams: function (features, hasVision) {
			// 1) Collect options for each param based on several features
			let options = this.getPossibleSectorTextParams(features, hasVision);
			
			// 2) Build final result by selecting "randomly" from options
			let rand = Math.abs(Math.floor((features.buildingDensity + features.wear + features.damage) / 2) + features.sectorX + features.sectorY);

			let pickRandom = function (options, excluded) {
				if (!options || options.length <= 0) return "";
				let validOptions = options.filter(option => !excluded.includes(option));
				if (validOptions.length == 0) return "";
				let i = rand % validOptions.length;
				return validOptions[i];
			};

			let selectFromOptions = function (key, num, optional) {
				let selection = [];
				for (let i = 0; i < num; i++) {
					let sel = pickRandom(options[key], selection);
					if (sel) {
						selection.push(sel);
					} else if (!optional) {
						log.w("could not select valid [" + key + "] " + (i+1) + "/" + num)
						log.w(options);
					}
				}
				return selection;
			};

			let result = {};
			// - adjective describing sector type, used like a-street
			result["a-sectortype"] = features.sectorType;
			// - noun describing the sector as a self-contained place such as shopping center or prison complex
			result["n-sector"] = selectFromOptions("n-sector", 1);
			// - noun describing the sector as a place that contain other buildings, such a street or plaza
			result["n-street"] = selectFromOptions("n-street", 1);
			// adjective describing the general mood of the sector, often used to qualify n-sector or n-street
			result["a-street"] = selectFromOptions("a-street", 2);
			// noun describing a building located on the sector, such as a ruin or a power plant
			result["n-building"] = selectFromOptions("n-building", 2);
			// plural noun describing several buildings located on the sector, such as high-rises or factories
			result["n-buildings"] = selectFromOptions("n-buildings", 2);
			// adjective used to modify n-building or n-buildings
			result["a-building"] = selectFromOptions("a-building", 2);
			// noun used to describe what the place or buildings are made of
			result["n-material"] = selectFromOptions("n-material", 1);
			// noun used to describe smaller items that litter or dominate the street, such as dead screens, fake trees or trash
			result["an-decos"] = selectFromOptions("an-decos", 2, !hasVision);
			// noun used to describe prominent feature in neighbouring sector (optional)
			result["n-neighbour"] = selectFromOptions("n-neighbour", 1, true);
			
			return result;
		},

		getPossibleSectorTextParams: function (features, hasVision) {
			let options = {};
			
			let addOptions = function (param, condition, values) {
				if (!condition) return;
				if (!options[param]) options[param] = [];
				for (let i = 0; i < values.length; i++) {
					options[param].push(values[i]);
				}
			};

			// - general: options always available
			addOptions("a-street", true, [ "quiet" ]);
			addOptions("n-building", true, [ "building", "structure" ]);
			addOptions("n-buildings", true, [ "buildings", "structures" ]);
			addOptions("a-building", true, [ "abandoned" ]);
			addOptions("n-material", true, [ "concrete" ]);

			// - general: options always available with vision
			addOptions("a-building", hasVision, [ "towering", "tall", "gloomy", "nondescript", "small", "typical", "monolithic", "blocky", "massive", "colossal", "immense", "ghostly", "narrow", "bulky" ]);
			addOptions("an-decos", hasVision, [ "stranded benches", "broken elevators", "debris" ]);

			// - general: fallbacks for no vision
			addOptions("n-sector", !hasVision, [ "sector" ]);
			addOptions("n-street", !hasVision, [ "sector" ]);
			addOptions("n-building", !hasVision, [ "shape", "a looming shape of a building" ]);
			addOptions("n-buildings", !hasVision, [ "shapes", "looming shapes of buildings" ]);
			addOptions("a-street", !hasVision, [ "obscure" ]);
			addOptions("a-building", !hasVision, [ "indeterminate", "obscure", "indistinct", "invisible" ]);

			// - sector type: determines n-sector and adds some others
			switch (features.sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					addOptions("n-sector", hasVision, [ "apartment complex", "residential cluster", "residential quarter" ]);
					addOptions("n-sector", hasVision && features.wealth < 4, [ "shanty town", "landfill site", "slum village" ]);
					addOptions("n-building", hasVision, [ "residential tower", "apartment house", "residential building with countless of rows of identical balconies", "housing block", "residence", "apartment building" ]);
					addOptions("n-buildings", hasVision && features.wealth < 4, [ "shacks", "huts", "slum residences", "apartment buildings", "residential towers that don't seem to have ever been connected to the grid" ]);
					addOptions("n-buildings", hasVision, [ "residential towers", "apartments", "tower blocks", "identical residential towers", "residences" ]);
					addOptions("an-decos", hasVision, [ "tram tracks", "garbabe" ]);
					addOptions("a-building", hasVision, [ "silent", "regular", "enormous" ]);
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					addOptions("n-sector", hasVision, [ "industrial complex", "industrial area", "industrial block" ]);
					addOptions("a-street", hasVision, [ "plain" ]);
					addOptions("n-building", hasVision, [ "power plant", "factory", "storehouse", "workshop" ]);
					addOptions("n-buildings", hasVision, [ "factories", "workshops", "storehouses", "warehouses", "workshops", "refineries" ]);
					addOptions("a-building", hasVision, [ "decommissioned", "regular", "enormous", "odd" ]);
					addOptions("an-decos", hasVision, [ "broken machinery" ]);
					break;
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					addOptions("n-sector", hasVision, [ "transport hall", "maintenance area", "transport hub" ]);
					addOptions("a-street", hasVision, [ "chaotic", "cluttered", "bare", "quietly thrumming" ]);
					addOptions("n-building", hasVision, [ "maintenace hub", "cable car station", "utility building", "water treatment station" ]);
					addOptions("n-buildings", hasVision, [ "utility buildings", "data centers", "control rooms", "automated control units" ]);
					addOptions("a-building", hasVision, [ "decommissioned", "inaccessible" ]);
					addOptions("an-decos", hasVision, [ "broken pipes", "broken trams", "electrical wiring" ]);
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					addOptions("n-sector", hasVision, [ "shopping mall", "shopping center", "office complex", "commercial quarter" ]);
					addOptions("n-building", hasVision, [ "shopping center", "department store", "office building", "cafe", "bar", "office building" ]);
					addOptions("n-buildings", hasVision, [ "shopping towers", "shopping malls", "shops", "stores", "offices", "office towers" ]);
					addOptions("a-building", hasVision, [ "empty", "deserted", "ransacked", "ensormous", "bizarre", "symmetrical", "colourful" ]);
					addOptions("an-decos", hasVision, [ "empty fountains", "abandoned stalls", "broken glass" ]);
					break;
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					addOptions("n-sector", hasVision, [ "prison complex", "amusement park", "library", "park" ]);
					addOptions("a-street", hasVision, [ "dignified", "solemn", "grand", "ordinary" ]);
					addOptions("n-building", hasVision, [ "library", "prison", "school", "university building", "park", "public square", "sports field", "metro station", "research laboratory", "government building" ]);
					addOptions("n-buildings", hasVision, [ "public buildings", "government buildings" ]);
					addOptions("a-building", hasVision, [ "empty", "inaccessible", "enormous", "uncanny", "symmetrical" ]);
					addOptions("an-decos", hasVision, [ "withered trees", "trash", "dead trees" ]);
					break;
				case SectorConstants.SECTOR_TYPE_EMPTY:
					addOptions("n-sector", hasVision, [ "space" ]);
					break;
			}


			// - sector style: adds some adjectives and defined material
			switch (features.sectorStyle) {
				case SectorConstants.STYLE_CITTADINIAN:
					addOptions("n-street", hasVision, [ "corner", "quarter" ]);
					addOptions("a-street", hasVision, [ "strange", "snug" ]);
					addOptions("n-building", hasVision, [ "temple", "small square", "decorative fountain", "war-time bunker" ]);
					addOptions("n-buildings", hasVision, [ "single-family houses", "little shops" ]);
					addOptions("a-building", hasVision, [ "strange", "beige", "yellow", "light brown", "stacked" ]);
					addOptions("n-material", hasVision, [ "brick", "stone", "recycled brick" ]);
					addOptions("an-decos", hasVision, [ "drinking fountains", "benches", "defunct sun mirrors" ]);
					break;
				case SectorConstants.STYLE_HUMANIST:
					addOptions("n-street", hasVision, [ "section", "span" ]);
					addOptions("a-street", hasVision, [ "typical", "dense", "planter-dotted", "grey" ]);
					addOptions("n-building", hasVision, [ "bus stop" ]);
					addOptions("n-buildings", hasVision, [ "identical high-rises" ]);
					addOptions("a-building", hasVision, [ "white", "mass-produced", "tall", "narrow", "concrete", "windowless", "utilitarian", "distinct", "sober" ]);
					addOptions("n-material", hasVision, [ "steel", "metal", "reinforced plastic" ]);
					addOptions("an-decos", hasVision, [ "bot docks", "planters", "vending machines", "trash bins" ]);
					break;
				case SectorConstants.STYLE_INDUSTRIAL:
					addOptions("n-street", hasVision, [ "sector", "area" ]);
					addOptions("a-street", hasVision, [ "industrial", "blocky", "grey", "functional" ]);
					addOptions("n-building", hasVision, [ "factory", "warehouse", "transport hub", "manufacturing hall", "power plant", "office" ]);
					addOptions("n-buildings", hasVision, [ "factories", "halls" ]);
					addOptions("a-building", hasVision, [ "industrial", "grey", "white", "yellow", "orange", "striped", "blocky", "concrete", "massive", "faceless" ]);
					addOptions("n-material", hasVision, [ "plastic panel", "steel" ]);
					addOptions("an-decos", hasVision, [ "bot docks", "traffic stripes", "transport rails", "containers" ]);
					break;
				case SectorConstants.STYLE_KARBOQUE:
					addOptions("n-sector", hasVision, [ "sports hall" ]);
					addOptions("n-street", hasVision, [ "sector", "zone" ]);
					addOptions("a-street", hasVision, [ "symmetric", "functional", "organised", "measured", "geometric", "colorless", "uniform", "accessible", "low" ]);
					addOptions("n-building", hasVision, [ "mid-level staircase", "official plaza" ]);
					addOptions("a-building", hasVision, [ "robust", "grey", "massive", "sturdy", "symmetric", "big", "rectangular", "hive-like" ]);
					addOptions("n-material", hasVision, [ "concrete" ]);
					addOptions("an-decos", hasVision, [ "visible pipes", "small windows", "statues" ]);
					break;
				case SectorConstants.STYLE_KIEVAN:
					addOptions("n-street", hasVision, [ "walkway" ]);
					addOptions("a-street", hasVision, [ "dainty", "strange", "crooked", "mysterious" ]);
					addOptions("n-building", hasVision, [ "bunker", "museum" ]);
					addOptions("a-building", hasVision, [ "dainty", "strange", "blue", "decorative", "purple", "tall", "distinct", "tiled" ]);
					addOptions("n-material", hasVision, [ "tile", "stone", "glass" ]);
					addOptions("an-decos", hasVision, [ "coloured windows", "painted furniture" ]);
					break;
				case SectorConstants.STYLE_MODERN:
					addOptions("n-street", hasVision, [ "path" ]);
					addOptions("a-street", hasVision, [ "modern", "unified", "bare", "angled", "intertwined", "glass-decorated" ]);
					addOptions("n-building", hasVision, [ "vertical plaza" ]);
					addOptions("n-buildings", hasVision, [ "faceless buildings", "surfaces for holograms" ]);
					addOptions("a-building", hasVision, [ "glossy", "dizzying", "spartan" ]);
					addOptions("n-material", hasVision, [ "glass", "steel", "metal", "nanoglass", "aerographite" ]);
					addOptions("an-decos", hasVision, [ "holopanels", "small elevators" ]);
					break;
				case SectorConstants.STYLE_NEOWESTERN:
					addOptions("n-street", hasVision, [ "overpass" ]);
					addOptions("a-street", hasVision, [ "rich", "multi-layered", "imaginative" ]);
					addOptions("n-building", hasVision, [ "artificial garden" ]);
					addOptions("a-building", hasVision, [ "strange", "wooden", "windowed" ]);
					addOptions("n-material", hasVision, [ "wood", "artificial stone" ]);
					addOptions("an-decos", hasVision, [ "recycling spots" ]);
					break;
				case SectorConstants.STYLE_SLUM_GENERAL:
					addOptions("n-street", hasVision, [ "passage" ]);
					addOptions("a-street", hasVision, [ "packed" ]);
					addOptions("a-building", hasVision, [ "rickety", "improvised", "poor" ]);
					addOptions("n-material", hasVision, [ "metal", "aluminium" ]);
					addOptions("an-decos", hasVision, [ "piles of trash" ]);
					break;
				case SectorConstants.STYLE_SLUM_HUN:
					addOptions("n-street", hasVision, [ "passage" ]);
					addOptions("a-street", hasVision, [ "distinctly decorated" ]);
					addOptions("n-buildings", hasVision, [ "little stalls" ]);
					addOptions("a-building", hasVision, [ "closely leaning", "poor" ]);
					addOptions("n-material", hasVision, [ "corrugated metal" ]);
					addOptions("an-decos", hasVision, [ "garbage" ]);
					break;
				case SectorConstants.STYLE_WESTERN:
					addOptions("n-street", hasVision, [ "way" ]);
					addOptions("a-street", hasVision, [ "organic", "decorative", "utopian", "harmonious" ]);
					addOptions("n-building", hasVision, [ "bus stop", "withered park", "parking lot" ]);
					addOptions("n-buildings", hasVision, [ "buildings in different styles and materials" ]);
					addOptions("a-building", hasVision, [ "brown", "green", "distinct", "single", "windowed", "decoratively roofed" ]);
					addOptions("n-material", hasVision, [ "stone", "brick" ]);
					break;
			}

			// - wealth: adds some adjectives
			if (features.wealth > 7) {
				addOptions("a-street", hasVision, [ "upscale", "affluent", "opulent" ]);
				addOptions("a-building", hasVision, [ "luxury", "exlusive", "comfortable" ]);
			} else if (features.wealth > 3) {
				addOptions("a-street", hasVision, [ "standard", "regular" ]);
				addOptions("a-building", hasVision, [ "standard", "regular" ]);
			} else {
				addOptions("a-street", hasVision, [ "shabby", "chaotic", "scruffy" ]);
				addOptions("a-building", hasVision, [ "sketchy", "bleak", "dishevelled", "grey", "graffiti-covered", "haphazardly built", "decrepit", "tilted" ]);
				addOptions("an-decos", hasVision, [ "collapsed shacks", "garbage piles", "rusted pipes", "empty cans" ]);
			}

			// - building density: determines n-street, adds some adjectives
			let isResCom = features.sectorType == SectorConstants.SECTOR_TYPE_RESIDENTIAL || features.sectorType == SectorConstants.SECTOR_TYPE_COMMERCIAL;
			if (features.buildingDensity < 3) {
				addOptions("n-street", !hasVision, [ "space" ]);
				addOptions("n-street", hasVision, [ "sector", "space", "square" ]);
				addOptions("n-street", hasVision && isResCom, [ "plaza", "courtyard" ]);
				addOptions("a-street", hasVision, [ "spacious", "enormous" ]);
				addOptions("a-street", true, [ "wide" ]);
			} else if (features.buildingDensity < 6) {
				addOptions("n-street", !hasVision, [ "space" ]);
				addOptions("n-street", hasVision, [ "square", "area", "hall", "throughfare" ]);
				addOptions("n-street", hasVision & isResCom, [ "boulevard", "avenue", "arcade" ]);
				addOptions("a-street", true, [ "wide", "spacious" ]);
				addOptions("a-building", hasVision, [ "large" ]);
			} else if (features.buildingDensity < 9) {
				addOptions("n-street", !hasVision, [ "street" ]);
				addOptions("n-street", hasVision, [ "street", "street", "alley", "complex", "sector", "passageway", "arcade", "tunnel", "hallway", "pathway" ]);
				addOptions("a-street", true, [ "narrow" ]);
			} else {
				addOptions("n-street", !hasVision, [ "passage" ]);
				addOptions("n-street", hasVision, [ "corridor", "passage", "alley" ]);
				addOptions("a-street", hasVision, [ "dense", "low" ]);
				addOptions("a-street", true, [ "narrow", "cramped", "tight" ]);
			}

			// - wear and damage: mostly adjectives
			switch (features.condition) {
				case SectorConstants.SECTOR_CONDITION_RUINED:
					addOptions("a-street", true, [ "jagged", "rugged", "debris-filled" ]);
					addOptions("a-street", hasVision, [ "ruined", "crumbling" ]);
					addOptions("n-buildings", hasVision, [ "crumbling ruins" ]);
					addOptions("a-building", hasVision, [ "ruined", "skeletal", "brick" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_DAMAGED:
					addOptions("a-street", true, [ "jagged", "rugged", "debris-filled" ]);
					addOptions("a-street", hasVision, [ "damaged", "destroyed", "broken" ]);
					addOptions("a-street", hasVision, [ "damaged", "destroyed", "broken" ]);
					addOptions("a-building", hasVision, [ "damaged", "badly damaged" ]);
					addOptions("an-decos", hasVision, [ "collapsed tunnels" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_ABANDONED:
					addOptions("a-street", true, [ "desolate", "eerily quiet" ]);
					addOptions("a-street", hasVision, [ "bleak", "dirty", "nondescript" ]);
					addOptions("a-building", hasVision, [ "decaying", "desolate", "slowly decomposing", "long since abandoned", "crumbling", "long-abandoned", "wooden", "dull" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_WORN:
					addOptions("a-building", true, [ "desolate" ]);
					addOptions("a-building", hasVision, [ "abandoned", "bleak", "colorful", "nondescript" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_RECENT:
					addOptions("a-building", true, [ "modern" ]);
					addOptions("a-building", hasVision, [ "well-preserved", "comfortable looking", "glass-walled" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_MAINTAINED:
					addOptions("a-street", true, [ "humming" ]);
					addOptions("a-street", hasVision, [ "modern", "slick", "geometric" ]);
					addOptions("a-building", hasVision, [ "aereographite", "screen-covered" ]);
					break;
			}

			// - sunlight: adjectives
			if (features.sunlit) {
				addOptions("a-street", true, [ "sunlit", "sun-swathed", "dazzling", "bright", "windy" ]);
				addOptions("a-street", hasVision && features.wear < 5 && features.damage < 5, [ "gleaming", "glistening" ]);
				addOptions("a-street", hasVision && features.wear > 5, [ "overgrown" ]);
				addOptions("a-building", hasVision, [ "vibrant", "sunlit" ]);
				addOptions("an-decos", hasVision, [ "persistent weeds" ]);
			} else {
				addOptions("a-street", true, [ "dark", "dark", "shadowy", "dull", "indistict" ]);
				addOptions("a-street", hasVision, [ "dull", "gloomy" ]);
			}

			// - hazards: mostly adjectives
			if (features.hazards.cold > 0) {
				addOptions("a-street", true, [ "cold", "cold", "drafty", "chilly" ]);
			}
			if (features.hazards.radiation > 0) {
				addOptions("a-street", true, [ "desolate", "odd-smelling", "eerie" ]);
				addOptions("n-building", hasVision, [ "nuclear power plant", "nuclear waste depot", "nuclear waste processing unit" ]);
				addOptions("a-building", hasVision, [ "abandoned" ]);
			}
			if (features.hazards.poison > 0) {
				addOptions("a-street", true, [ "foul-smelling", "abandoned" ]);
				addOptions("a-street", hasVision, [ "polluted", "dirty" ]);
				addOptions("n-building", hasVision, [ "chemical plant", "refinery", "garbage processing plant" ]);
				addOptions("a-building", hasVision, [ "abandoned", "stained" ]);
			}
			if (features.hazards.flooded > 0) {
				addOptions("a-street", true, [ "flooded", "watery" ]);
				addOptions("a-street", hasVision, [ "water-logged", "soggy" ]);
				addOptions("a-building", hasVision, [ "flooded", "water-damaged" ]);
			}
			if (features.hazards.debris) {
				addOptions("a-street", true, [ "jagged", "debris-filled" ]);
				addOptions("a-street", hasVision, [ "destroyed", "damaged", "ruined" ]);
				addOptions("n-building", hasVision, [ "building" ]);
				addOptions("a-building", hasVision, [ "destroyed", "unrecognizable", "hollowed out", "crumbling" ]);
				addOptions("an-decos", hasVision, [ "debris" ]);
			}
			if (features.hazards.territory) {
				addOptions("a-street", true, [ "inhabited" ]);
				addOptions("an-decos", hasVision, [ "trash" ]);
			}

			// - level population: adjectives
			if (features.habitability == 0) {
				addOptions("a-street", hasVision, [ "empty", "uninhabited", "desolate", "deserted", "dusty" ]);
				addOptions("a-building", hasVision, [ "long abandoned", "empty" ]);
			} else if (features.habitability < 1) {
				addOptions("a-street", hasVision, [ "calm" ]);
				addOptions("a-building", hasVision, [ "empty" ]);
			} else {
				addOptions("a-building", hasVision, [ "recently looted" ]);
				addOptions("an-decos", hasVision, [ "signs of recent scavengers" ]);
			}

			// - activity: adjectives
			if (features.activity < 3) {
				addOptions("a-street", hasVision, [ "deserted", "empty" ]);
				addOptions("a-building", hasVision, [ "deserted" ]);
			} else if (features.activity > 8) {
				addOptions("a-building", hasVision, [ "ranscaked", "looted" ]);
			}

			// - level raid danger factor
			if (features.raidDangerFactor > 1) {
				addOptions("a-street", hasVision, [ "looted" ]);
				addOptions("a-building", hasVision, [ "ransacked", "damaged", "plundered", "looted" ]);
			}

			// - level: architectural style / age
			if (features.level < 6) {
				addOptions("a-street", hasVision, [ "ancient", "quaint" ]);
				addOptions("a-building", hasVision, [ "ancient", "obsolete", "quaint", "historical", "ornate", "baroque", "decorative" ]);
				addOptions("an-decos", hasVision, [ "wooden elements" ]);
			} else if (features.level < 14) {
				addOptions("a-street", hasVision, [ "dated" ]);
				addOptions("a-building", hasVision, [ "dated" ]);
				addOptions("an-decos", hasVision, [ "faux windows" ]);
			} else if (features.level < 18) {
				addOptions("a-street", hasVision, [ "modern" ]);
				addOptions("a-building", hasVision, [ "modern", "stylish", "functional" ]);
			} else {
				if (features.wealth > 5) {
					addOptions("a-street", hasVision, [ "modern" ]);
					addOptions("a-building", hasVision, [ "glass-walled", "stylish" ]);
				}
				addOptions("an-decos", hasVision, [ "dead signs" ]);
			}

			// - affiliation
			switch (features.affiliation) {
				case SectorConstants.SECTOR_AFFILIATION_AGRICORP:
					addOptions("n-sector", hasVision, [ "farm complex", "agricultural complex" ]);
					addOptions("a-street", hasVision, [ "modern", "white", "streamlined", "tidy", "musty", "earth-smelling" ]);
					addOptions("n-building", hasVision, [ "research facility" ]);
					addOptions("n-buildings", hasVision, [ "vertical farms", "dead farms" ]);
					addOptions("a-building", hasVision, [ "modern", "windowless", "hermetic" ]);
					addOptions("an-decos", hasVision, [ "signs with a leaves-and-fish logo", "corporate slogans", "small vehicles" ]);
					break;
				case SectorConstants.SECTOR_AFFILIATION_MINECORP:
					addOptions("n-sector", hasVision, [ "power plant", "warehouse", "manufacturing facility", "refinery" ]);
					addOptions("a-street", hasVision, [ "industrial", "mechanical" ]);
					addOptions("n-building", hasVision, [ "factory", "warehouse" ]);
					addOptions("n-buildings", hasVision, [ "vehicle garages", "bot garages" ]);
					addOptions("a-building", hasVision, [ "grey", "orange", "functional", "high-security" ]);
					addOptions("an-decos", hasVision, [ "logos with a big G" ]);
					break;
				case SectorConstants.SECTOR_AFFILIATION_HANSA:
					addOptions("a-street", hasVision, [ "rugged" ]);
					addOptions("a-building", hasVision, [ "well-lived" ]);
					break;
				case SectorConstants.SECTOR_AFFILIATION_DONBALISM:
					addOptions("n-building", hasVision, [ "improvised church" ]);
					addOptions("a-building", hasVision, [ "recently renovated" ]);
					break;
			}

			// - misc
			if (features.campable) {
				addOptions("a-street", hasVision, [ "calm", "safe", "comfortable" ]);
			}
			if (features.numNeighbours == 1) {
				addOptions("a-street", hasVision, [ "dead-end", "secluded" ]);
			}
			if (features.enemyTags.indexOf("flora") >= 0) {
				addOptions("a-street", hasVision, [ "musty" ]);
			}
			if (features.affiliation == SectorConstants.SECTOR_AFFILIATION_MINECORP) {
				addOptions("a-street", hasVision, [ "functional" ]);
			}

			// - enenmies
			addOptions("n-enemies", hasVision, [ features.enemyTags.map(tag => TextConstants.pluralify(tag)) ]);

			// - neighbours: level features or neighbouring districts as n-neighbour (optional param)
			if (features.neighboursFeatures.length > 0) {
				addOptions("n-neighbour", hasVision, features.neighboursFeatures.map(featureType => TextConstants.getLevelFeatureName(featureType)));
			} else {
				for (let i = 0; i < features.neighboursDistricts.length; i++) {
					let districtType = features.neighboursDistricts[i];
					addOptions("n-neighbour", hasVision && districtType != features.districtType, [ districtType + " district" ]);
				}
			}

			return options;
		},
		
		getPassageFoundMessage: function (passageVO, direction, sunlit, isBuilt) {			
			let passageType = passageVO.type;
			let textKey = "passage_found_" + passageType + "_message";

			if (isBuilt) {
				textKey = "passage_found_" + passageType + "_built_message";
			}

			if (passageVO.type == MovementConstants.PASSAGE_TYPE_HOLE) {
				if (direction === PositionConstants.DIRECTION_UP) {
					if (!isBuilt) {
						if (sunlit) {
							textKey = "passage_found_hole_up_sunlit_message";
						} else {
							textKey = "passage_found_hole_up_dark_message";
						}
					}
				} else {
					if (!isBuilt) {
						if (sunlit) {
							textKey = "passage_found_hole_down_sunlit_message";
						} else {
							textKey = "passage_found_hole_down_dark_message";
						}
					}
				}
			}

			return Text.t("story.messages." + textKey);
		},
		
		getPassageRepairedMessage: function (passageType, direction, sectorPosVO, numCampsBuilt) {
			let directionName = (direction === PositionConstants.DIRECTION_UP ? " up" : " down");
			let includeLevelInPosition = numCampsBuilt > 1;
			switch (passageType) {
				case MovementConstants.PASSAGE_TYPE_HOLE:
					return "Elevator " + directionName + " built at " + sectorPosVO.getInGameFormat(includeLevelInPosition);
				case MovementConstants.PASSAGE_TYPE_ELEVATOR:
					return "Elevator " + directionName + " repaired at " + sectorPosVO.getInGameFormat(includeLevelInPosition);
				case MovementConstants.PASSAGE_TYPE_STAIRWELL:
					return "Stairwell " + directionName + " repaired at " + sectorPosVO.getInGameFormat(includeLevelInPosition);
				default:
					log.w("Unknown passage type: [" + passageType + "]")
					return "Passage " + directionName + " ready at " + sectorPosVO.getInGameFormat(includeLevelInPosition);
			}
		},
				
		getPassageDescription: function (passageVO, direction, isBuilt, isShort) {
			let passageType = passageVO.type;
			let passageTypeName = passageType;
			let directionName = (direction === PositionConstants.DIRECTION_UP ? "up" : "down");

			let result = "";

			if (isShort) {
				let statusDescription = this.getPassageStatusDescription(passageVO, isBuilt);
				result = Text.t("ui.map.passage_description_template_short", { direction: directionName, passageType: passageTypeName, status: statusDescription });
			} else {
					let textKey = "ui.exploration.sector_status_passage_" + passageType + "_default_description";

					if (isBuilt) {
						textKey = "ui.exploration.sector_status_passage_" + passageType + "_built_description";
					}

					if (!isBuilt && passageType == MovementConstants.PASSAGE_TYPE_HOLE) {
						textKey = "ui.exploration.sector_status_passage_hole_" + directionName + "_default_description";
					}

					result = Text.t(textKey, { direction: directionName });
			}

			return result;
		},

		getPassageStatusDescription: function (passageVO, isBuilt) {
			switch (passageVO.type) {
				case MovementConstants.PASSAGE_TYPE_PREBUILT:
					return Text.t("ui.map.passage_status_prebuilt");
				case MovementConstants.PASSAGE_TYPE_HOLE:
					return isBuilt ? Text.t("ui.map.passage_status_built") : Text.t("ui.map.passage_status_hole");
				case MovementConstants.PASSAGE_TYPE_ELEVATOR:
					return isBuilt ? Text.t("ui.map.passage_status_repaired") : Text.t("ui.map.passage_status_broken");
				case MovementConstants.PASSAGE_TYPE_STAIRWELL:
					return isBuilt ? Text.t("ui.map.passage_status_repaired") : Text.t("ui.map.passage_status_broken");
			}
		},
		
		getReadBookMessage: function (itemVO, bookType, campOrdinal, storyFlags) {
			let features = {};
			let itemName = ItemConstants.getItemDisplayName(itemVO);
			features.bookType = bookType;
			features.bookName = itemName;
			features.bookLevel = itemVO.level || 1;
			features.campOrdinal = campOrdinal;
			features.randomSeed = itemVO.itemID;
			let params = this.getBookTextParams(features, storyFlags);
			
			let template = DescriptionMapper.get("book-intro", features) + " " + DescriptionMapper.get("book-description", features);
			let phrase = TextBuilder.build(template, params);
			
			return phrase;
		},
		
		getBookTextParams: function (features, storyFlags) {
			var result = {};
			
			let levels = [];
			switch (features.bookLevel) {
				case 1:
					levels.push("simple");
					levels.push("dated");
					levels.push("simplistic");
					levels.push("biased");
					break;
				case 2:
					levels.push("basic");
					levels.push("regular");
					levels.push("decent");
					break;
				case 3:
					levels.push("advanced");
					levels.push("detailed");
					levels.push("insightful");
					levels.push("heavy");
					break;
			}
			result["a-level"] = DescriptionMapper.pickRandom(levels, features);
			
			let styles = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
				case ItemConstants.bookTypes.engineering:
				case ItemConstants.bookTypes.history:
					styles.push("informative");
					styles.push("detailed");
					styles.push("dry");
					styles.push("insightful");
					styles.push("meandering");
					styles.push("illustrated");
					styles.push("scientific");
					styles.push("formal");
					styles.push("systematic");
					styles.push("official");
					break;
				case ItemConstants.bookTypes.fiction:
					styles.push("fantastical");
					styles.push("inspiring");
					styles.push("realistic");
					styles.push("action-packed");
					styles.push("comedic");
					styles.push("tragic");
					styles.push("romantic");
					styles.push("dramatic");
					styles.push("whimsical");
					styles.push("boring");
					styles.push("dark");
					styles.push("exciting");
					styles.push("haunting");
					styles.push("glamorous");
					styles.push("heartfelt");
					styles.push("authentic");
					styles.push("graphic");
					styles.push("slow");
					styles.push("elaborate");
					styles.push("outlandish");
					break;
			}
			result["a-style"] = DescriptionMapper.pickRandom(styles, features);
			
			let goodAdjectives = [];
			goodAdjectives.push("eloquent");
			goodAdjectives.push("memorable");
			goodAdjectives.push("enjoyable");
			goodAdjectives.push("excellent");
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
				case ItemConstants.bookTypes.engineering:
				case ItemConstants.bookTypes.history:
					goodAdjectives.push("detailed");
					goodAdjectives.push("comprehensive");
					goodAdjectives.push("exhaustive");
					goodAdjectives.push("engaging");
					goodAdjectives.push("thorough");
					goodAdjectives.push("useful");
					break;
				case ItemConstants.bookTypes.fiction:
					goodAdjectives.push("brilliant");
					goodAdjectives.push("vivid");
					goodAdjectives.push("absorbing");
					break;
			}
			result["a-good"] = DescriptionMapper.pickRandom(goodAdjectives, features);
			
			let badAdjectives = [];
			badAdjectives.push("tedious");
			badAdjectives.push("monotonous");
			badAdjectives.push("dull");
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
				case ItemConstants.bookTypes.engineering:
				case ItemConstants.bookTypes.history:
					badAdjectives.push("impractical");
					badAdjectives.push("vague");
					break;
				case ItemConstants.bookTypes.fiction:
					badAdjectives.push("forgettable");
					badAdjectives.push("unoriginal");
					badAdjectives.push("tacky");
					break;
			}
			result["a-bad"] = DescriptionMapper.pickRandom(badAdjectives, features);
			
			let topics = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
					topics.push("a species of slug that thrives in radioactive environments");
					topics.push("the infrastructure of the City");
					topics.push("the ocean");
					topics.push("forests");
					topics.push("ventilation systems in the City");
					topics.push("medicine");
					topics.push("electronics");
					topics.push("how to protect yourself from the harmful effects of sunlight");
					topics.push("how raw rubber is processed into many useful forms");
					topics.push("cancer treatment");
					topics.push("dna");
					topics.push("greenhouse agriculture");
					topics.push("evolution");
					topics.push("plate tetonics");
					topics.push("batteries");
					topics.push("fossils");
					topics.push("earthquakes");
					topics.push("fermentation");
					topics.push("viruses");
					topics.push("the solar calendar");
					topics.push("strange agricultural practices involving shamanism");
					topics.push("radar technology");
					topics.push("mathematics");
					topics.push("the ambitious and un-realised plan the Dictatorship government had for expansion of the City");
					topics.push("ecosystems");
					topics.push("dentistry");
					topics.push("computers");
					topics.push("volcanoes");
					topics.push("immortality through medical advancements");
					topics.push("meteorites");
					topics.push("the printing press");
					topics.push("optical lenses");
					topics.push("burning garbage for energy");
					topics.push("fertilizers");
					topics.push("water recycling facilities of the City");
					topics.push("the possibility of eternal life thanks to advanced medicine");
					
					if (features.bookLevel == 1) {
						topics.push("weapons of old");
						topics.push("the many uses of baking soda");
						topics.push("plate tectonics");
						topics.push("an ancient material called wood");
						topics.push("food preservation");
					}
					if (features.bookLevel == 2) {
						topics.push("food crop rotation");
						topics.push("gunpowder");
						topics.push("electricity");
						topics.push("radio technology");
						topics.push("the magnetic compass");
						topics.push("the planet's atmosphere");
						topics.push("greenhouse maintenance");
						topics.push("biochemistry");
						topics.push("origin of the calendar, the movement of the sun and the moons");
					}
					if (features.bookLevel == 3) {
						topics.push("electromagnetism");
						topics.push("other planets");
						topics.push("atomic weapons");
						topics.push("dark matter");
						topics.push("condensing and storing memories in a reusable format");
					}
					break;
					
				case ItemConstants.bookTypes.fiction:
					topics.push("pre-Fall popular music");
					topics.push("life in the Dark Levels");
					topics.push("the early immigrants to the City");
					topics.push("an island far away");
					topics.push("travel between different planets");
					topics.push("a famous actress");
					topics.push("life in the Slums");
					topics.push("life of a crime detective on the Surface");
					topics.push("ghosts in the uninhabited levels of the City");
					topics.push("an ancient volcano");
					topics.push("undersea travel");
					topics.push("a monster that lives in the core of the planet.");
					topics.push("a terrifying sea monster");
					topics.push("the relationship of a boy and his bat");
					topics.push("a war");
					topics.push("an asteroid hitting the City");
					topics.push("a Blue Army soldier and what she did after the collapse of the Dictatorship");
					break;
					
				case ItemConstants.bookTypes.history:
					topics.push("biological warfare");
					topics.push("pre-City civilizations");
					topics.push("the development of agriculture");
					topics.push("rise of sea levels");
					topics.push("the history of painting");
					topics.push("the industrial revolution");
					topics.push("the digital revolution");
					topics.push("property rights to ground and mining sites");
					topics.push("the population decline that was apparent in the City already before the Fall");
					topics.push("a specific ethnic group");
					topics.push("a famine soon after the founding of the City");
					topics.push("a pre-City global legal organization");
					topics.push("the history of mathematics");
					topics.push("a great scientific project");
					topics.push("the city states period");
					topics.push("the city wars");
					topics.push("class tensions");
					topics.push("population crisis");
					topics.push("shipwrecks");
					topics.push("architectural styles on differetn Levels");
					topics.push("slavery");
					topics.push("the magical beliefs of people living in a specific part of the City");
					topics.push("a historical dictatorship");
					topics.push("sacred places in the City");
					
					if (features.bookLevel == 1) {
						topics.push("the early City");
						topics.push("architectural styles in different parts of the City");
						topics.push("the effects of a major earthquake on the City");
						topics.push("pre-Fall religions and how they contributed to several wars");
					}
					if (features.bookLevel == 2) {
						topics.push("the history of a powerful crime syndicate");
						topics.push("a great war between two factions within the City");
					}
					if (features.bookLevel == 3) {
						topics.push("the history of a powerful crime syndicate");
						topics.push("how the pre-Fall Government was formed");
					}
					break;
					
				case ItemConstants.bookTypes.engineering:
					topics.push("an industrial process");
					topics.push("transistors");
					topics.push("nuclear reactors");
					topics.push("nuclear waste containment");
					topics.push("dead air");
					topics.push("sundomes");
					topics.push("radio");
					topics.push("robotics");
					topics.push("structures to stabilise the City against earthquakes");
					topics.push("organ transfers");
					topics.push("architecture");
					topics.push("3D printing");
					topics.push("machine control systems");
					topics.push("mirror systems to distribute sunlight");
					topics.push("robot design");
					topics.push("elevators in the city");
					topics.push("statistics");
					topics.push("space flight");
					topics.push("electronics");
					topics.push("bridges");
					topics.push("the Zones, Districts, Sectors and other divisions of the City");
					
					if (features.bookLevel == 1) {
						topics.push("steel production");
						topics.push("rubber production");
						topics.push("radioactive waste management");
					}
					if (features.bookLevel == 2) {
						topics.push("artificial intelligence");
						topics.push("a programming language");
					}
					if (features.bookLevel == 3) {
						topics.push("programming");
						topics.push("the making of robots");
						topics.push("programming");
					}
					break;
			}
			result["n-topic"] = DescriptionMapper.pickRandom(topics, features);
			
			let objects = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.engineering:
					objects.push("transistors");
					objects.push("robots");
					objects.push("machines you don't really understand, but it seems they were used to stabilise the City");
					objects.push("a level-wide solar screen called the Ceiling");
					objects.push("an irrigation system in a pre-Fall greenhouse");
					objects.push("a household appliance");
					
					if (features.bookLevel == 1) {
						objects.push("engines powering the old elevators");
						objects.push("a weapon");
						objects.push("a medical instrument");
					}
					if (features.bookLevel == 2) {
						objects.push("an information network spanning an entire level of the City");
						objects.push("a flying vehicle");
						objects.push("a robot meant for collecting and processing garbage");
						objects.push("a device used to store and transmit data");
					}
					if (features.bookLevel == 3) {
						objects.push("different types of robots");
						objects.push("a great rocket");
						objects.push("a sewage system");
					}
					break;
			}
			result["n-object"] = DescriptionMapper.pickRandom(objects, features);
			
			let themes = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.fiction:
					themes.push("a refugee from another continent");
					themes.push("a mine worker who saw the sun for the first time");
					themes.push("a terrifying storm that ripped open an edge of the City");
					themes.push("a great flood");
					themes.push("a shaman who could predict weather");
					themes.push("a war between different factions within the City");
					themes.push("the rise of a heroic leader");
					themes.push("a Slum-dweller who fights many obstacles but eventually moves up in the City");
					themes.push("the rise and fall of a criminal gang in the pre-Fall Slums");
					themes.push("a man who abandons the inhabited parts of the City and tries to find the Ground on their own");
					themes.push("a group of scientists trapped on a research station in the old parts of the City");
					themes.push("a romance between two people who are forced to work far away from each other");
					themes.push("a bureaucrat whose job is to assess the value of an individual's contribution to the City");
					themes.push("the unification of the people in the City under one Government");
					themes.push("someone missing a far-away homeland");
					themes.push("ghosts that are said to wander the abandoned parts of the City");
					themes.push("a girl who never left her room");
					themes.push("a team of people working on the elevators and trams of a part of the City");
					themes.push("a complex social hierarchy in the office of a pre-Fall newspaper");
					themes.push("a neighbourhood in the City where there were only old people");
					themes.push("the life of a rich but lonely businessman");
					themes.push("a boy's friendship with a robot");
					themes.push("a computer program that made people forget who they were");
					themes.push("forgotten places outside the City");
					break;
			}
			result["c-theme"] = DescriptionMapper.pickRandom(themes, features);
			
			let facts = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
					facts.push("the City's population was already on decline before the Fall");
					facts.push("ancient civilizations often used wood as a building material, because it was plentiful on the Ground");
					facts.push("there are were several Mining Towns deep in the City");
					facts.push("the maintenance of the City below certain levels was mainly done by robots");
					facts.push("most of the food greenhouses of the City were on its edges");
					facts.push("most of the water in the City is rainwater collected on the Surface and the Ground");
					facts.push("there are animals that live their entire lives underwater");
					facts.push("spider silk is the strongest known natural material");
					facts.push("bananas are radioactive");
					facts.push("you can't taste food without saliva");
					break;
				case ItemConstants.bookTypes.history:
					facts.push("a few powerful mining corporations held great power before the Fall");
					facts.push("ancient civilizations based their calendars on four seasons");
					facts.push("the City was originally built on swamp land");
					facts.push("the City was inhabited by people from several old civilizations");
					facts.push("the City has experienced several famines during its history");
					facts.push("the City was started to be built about 700 years ago");
					facts.push("there was a time when all religions were banned in the City");
					facts.push("the last underwater research station closed down decades before the Fall");
					facts.push("several places in the City seem to be cursed due to a past injustice or horror");
					break;
				case ItemConstants.bookTypes.engineering:
					facts.push("the lower levels of the City have unequal heights");
					facts.push("most of the City used to be lit by electrical lights");
					facts.push("the Surface of the City used to be protected by one massive Dome");
					facts.push("sunlight used to be reflected deeper into the City with complex mirror systems");
					facts.push("parts of the City are built into the mountain");
					facts.push("the Ocean is deeply polluted");
					facts.push("at its population peak, the City needed a complex cooling system just because of the amount of heat generated by its people");
					// TODO get general facts like these in features / otherwise
					// TODO add more and splt by level so these don't get repetitive
					// facts.push("there are X levels in the City");
					// facts.push("the lowest level of the City is in fact number X");
					break;
			}
			result["c-fact"] = DescriptionMapper.pickRandom(facts, features);
			
			let events = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.history:
					events.push("a war that the City waged against some far-away civilization hundreds of years ago");
					events.push("wars in the City in the past 500 years");
					events.push("the building of the first levels of the City");
					events.push("the migration to the City from some far-away island");
					events.push("something called the Great Famine which took place a few decades before the book was written");
					events.push("the establishment of the city-wide Government");
					events.push("a major gardener uprising");
					events.push("a scandal related to pollution outside the City");
					events.push("a famine outside the City and the resulting immigration wave");
					events.push("a nuclear power plant accident where waste was released to the lower levels of the City");
					events.push("a major shift in agriculture from the Ground into the Greenhouses");
					events.push("a series of terror attacks in the City");
					events.push("the first computer virus");
					events.push("a devastating war between the City and another state somewhere outside it");
					events.push("women's suffrage");
					events.push("a series of experiments on augmenting the human body with implants");
					events.push("a scandal involving an influential politician");
					events.push("a doomed attempt by a religious sect to go live outside the City a few decades ago");
					events.push("building of a small manned space station orbiting the planet");
					break;
			}
			result["c-event"] = DescriptionMapper.pickRandom(events, features);
			
			return result;
		},
		
		getReadNewspaperMessage: function (itemVO) {
			let features = {};
			let itemName = ItemConstants.getItemDisplayName(itemVO);
			features.itemName = itemName;
			features.itemLevel = itemVO.level || 1;
			features.randomSeed = itemVO.itemID;
			let params = this.getNewspaperTextParams(features);
			
			let template = "You leaf through the newspaper. " + DescriptionMapper.get("newspaper-description", features);
			let phrase = TextBuilder.build(template, params);
			
			return phrase;
		},
		
		getNewspaperTextParams: function (features) {
			let result = {};
			
			let events = [];
			events.push("a worker strike");
			events.push("a local celebration");
			events.push("the arrival of a group of refugees");
			events.push("the birth of triplets");
			events.push("a disease outbreak");
			events.push("a lost trade caravan");
			events.push("a ghost sighting");
			events.push("an unexplained light in a certain building");
			switch (features.itemLevel) {
				case 1:
					events.push("the discovery of a new hunting grounds");
					events.push("the collapse of a level floor");
					events.push("a population milestone");
					break;
				case 2:
					events.push("the discovery of a new smelting technique");
					events.push("the election of a new leader");
					events.push("a music festival");
					events.push("the completion of a new aqueduct");
					events.push("an expedition to unexplored parts of the City");
					break;
				case 3:
					events.push("the discovery of a new building material");
					events.push("the discovery of a new medicine");
					events.push("a local sports event");
					break;
			}
			result["c-event"] = DescriptionMapper.pickRandom(events, features);
			
			let topics = [];
			topics.push("local politics");
			topics.push("local gossip");
			topics.push("horoscopes");
			topics.push("plant life surrounding the settlement");
			topics.push("the erosion of the City");
			topics.push("a haunted commercial center");
			topics.push("various theories about the fate of the Governor");
			topics.push("various theories about the real cause of the Fall");
			topics.push("the health effects of moonlight");
			switch (features.itemLevel) {
				case 1:
					topics.push("survival techniques in the Dark Levels");
					topics.push("life in the Dark Levels before the Fall");
					topics.push("keeping bats as pets");
					break;
				case 2:
					topics.push("medicine");
					topics.push("cooking");
					topics.push("private property");
					topics.push("small scale gardening");
					break;
				case 3:
					topics.push("the Network");
					topics.push("moral issues");
					break;
			}
			result["n-topic"] = DescriptionMapper.pickRandom(topics, features);

			let facts = [];
			facts.push("celebration of the new year was disrupted by flooding")
			facts.push("a restaurant has opened on Level 17")
			facts.push("drug trafficking continues on Level 19")
			facts.push("disease strikes at a major settlement")
			result["c-fact"] = DescriptionMapper.pickRandom(facts, features);
			
			return result;
		},
		
		getDonateSeedsMessage: function (itemVO) {
			return "Donated the seeds to the temple. The clerics will cherish them and perhaps something will grow.";
		},
		
		getReadResearchPaperMessage: function (itemVO) {
			let features = {};
			let itemName = ItemConstants.getItemDisplayName(itemVO);
			features.itemName = itemName;
			features.itemLevel = itemVO.level || 1;
			features.randomSeed = itemVO.itemID;
			let params = this.getResearchPaperTextParams(features);
			
			let template = "You read the paper. " + DescriptionMapper.get("researchpaper-description", features);
			let phrase = TextBuilder.build(template, params);
			
			return phrase;
		},
		
		getResearchPaperTextParams: function (features) {
			let result = {};
			
			let facts = [];
			facts.push("the City is disintegrating faster than its current population can possibly maintain it");
			facts.push("the City was built on marshland and is slowly sinking in it");
			facts.push("the Ocean currents were changing direction before the Fall");
			facts.push("some researchers were worried about volcanic activity years before the Fall");
			facts.push("there was a research group investigating returning to live on the Surface before the Fall");
			facts.push("the air outside the City is dangerous to breathe");
			facts.push("there was a top secret research group just before the Fall");
			facts.push("the Government before the Fall was investing heavily in space research");
			facts.push("prisoners were used in secret experiments related to space travel");
			facts.push("the Government was compiling a classified list of priority individuals that would be evacuated in case of emergency");
			facts.push("there was a top secret gene bank that was being prepared for something just before the Fall");
			facts.push("the City Government wanted to conceal the stockpiling of large amounts of fuel and building materials");
			result["c-fact"] = DescriptionMapper.pickRandom(facts, features);
			
			let topics = [];
			topics.push("the possible consequences on the City of a failed space rocket launch");
			topics.push("the number of people that can live on a spacecraft");
			topics.push("the possibility of long-distance space travel");
			topics.push("the habitability of nearby planets and star systems");
			topics.push("fuel calculations for a very large spacecraft");
			topics.push("the number of people that are required for a sustainable settlement");
			topics.push("a supervolcano");
			topics.push("air quality in the City");
			topics.push("the possibility of controlling the weather through singing");
			topics.push("the effect of flowering plants on dice rolls");
			topics.push("flooding in the Dark Levels");
			topics.push("expected duration of emergency power in the City in different scenarios");
			topics.push("improving the City's ability to withstand extreme weather such as hurricanes");
			
			result["n-topic"] = DescriptionMapper.pickRandom(topics, features);
			
			return result;
		},
		
		getFoundStashMessage: function (stashVO) {
			switch (stashVO.stashType) {
				case ItemConstants.STASH_TYPE_ITEM:
					let itemID = stashVO.itemID;
					let item = ItemConstants.getItemDefinitionByID(itemID);
					if (item.type == ItemConstants.itemTypes.note) {
						return "Found some interesting documents.";
					} else { 
						return "Found an item stash.";
					}
				case ItemConstants.STASH_TYPE_SILVER:
					return "Found some coins.";
				default:
					log.w("Unknown stash type: " + stashVO.stashType);
					return "Found a stash.";
			}
		},
		
		getWaymarkText: function (waymarkVO, sectorFeatures) {
			let features = Object.assign({}, sectorFeatures);
			features.waymarkType = waymarkVO.type;
			features.direction = PositionConstants.getDirectionFrom(waymarkVO.fromPosition, waymarkVO.toPosition);
			
			let template = DescriptionMapper.get("waymark", features);
			let params = this.getWaymarkTextParams(waymarkVO, features);
			let phrase = TextBuilder.build(template, params);
			
			result = phrase;
			if (GameConstants.isDebugVersion) result += " [" + waymarkVO.toPosition + "]";
			
			return result;
		},
		
		getWaymarkTextParams: function (waymarkVO, features) {
			let result = {};
			
			let tradePartner = TradeConstants.getTradePartner(features.campOrdinal);
			
			result["n-target"] = "<span class='hl-functionality'>" + this.getWaymarkTargetName(waymarkVO, features) + "</span>";
			result["direction"] = PositionConstants.getDirectionName(features.direction, false);
			result["n-settlement-name"] = tradePartner ? tradePartner.name : null;
			result["n-district-type"] = features.districtType;
			
			return result;
		},
		
		getWaymarkTargetName: function (waymarkVO, features) {
			switch (waymarkVO.type) {
				case SectorConstants.WAYMARK_TYPE_SPRING: return "water";
				case SectorConstants.WAYMARK_TYPE_CAMP: return "safety";
				case SectorConstants.WAYMARK_TYPE_CLINIC: return "clinic";
				case SectorConstants.WAYMARK_TYPE_RADIATION: return "hazard";
				case SectorConstants.WAYMARK_TYPE_POLLUTION: return "hazard";
				case SectorConstants.WAYMARK_TYPE_SETTLEMENT: return "trade";
				case SectorConstants.WAYMARK_TYPE_DISTRICT: return features.districtType + " district";
				case SectorConstants.WAYMARK_TYPE_PASSAGE: return "passage";
				default:
					log.w("unknown waymark type: " + waymarkVO.type);
					return "safe";
			}
		},

		getResourceDisplayName: function (resourceName) {
			return Text.t("game.resources." + resourceName + "_name");
		},

		getHeapDisplayName: function (resourceName, features) {			
			let modifiers = SectorConstants.getSectorEnvironmentTags(null, null, null, features);
			return Text.t(this.getTextKey("ui.exploration.heap_" + resourceName + "_name", modifiers));
		},

		getResourcesTextVO: function (resourcesVO, currency) {
			let list = [];

			for (let key in resourceNames) {
				let name = resourceNames[key];
				let amount = resourcesVO.getResource(name);
				if (amount > 0) {
					let listFragment = { textKey: "ui.common.value_and_name", textParams: { value: Math.round(amount), name: name } };
					list.push(listFragment);
				}
			}

			if (currency > 0) {
				let listFragment = { textKey: "ui.common.value_and_name", textParams: { value: Math.round(currency), name: "game.resources.currency_name" } };
				list.push(listFragment);
			}

			return this.getListTextVO(list);
		},

		getItemsTextVO: function (items) {
			let itemCounts = {};
			let itemsByID = {};

			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let itemID = item.id;
				if (!itemCounts[itemID]) itemCounts[itemID] = 0;
				itemCounts[itemID]++;
				itemsByID[itemID] = item;
			}

			let list = [];

			for (let itemID in itemCounts) {
				let count = itemCounts[itemID];
				if (count == 0) continue;
				let item = itemsByID[itemID];
				let itemName = ItemConstants.getItemDisplayNameKey(item);
				let listFragment = { textKey: "ui.common.value_and_name", textParams: { value: count, name: itemName } };
				list.push(listFragment);
			}

			return this.getListTextVO(list);
		},
		
		getFightChancesText: function (probability) {
			if (probability >= 0.9) {
				return "fairly harmless";
			}
			if (probability > 0.8) {
				return "slightly unnerving";
			}
			if (probability > 0.6) {
				return "intimidating";
			}
			if (probability >= 0.5) {
				return "risky";
			}
			if (probability >= 0.4) {
				return "dangerous";
			}
			if (probability >= 0.2) {
				return "very dangerous";
			}
			return "deadly";
		},
		
		getLocaleName: function (locale, sectorFeatures, isShort) {
			let condition = sectorFeatures.getCondition();

			let modifiers = [];
			if (isShort) {
				modifiers = "short";
			} else {
				modifiers = SectorConstants.getSectorEnvironmentTags(null, null, null, sectorFeatures);
			}

			let localeType = locale.type;
			if (localeType == localeTypes.shelter) localeType = localeTypes.house;
			if (localeType == localeTypes.tradingpartner) localeType = localeTypes.camp;

			let textKey = this.getTextKey("game.locales." + localeType + "_name", modifiers);

			let defaultModifier = "game.locales.condition_" + condition + "_modifier";
			
			return Text.t(textKey, defaultModifier);
		},
		
		getWorkshopName: function (resource) {
			switch (resource) {
				case resourceNames.fuel: return "refinery";
				case resourceNames.rubber: return "plantation";
				default: return "workshop";
			}
		},
		
		getSpringName: function (featuresComponent) {
			let key = "";

			let hasHazards = featuresComponent.hazards.hasHazards();
			let type = featuresComponent.sectorType;
			let style = featuresComponent.sectorStyle;

			if (featuresComponent.ground && featuresComponent.buildingDensity < 6  && !hasHazards && type != SectorConstants.SECTOR_TYPE_INDUSTRIAL) {
				key = "ui.exploration.spring_name_natural";
			} else if (featuresComponent.wear > 7 || featuresComponent.damage > 3) {
				key = "ui.exploration.spring_name_damaged";
			} else if (type == SectorConstants.SECTOR_TYPE_PUBLIC || style == SectorConstants.STYLE_CITTADINIAN) {
				key = "ui.exploration.spring_name_public"
			} else if (type == SectorConstants.SECTOR_TYPE_INDUSTRIAL || style == SectorConstants.STYLE_INDUSTRIAL) {
				key = "ui.exploration.spring_name_industrial";
			} else if (type == SectorConstants.STYLE_SLUM_GENERAL || type == SectorConstants.STYLE_SLUM_HUN) {
				key = "ui.exploration.spring_name_slum";
			} else {
				key = "ui.exploration.spring_name"
			}
			
			return Text.t(key);
		},
		
		getEnemyText: function (enemyList, sectorControlComponent) {
			let result = "";
			var enemyActiveV = this.getEnemyActiveVerb(enemyList);
			var enemyNounSector = this.getEnemyNoun(enemyList, true, true);
			result += enemyActiveV + " " + enemyNounSector;
			return result;
		},
		
		getEnemyNoun: function (enemyList, detailed, pluralify) {
			var baseNoun = this.getCommonText(enemyList, "nouns", detailed ? "name" : "", "someone or something", true, pluralify);
			if (detailed) {
				return baseNoun;
			} else {
				var parts = baseNoun.split(" ");
				return parts[parts.length - 1];
			}
		},
		
		getEnemyGroupNoun: function (enemyList) {
			return this.getCommonText(enemyList, "groupN", "", "group", false)
		},
		
		getEnemyActiveVerb: function(enemyList) {
			return this.getCommonText(enemyList, "activeV", "", "occupied by", false);
		},
		
		getEnemeyDefeatedVerb: function (enemyList) {
			return this.getCommonText(enemyList, "defeatedV", "", "defeated", false);
		},
		
		getScaResourcesString: function (discoveredResources, knownResources, resourcesScavengable) {
			var s = "";
			 for(var key in resourceNames) {
				var name = resourceNames[key];
				var amount = resourcesScavengable.getResource(name);
				if (amount > 0 && discoveredResources.indexOf(name) >= 0) {
					var amountDesc = "scarce";
					if (amount == WorldConstants.resourcePrevalence.RARE) amountDesc = "rare";
					if (amount == WorldConstants.resourcePrevalence.DEFAULT) amountDesc = "scarce";
					if (amount == WorldConstants.resourcePrevalence.COMMON) amountDesc = "common";
					if (amount == WorldConstants.resourcePrevalence.ABUNDANT) amountDesc = "abundant";
					if (GameConstants.isDebugVersion) amountDesc += " " + Math.round(amount);
					s += key + " (" + amountDesc + "), ";
				} else if (amount > 0 && knownResources.indexOf(name) >= 0) {
					s += key + " (??), ";
				}
			}
			if (s.length > 0) return s.substring(0, s.length - 2);
			else if (resourcesScavengable.getTotal() > 0) return "Unknown";
			else return "None";
		},
		
		getScaItemString: function (discoveredItems, knownItems, itemsScavengeable) {
			let validItems = [];
			for (let i = 0; i < itemsScavengeable.length; i++) {
				let id = itemsScavengeable[i];
				if (knownItems.indexOf(id) < 0) continue;
				let item = ItemConstants.getItemDefinitionByID(id);
				if (!item) continue;
				let itemName = ItemConstants.getItemDisplayName(item);
				validItems.push(itemName);
			}
			
			if (validItems.length == 0) {
				if (itemsScavengeable.length > 0) {
					return "Some ingredient";
				} else {
					return "None";
				}
			}
			
			return validItems.join(", ");
		},
		
		getMovementBlockerName: function (blockerVO, gangComponent) {
			switch (blockerVO.type) {
				case MovementConstants.BLOCKER_TYPE_GANG:
					let enemies = this.getAllEnemies(null, gangComponent);
					var groupNoun = this.getEnemyGroupNoun(enemies);
					var enemyNoun = this.getEnemyNoun(enemies);
					return groupNoun + " of " + Text.pluralify(enemyNoun);
				default:
					return blockerVO.name;
			}
			return "";
		},
		
		getMovementBlockerAction: function (blockerVO, enemiesComponent, gangComponent) {
			switch (blockerVO.type) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "Bridge gap";
				case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC: return "Clear waste";
				case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE: return "Clear waste";
				case MovementConstants.BLOCKER_TYPE_GANG:
					let enemies = this.getAllEnemies(null, gangComponent);
					return "Fight " + this.getEnemyNoun(enemies, false, true);
				case MovementConstants.BLOCKER_TYPE_TOLL_GATE: return "Pay toll";
			}
		},
		
		getAllEnemies: function (enemiesComponent, gangComponent) {
			let enemies = [];
			if (enemiesComponent && enemiesComponent.possibleEnemies) {
				enemies = enemiesComponent.possibleEnemies.concat();
			}
			if (gangComponent) {
				for (let i = 0; i < gangComponent.enemyIDs.length; i++) {
					var gangEnemy = EnemyConstants.getEnemy(gangComponent.enemyIDs[i]);
					enemies.push(gangEnemy);
				}
			}
			return enemies;
		},
		
		getUnblockedVerb: function (blockerType) {
			switch (blockerType) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "bridged";
				case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC: return "cleared";
				case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE: return "cleared";
				case MovementConstants.BLOCKER_TYPE_GANG: return "defeated";
				case MovementConstants.BLOCKER_TYPE_DEBRIS: return "cleared";
				case MovementConstants.BLOCKER_TYPE_EXPLOSIVES: return "cleared";
				case MovementConstants.BLOCKER_TYPE_TOLL_GATE: return "paid";
			}
		},
		
		// get common description word for a list of objects that contain possible words are in arrays named objectAttribute
		// if nothing common is found, defaultWord is returned
		// is allowSeveral, two common words can be returned if one doesn't cover all objects
		getCommonText: function (objectList, objectAttribute, objectDetailAttribute, defaultWord, allowSeveral, pluralify) {
			var allWords = [];
			var allDetails = [];
			var minimumWords = [];
			for (var i1 in objectList) {
				var o = objectList[i1];
				if (!o) continue;
				for (var j1 in o[objectAttribute]) {
					var word = o[objectAttribute][j1];
					var detail = objectDetailAttribute ? o[objectDetailAttribute] : "";
					if (!word) continue;
					if ($.inArray(word, allWords) < 0) allWords.push(word);
					if (objectDetailAttribute && $.inArray(detail, allDetails) < 0) allDetails.push(detail);
					if (j1 == 0 && $.inArray(word, minimumWords) < 0) minimumWords.push(word);
				}
			}
			
			var validWords = [];
			for (var i2 in allWords) {
				var word = allWords[i2];
				var valid = true;
					for (var j2 in objectList) {
					var o = objectList[j2];
					if ($.inArray(word, o[objectAttribute]) < 0) valid = false;
				}
				if (valid) validWords.push(word);
			}
			
			var validDetail = "";
			if (objectDetailAttribute) {
			for (var i3 in allDetails) {
				var detail = allDetails[i3];
				var valid = true;
				for (var j3 in objectList) {
					var o = objectList[j3];
					if (o[objectDetailAttribute] != detail) valid = false;
					}
					if (valid) validDetail = detail;
				}
			}
			
			// log.i("getCommonText " + objectAttribute + " | " + validDetail + " | " + validWords.join(",") + " | " + minimumWords.join(",") + " | " + defaultWord);
			// log.i(objectList)
			
			if (validDetail.length > 0) {
				return pluralify ? Text.pluralify(validDetail) : validDetail;
			} else if (validWords.length > 0) {
				return pluralify ? Text.pluralify(validWords[0]) : validWords[0];
			} else if (allowSeveral && minimumWords.length > 1) {
				return pluralify ? (Text.pluralify(minimumWords[0]) + " and " + Text.pluralify(minimumWords[1])) : (minimumWords[0] + " and " + minimumWords[1]);
			} else {
				return defaultWord;
			}
		},
		
		getListText: function (list, max) {
			let textPieceVO = this.getListTextVO(list, max);
			return Text.compose(textPieceVO);
		},

		getListTextVO: function (list, max) {
			let fragments = [];

			if (!list || list.length == 0) {
				fragments.push( { textKey: "ui.common.list_template_zero", textParams: {} } );
			} else if (list.length == 1) {
				fragments.push( { textKey: "ui.common.list_template_one", textParams: { value: list[0] } } );
			} else if (list.length == 2) {
				fragments.push( { textKey: "ui.common.list_template_two", textParams: { value1: list[0], value2: list[1] }});
			} else if (max && list.length > max) {
				// cropped list
				let displayedList = list.slice(0, max);
				let numHiddenItems = list.length - displayedList.length;
				fragments.push( { textKey: "ui.common.list_template_cropped_start" });
				for (let i = 0; i < displayedList.length; i++) {
					if (i > 0) fragments.push( { textKey: "ui.common.list_template_cropped_delimiter" } );
					fragments.push( { textKey: "ui.common.value_simple_template", textParams: { value: displayedList[i] } } );
				}
				fragments.push( { textKey: "ui.common.list_template_cropped_end", textParams: { numCropped: numHiddenItems } })
			} else {
				// regular list
				fragments.push( { textKey: "ui.common.list_template_many_start" });
				for (let i = 0; i < list.length; i++) {
					if (i > 0) fragments.push( { textKey: "ui.common.list_template_many_delimiter" } );
					fragments.push( { textKey: "ui.common.value_simple_template", textParams: { value: list[i] } } );
				}
				fragments.push( { textKey: "ui.common.list_template_many_end" });
			}

			return { textFragments: fragments };
		}
	};
		
	function initSectorTexts() {
		let wildcard = DescriptionMapper.WILDCARD;
		
		let t_R = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
		let t_I = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
		let t_M = SectorConstants.SECTOR_TYPE_MAINTENANCE;
		let t_C = SectorConstants.SECTOR_TYPE_COMMERCIAL;
		let t_P = SectorConstants.SECTOR_TYPE_PUBLIC;
		let t_E = SectorConstants.SECTOR_TYPE_EMPTY;

		let t_H = [ SectorConstants.SECTOR_TYPE_RESIDENTIAL, SectorConstants.SECTOR_TYPE_COMMERCIAL ];
		let t_W = [ SectorConstants.SECTOR_TYPE_COMMERCIAL, SectorConstants.SECTOR_TYPE_INDUSTRIAL, SectorConstants.SECTOR_TYPE_PUBLIC ];

		let s_CT = SectorConstants.STYLE_CITTADINIAN;
		let s_HU = SectorConstants.STYLE_HUMANIST;
		let s_IN = SectorConstants.STYLE_INDUSTRIAL;
		let s_KB = SectorConstants.STYLE_KARBOQUE;
		let s_KI = SectorConstants.STYLE_KIEVAN;
		let s_MO = SectorConstants.STYLE_MODERN;
		let s_NW = SectorConstants.STYLE_NEOWESTERN;
		let s_SG = SectorConstants.STYLE_SLUM_GENERAL;
		let s_SH = SectorConstants.STYLE_SLUM_HUN;
		let s_OW = SectorConstants.STYLE_WESTERN;
		
		// brackets for values like building density, wear, damage
		let bany = [0, 10];
		let b0 = [0, 0];
		let b1 = [1, 10];
		let b12 = [0, 5];
		let b22 = [5, 10];
		let b13 = [0, 3];
		let b23 = [4, 6];
		let b33 = [7, 10];

		let gt0 = [1, 1000];
		let gt1 = [2, 1000];

		let bmoderate = [3, 8];
		
		let lmodern = [15, 100];
		let lold = [0, 18];
		
		// default descriptions (player has vision)
		// - general
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [n-street] in front of what looks like [a] [a-building] [n-building]");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [a-street] [n-street] between two [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { numPOI: 0, buildingDensity: b23 }, "[a] [a-street] [n-street] between two [n-buildings] with some [a-building] [n-buildings] on either side");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [a-sectortype] [n-street] with a few [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [a-sectortype] [n-street] full of [an-decos]");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [a-street] [n-street] lined with [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [a-street] [n-street] surrounded by some [n-buildings]");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [a-street] [n-street] surrounded by [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[A] [a-street] [n-street] built mainly out of [n-material].");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [a-sectortype] [n-street] with some [an-decos] and [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [a-street] [n-street] between several [n-buildings]");
		DescriptionMapper.add("sector-vision", { numPOI: 0 }, "[a] [a-street] [n-street] between some [a-building] [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { numPOI: 0, wear: b13, activity: b13 }, "[a] [a-street] [n-street], seemingly untouched since before the Fall");
		DescriptionMapper.add("sector-vision", { numPOI: 0, campable: false, buildingDensity: b12 }, "[a] [a-street] [n-street] dominated by a large [n-building]");
		// - sunlit
		DescriptionMapper.add("sector-vision", { sunlit: b1, wear: b12, wealth: b22 }, "[A] [a-street] [n-street] shimmering in the light.");
		DescriptionMapper.add("sector-vision", { sunlit: b1, buildingDensity: b12 }, "[A] [a-street] [n-street] appearing even more expansive in the light.");
		DescriptionMapper.add("sector-vision", { sunlit: b1, numNeighbours: gt1, buildingDensity: b12}, "A sunlit [n-street] that reveals the infinite rows of buildings in all directions.");
		DescriptionMapper.add("sector-vision", { sunlit: b1, buildingDensity: b22 }, "[A] [a-street] [n-street] where the dense construction provides some shelter from the sun and the elements.");
		DescriptionMapper.add("sector-vision", { sunlit: b1, buildingDensity: b23, wear: b22 }, "A cluster of [n-buildings] blanketed by moss and pale fungal growth, softening the hard geometry of the old concrete.");
		DescriptionMapper.add("sector-vision", { sunlit: b1, sectorType: wildcard, sunlitReason: SectorConstants.SUNLIT_REASON_MIRROR }, "[A] [n-street] lit by a hidden mirror system, revealing the ceiling of the level far above, almost like a real sky.");
		DescriptionMapper.add("sector-vision", { sunlit: b1, sunlitReason: SectorConstants.SUNLIT_REASON_MIRROR }, "[A] [a-sectortype] [n-street] absurdly sunlit in the middle of the City.");
		// - building density
		DescriptionMapper.add("sector-vision", { buildingDensity: b0, isGroundLevel: false, campable: false }, "A system of bridges and passages connecting several buildings around a dizzying opening to the level below");
		DescriptionMapper.add("sector-vision", { buildingDensity: b12, wealth: bmoderate, numPOI: 0 }, "An open atrium inside [a] [n-sector], lined with corridors leading deeper into the structure.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22, campable: false, sunlit: 0, wealth: b12 }, "[A] [a-street] corridor partially lit by blinking emergency lights that do little more than disorient.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22, sunlit: 0, campable: false, wealth: b12 }, "Some kind of [a] [a-sectortype] complex with several narrow passages this way and that");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22, wealth: bmoderate }, "A narrow [n-street] between two colossal tower blocks.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22, sunlit: 0, campable: false, wealth: b12 }, "[A] [n-street] so dense and layered, it's easy to lose track of how far the level floor is.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22, wear: b33, wealth: b12 }, "[a] [a-street] corridor with scattered trash from long-gone inhabitants");
		DescriptionMapper.add("sector-vision", { buildingDensity: b13 }, "A wide square with [a] [a-building] [n-building] on one side and what looks like the remains of [a] [a-building] [n-building] on the other");
		DescriptionMapper.add("sector-vision", { buildingDensity: b13 }, "A wide and [a-street] concourse inside a former [n-sector].");
		DescriptionMapper.add("sector-vision", { buildingDensity: gt1, sectorType: t_M, campable: false }, "A [a-street] concrete plain, perhaps once used for vehicles of some kind.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b13, numNeighbours: gt1 }, "[A] [a-street] maze of staircases and corridors filling up some space between the neighbouring sectors.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b23, isSurfaceLevel: false, sunlit: 0, sectorType: t_W }, "[a] [a-street] [n-street] beneath a vast [n-building]");
		DescriptionMapper.add("sector-vision", { buildingDensity: b23, isSurfaceLevel: false, sectorType: t_W }, "[a] [n-street] with multiple levels of passages crawling along the walls of the surrounding [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { buildingDensity: b23, isSurfaceLevel: false, campable: false, wealth: b23 }, "A [a-street] passage dotted with large pillars supporting the building above.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33, campable: false }, "Some sort of [a] [a-sectortype] corridor between two vast [n-buildings] with barely enough space to walk");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33, campable: false }, "[a] [a-street] [n-street] packed so full with [a-building] [n-buildings] and [an-decos] that there is barely enough space to pass through");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33 }, "[a] [a-street] alley between two [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33, campable: false }, "A tight passage with [n-material] walls pressing close on all sides.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33, campable: false }, "Some kind of [a] [n-sector] complex with narrow passages this way and that.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33, sunlit: 0, numNeighbours: gt1 }, "A [a-street] covered passage between two bigger streets, lined with [an-decos].");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33, numPOI: 0, campable: false }, "An empty tunnel with nothing but dead lights.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33, wealth: b13, wear: b22 }, "An alley turned into a tunnel by dense clusters of cables sag between leaning housing blocks.");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22, wear: b22, wealth: b12 }, "[A] [a-street] [n-street] covered in cables and grime.");
		// - wear
		DescriptionMapper.add("sector-vision", { wear: b13, level: lold, wealth: bmoderate }, "A dusty [a-sectortype] cluster dominated by a warehouse placed there later, its bright yellow markings standing out from the [n-material] surroundings.");
		DescriptionMapper.add("sector-vision", { wear: b13, sunlit: 0, level: lmodern, debris: b0 }, "[a] [a-street] [n-street] between tall [n-buildings], lined with withered trees that until recently must have thrived in artificial light");
		DescriptionMapper.add("sector-vision", { wear: b13, level: lmodern, isSurfaceLevel: false }, "[A] [n-street] between some skeleton buildings that seem to have been abandoned while they were still under construction");
		DescriptionMapper.add("sector-vision", { wear: b23, damage: b0 }, "A former [n-sector] with [a] [a-street] atmosphere");
		DescriptionMapper.add("sector-vision", { wear: b23, buildingDensity: b23 }, "A canyon of small passageways between several [a-building] structures.");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "[a] [a-building] building whose original purpose is hard to determine, stripped down to bare concrete");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "[A] [n-street] lined with tall narrow [a-sectortype] buildings in a forgotten architectural style, colorful under a layer of dust and wear");
		DescriptionMapper.add("sector-vision", { wear: b33, isSurfaceLevel: false }, "[a] [a-street] [a-sectortype] [n-street] with a few large unidentifiable ruins looming over it");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "A completely ruined [a-sectortype] [n-street]");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "A rubble-covered [n-street] surrounded by the crumbling remains of [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "A graffiti-covered space of unindentifiable use.");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "A grey [n-street] with worn and chipping [a-sectortype] buildings from past decades.");
		DescriptionMapper.add("sector-vision", { wear: b33, sectorType: t_I }, "A factory area occupied by metal scaffolding, seemigly abandoned before construction was complete.");
		DescriptionMapper.add("sector-vision", { wear: b33, damage: gt0 }, "A rubble-filled [n-street] between decaying [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { wear: b33, buildingDensity: b23, sectorType: t_P }, "A [n-street] with a collapsed skybridge hanging over it like a broken spine.");
		DescriptionMapper.add("sector-vision", { wear: b33, activity: b12 }, "A forgotten space between spaces, all bare [n-material] walls and [a-building] support structures.");
		// - wealth
		DescriptionMapper.add("sector-vision", { wealth: b13, sectorType: t_C }, "A dirty [n-street] through a slum market, abandoned shops either boarded up or dark, improvised solutions for power, water all now all useless.");
		DescriptionMapper.add("sector-vision", { wealth: b13, sectorType: t_R }, "A worn and dirty residential [n-street] which must've been crowded before the Fall.");
		DescriptionMapper.add("sector-vision", { wealth: b23, sectorType: t_P }, "A glossy public [n-street], floor lined with lights that would have once all shown in different colours, pulsing with life.");
		DescriptionMapper.add("sector-vision", { wealth: b33, sectorType: t_C }, "An upscale shopping [n-street].");
		DescriptionMapper.add("sector-vision", { wealth: b33, sectorType: t_R, campable: false, wear: b12 }, "A beautiful [a-sectortype] [n-street], the kind of place you once dreamed of living in if you ever got rich.");
		// - activity
		DescriptionMapper.add("sector-vision", { activity: b13 }, "A quiet [n-street] between some [a-building] abandoned buildings.");
		DescriptionMapper.add("sector-vision", { activity: b13, wear: b22, buildingDensity: b22 }, "[A] [a-street] [n-street] through an abandoned neighbourhood.");
		DescriptionMapper.add("sector-vision", { activity: b12, wear: b22 }, "[A] [a-street] [n-street] abandoned long before the Fall.");
		DescriptionMapper.add("sector-vision", { activity: b33, wealth: b33 }, "A previously luxurious street now looted from anything half valuable since the Fall.");
		DescriptionMapper.add("sector-vision", { activity: b33 }, "A [a-street] [a-sectortype] [n-street] with signs of recent human activity.");
		DescriptionMapper.add("sector-vision", { activity: b33 }, "A [a-street] [a-sectortype] [n-sector] which seems to have been recently looted clean.");
		// - damage
		DescriptionMapper.add("sector-vision", { damage: b22, level: lold }, "Some kind of [a] [a-sectortype] area, badly damaged in a war.");
		DescriptionMapper.add("sector-vision", { damage: b33, level: lold }, "A war-torn pile of rubble, difficult to identify.");
		DescriptionMapper.add("sector-vision", { damage: bmoderate, level: lold }, "[A] [a-sectortype] area with buildings showing signs of damage from the wars.");
		DescriptionMapper.add("sector-vision", { damage: b22 }, "A former [a-sectortype] sector where [n-buildings] and [n-buildings] lie in ruins");
		DescriptionMapper.add("sector-vision", { damage: b22 }, "A badly damaged [n-sector] with a collapsed mid-level ceiling partially blocking the way");
		DescriptionMapper.add("sector-vision", { damage: b22 }, "[A] [n-street] of ruined buildings, all concrete and steel rods and dust.");
		DescriptionMapper.add("sector-vision", { damage: b33 }, "A completely destroyed [a-sectortype] [n-street]");
		DescriptionMapper.add("sector-vision", { damage: b22, buildingDensity: b12 }, "[A] [a-street] [n-street] flanked by shells of destroyed buildings");
		DescriptionMapper.add("sector-vision", { damage: b22, buildingDensity: b22 }, "[A] [n-street] so full of rubble it is difficult to pass through");
		// - sector type
		DescriptionMapper.add("sector-vision", { sectorType: t_R }, "A small [n-street] between some [a-building] apartment towers");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, wear: b22, level: lold }, "A long-abandoned, dictator era residential block with tall concrete walls and empty flowerbeds");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, buildingDensity: b12, level: [6, 100] }, "[A] [n-street] flanked by several identical narrow residential towers");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, buildingDensity: b23 }, "[A] [n-street] outside a [a-building] residental building with a dizzying geometrical pattern of balconies");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, buildingDensity: b23 }, "The [a-street] yard of a massive [a-street] residential complex, its walls exteding up to the darkness.");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, level: lmodern }, "A square surrounded by what must once have been rather comfortable apartment towers");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, level: lmodern }, "[A] [a-street] looking residential corridor with faux windows decorating the buildings");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, wealth: b13  }, "A cluster of small [a-building] residences have been extended and patched with different materials");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, wealth: b13, buildingDensity: b33, wear: b22 }, "[a] [a-street] [n-street] surrounded (and in parts, covered) by [a-building] dwellings that have been abandoned for some time");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, wealth: b22, buildingDensity: bmoderate }, "[A] [n-street] lined by [a-building] estate towers.");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, wealth: b13, wear: b12 }, "A quarter with apartment blocks stacked atop older apartment blocks in mismatched layers.");
		DescriptionMapper.add("sector-vision", { sectorType: t_I }, "A street outside a huge [a-building] industrial complex");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, buildingDensity: b13 }, "A massive passage which must have been intended for industrial vehicles.");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, wear: b12 }, "A humming [n-street] passing through a [a-street] factory area.");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, campable: false }, "A street running along a covered train track");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, wear: b13 }, "[A] [a-street] path through a modern industrial area which must have still been in use until recently");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, buildingDensity: b13 }, "An empty square with some damaged containers and huge rusting mechanical arms");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, buildingDensity: b23 }, "[a] [n-street] between two blocks of what looks like [a-building] control rooms and offices");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, buildingDensity: b13 }, "Dormant assembly lines fill the cavernous industrial hall.");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, wear: bmoderate }, "A former warehouse reclaimed as a slum, pepperd with make-shift dwellings using a colourful array of materials.");
		DescriptionMapper.add("sector-vision", { sectorType: t_M }, "[a] [a-street] [n-street] behind [a] [n-building], the low ceiling criss-crossed by old wires and ducts");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, buildingDensity: b22 }, "A dusty, anonymous corridor between the some places in the City");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, buildingDensity: b22, damage:b22 }, "A damaged maintenance corridor flanked by broken cables like metal viscera");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, buildingDensity: b12 }, "A plain [n-street] with some forgotten transport vehicles scattered about.");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, wear: b12 }, "A [n-street] between buildings whose metal walls occationally rumble with the movement of hidden machinery.");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, buildingDensity: b33 }, "A maintenace corridor with cables for roof and buttons and screens and handles everywhere, all useless now.");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, isSurfaceLevel: false }, "A flooded passage underneath a massive bridge with [a-building] buildings looming in the distance");
		DescriptionMapper.add("sector-vision", { sectorType: t_M }, "A forgotten space among machine-run City facilities, smooth surfaces broken only by ducts and pipes");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, level: lmodern, wear: b13, campable: false }, "A robot storage unit, with huge repair arms and useless charging capsules lining the walls.");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, buildingDensity: b12, activity: b12, numPOI: 0 }, "An empty water cistern, all concrete and pillars.");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, buildingDensity: b22 }, "An infestation of pipes and conduits hidden between the spaces meant for humans.");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, buildingDensity: b22 }, "[A] [a-street] maintenance corridor with a stubborn beep shooting through it at intervals, an alarm from a system frozen in an emergency.");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, buildingDensity: b22, wear: b13 }, "A corridor with thick utility conduits run along the walls and ceilings, humming softly with residual power.");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, buildingDensity: b12, wear: b22 }, "A collapsed transit avenue with rusted kiosks and floating trash.");
		DescriptionMapper.add("sector-vision", { sectorType: t_C }, "[a] [a-street] shopping street with the remains of various shops and cafés");
		DescriptionMapper.add("sector-vision", { sectorType: t_C }, "[A] [n-street] between some commercial buildings, their [a-building] walls covered in a patchwork of dead screens");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, level: lmodern }, "A [a-street] [n-street] between towering buildings, all covered in dead screens and signs.");
		DescriptionMapper.add("sector-vision", { sectorType: t_C }, "a commercial street with many small shops which seem to have been recently plundered");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, wear: b12 }, "[A] [a-street] [n-street] crowded with small shops, billboards and kiosks on multiple levels");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b12, isSurfaceLevel: false, sunlit: b1 }, "[a] [n-street] where buildings are attached to the ceiling of the level like colossal stalactites");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b12, isSurfaceLevel: false }, "A square built around a massive statue with [a-building] shop fronts surrounding it on every side");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b13, wealth: b22 }, "A plaza under an elevated building with what must have once been a waterfall in the middle");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b13 }, "[a] wide fenced terrace attached to a massive tower overlooking the [a-street] streets below");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b13, wealth: bmoderate }, "A round courtyard enclosed by a [a-building] office building");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b22, level: lmodern }, "[A] [a-street] commercial tunnel, its aereographite walls dotted with dead signs");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, activity: b22 }, "[A] [a-street] [n-street] lined with looted shops.");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, wealth: b22, numNeighbours: gt1 }, "A central square surrounded by tall commercial buildings which must once have been lit up by countless screens.");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, numPOI: 0 }, "A long curving terrace hugging the wall of a massive [a-sectortype] building, lined with broken vending machines.");
		DescriptionMapper.add("sector-vision", { sectorType: t_P }, "[a] [n-street] dominated by huge building that looks like it was once a public facility of some kind");
		DescriptionMapper.add("sector-vision", { sectorType: t_P }, "A stretch of abandoned highway with some smaller buildings on the side" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, level: lold, wear: b22, campable: false }, "A [a-street] concourse divided by empty transit gates into neat lanes for commuters who left long ago." );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, level: lold, buildingDensity: b12, numPOI: 0 }, "A round communal square with a defunct fountain and what must once have been a pleasant garden" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, level: lmodern, buildingDensity: b12, campable: false }, "A public square where recently a temporary camp seems to have been set up and then abandoned" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, level: lmodern, damage: b12 }, "A standard government office quarter with clear signs and big doors and reception areas, somehow welcoming and dehumanizing at the same time." );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b12 }, "[a] [a-street] [n-street] dominated a row of solemn statues" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b12, wear: b22 }, "An ornamental hall which seems to have once been a big station, with a domed roof, massive chandelier and small booths on the sides" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b13 }, "An open space that looks like it might have once been dedicated to a sport of some kind");
		DescriptionMapper.add("sector-vision", { sectorType: t_E, buildingDensity: b12 }, "[A] [a-street] empty space in the City, still waiting for development.");
		DescriptionMapper.add("sector-vision", { sectorType: t_E }, "[A] rare unused space in the City, never fully built.");
		// - sector style
		DescriptionMapper.add("sector-vision", { sectorStyle: s_CT, sectorType: t_H }, "A distinctly warm and down-to-earth [a-sectortype] [n-street]");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_CT, sectorType: t_H }, "[A] [n-street] built in a historical style which evokes a nostalgy for a past beyond living memory.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_CT }, "[A] [a-street] cluster of red-brown [a-sectortype] buildings with small spaces in between.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_CT }, "A cluster of [a-sectortype] buildings in pastel colours, worn with time.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_CT, buildingDensity: b12 }, "A round square with a pretty mosaic pavement and several benches.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU }, "A utilitarian and modern [a-sectortype] [n-street].");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU }, "A raised [n-street] above the level floor lined with small buildings and bridges into towers.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, buildingDensity: b23 }, "A square and a network of pedestrian bridges connecting the surrounding [a-sectortype] [n-buildings].");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, sectorType: t_R, wear: b23, wealth: b23 }, "Identical housing blocks stacked in all directions, built in a hurry and probably never inhabited.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, campable: false }, "A [n-street] with artificial trees growing from cracked ceramic planters, their branches empty and lights dead.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, sectorType: t_R }, "A [n-street] at the bottom of a forest of narrow high-rises.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, sectorType: t_R }, "A yard flanked by tall residential towers, with uncannily green fake grass and a rusting picnic table.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, sectorType: t_R }, "A yard in front of a towering grey residential block, its wall lined by rounded bow windows, like endless snakes.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, sectorType: t_R, wealth: bmoderate }, "A mathematically precise residential cluster with a dizzying array of idential residential units arranged in rows with little common spaces in between.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, sectorType: t_R, buildingDensity: b33 }, "Narrow passages branching endlessly between apartment towers, each one nearly identical to the last.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, sectorType: t_C, buildingDensity: b12, wear: b13, wealth: bmoderate, activity: b13 }, "A market concourse overlooked by thousands of vacant balconies, aged but not worn, probably never inhabited.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU }, "[A] [a-street] [a-sectortype] [n-street] with buildings without windows or decorative features.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_HU, buildingDensity: b12 }, "[A] [a-street] plaza with smooth curves and large open spaces.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_IN, wear: b12 }, "[A] [n-sectortype] [n-street] built in a modern industrial style.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_IN, sectorType: t_I }, "[A] [a-street] passage past several warehouses, in different shapes and colours, stacked like containers on a ship.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_IN, sectorType: t_R }, "A massive temporary housing complex for workers, identical [n-material] living pods stacked in infinite rows and columns.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KB }, "[A] typical Dictatorship-era [n-street] lined with some [a-building] [n-buildings].");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KB }, "[A] typical Karboque [n-sector] dominated by raw concrete.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KB }, "[A] highly symmetric and orderly [a-sectortype] [n-street]");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KB }, "[A] [a-street] [n-street] with utilities like cables and pipes visible and accessible for human maintenance.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KB, buildingDensity: b22 }, "A tunnel-like street through a blocky [a-sectortype] area made of mostly [n-material].");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KB, sectorType: t_P, buildingDensity: b13,  }, "A monumental public square surrounding a pyramid-shaped government building." );
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KB, sectorType: t_R, sunlit: 0 }, "A space between two semi-circular residential buildings, their symmetrical rows of windows disappearing into the heights.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KI, sectorType: wildcard }, "A beautiful [n-street] lined with buildings constructed in a historical style, all spires and windows and low arches and obsolete roof shapes designed to withstand weather that never existed here.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KI, wear: bmoderate }, "An eclectic [n-street] built in a historical style.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KI, sectorType: wildcard }, "[A] [a-street] [n-street] rich in deep blues, greens and purples.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KI, sectorType: wildcard }, "[A] [a-street] [n-street] decorated with vestigial features like windows and rainwater collection.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KI, sectorType: t_C, wealth: bmoderate }, "An office complex with moss green walls and bronze doors and endless corridors.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_KI, sectorType: t_R }, "A worn out apartment complex, its walls painted mossy green and floors tiled with imitation-stone.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO }, "A dizzying modern [a-sectortype] [n-street] composed of non-gemoetrical shapes and continuous structures.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO, wealth: b22 }, "A [a-street] [a-sectortype] [n-street] with glossy buildings and dead signs.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO, buildingDensity: b33 }, "An arched corridor, gleaming, scratchless, dark.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO, wealth: b22 }, "A modern [a-sectortype] [n-street] designed to be covered in displays and holograms, now strangly bare and featureless.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO, damage: b0 }, "A futuristic [a-sectortype] [n-street] decorated with 3D-printed latticework.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO }, "An array of [a-sectortype] buildings with no windows and no balconies, all bare [n-material] surfaces. They used to be covered in holograms.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO }, "A bridge connecting two clusters of [a-building] buildings, with arches and decorative pillars that once supported a glass roof.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO, sectorType: t_C, wealth: b22 }, "A hypermodern financial quarter rising in smooth black towers without windows.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO, sectorType: t_R }, "A spiralling stairway-street with residences on all sides.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_MO, sunlit: 0 }, "A distinctive [a-sectortype] [n-street] whose irregular shapes and odd angles are difficult to navigate in the darkness.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_NW, buildingDensity: bmoderate }, "A maze of pedestrian bridges and walkways connecting several [a-building] towers and little plazas hanging in between them.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_NW, wear: bmoderate }, "A [n-street] made of polished stone which still gleams beneath the grime.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_NW }, "A decorative [n-street] with several distinct buildings.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_NW, wear: b13 }, "A [a-adjective] [n-street] overlooked by rows of silent windows, humming along with distant ventilation systems.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_NW, sectorType: t_C, buildingDensity: bmoderate }, "A bridge-street above an artificial canal, now clogged with debris.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_NW, sectorType: t_C, wear: b12 }, "A clean white-and-wooden office building in multiple floors, with delicate looking but still unscarred bridges and staircases criss-crossing from one side and one floor to another, and meeting rooms enclosed in glass walls.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_NW, sectorType: t_R }, "A winding [n-street] between buildings with naturalistic shapes and rounded balconies.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_NW, sectorType: t_C, wealth: b22 }, "An office space with high artificial windows and room after room with rows of desks.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_SG }, "[A] [a-street] slum [a-street].");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_SG, activity: b12 }, "A deserted [a-sectortype] [a-street] between buildings, under a jungle of wires.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_SG, level: lmodern, activity: b12 }, "[A] slum [a-street] with signs of recent abandonment.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_SH }, "[A] [a-street] slum [n-street].");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_SH, campable: false }, "[A] clearly ethnic [a-sectortype] [n-street].");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_OW }, "A [a-sectortype] sector criss-crossed by a maze of layered walkways.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_OW }, "[A] [a-sectortype] [n-street] with many distinct, separate buildings.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_OW }, "[A] [a-street] [a-sectortype] area broken into multiple sub-levels with many bridges and stairs.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_OW }, "[A] [n-street] built in a historical style, reminescent of cities before The City.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_OW }, "[A] [a-street] [n-sector] clearly built to withstand varying weather.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_OW }, "[A] [a-street] [n-sector] with built-in air-conditioning, built before City-wide ventilation.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_OW }, "A [n-street] surrounded by separate buildings with large windows and open spaces on top.");
		DescriptionMapper.add("sector-vision", { sectorStyle: s_OW, sectorType: t_R, level: lold }, "A historical residential sector with a spiderweb of paths and passages connecting [a-street] yards and balconies");
		// - special levels
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: b12 }, "A huge hall that looks like it was used as some kind of a storage area, with automated hands rusting in the ceiling");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: bmoderate }, "[a] [a-street] passage between two defunct, walled-off nuclear reactors");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: bmoderate }, "[a] [a-street] [n-street] outside a huge industrial processing complex, all entrances tightly shut");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: b22 }, "[a] [a-sectortype] corridor that must have once looked sterile, but is now littered with debris");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: b22 }, "A windowed hallway above the ruined remains of a nuclear facility");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b13 }, "A wide open space beneath the City with mud, grass and other plants pushing their way through cracks in the concrete floor");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b13 }, "An open space, perhaps once a park, now overrun strange plants and mushrooms");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b13, sectorType: t_R }, "An effulgent [a-street] lined with modern residential towers, now all deserted");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b23 }, "[a] [a-street] street between crumbling ancient [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b23 }, "An open street with no ceiling, the next floor of the City hovering high above and ruins on either side");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b22, wear: b22 }, "A narrow street with cracked pavement");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b13 }, "[A] [a-street] square surrounded by glass-domed passages and small shopfronts");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b12, sectorType: t_P }, "A big square dominated by an ornate public building in the middle");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b23 }, "[A] [a-street] street dotted by billboards and dead screens and surrounded by tall buildings");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b23 }, "An exposed street flanked by tall buildings and shaken by gusts of strong wind");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b23 }, "A multi-layered street with space below for trams and below for pedestrians and small shops");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b33 }, "[a] [a-street] [n-street] between tall, ornate [n-buildings]");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b33 }, "[a] [a-street] passage between what used to be two shopping centers");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b33 }, "[a] [a-street] [n-street] where the wind is constantly howling in the narrow passages");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, sectorType: t_C }, "An imposing shopping center which seems to have been full of shops selling luxury goods");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, sectorType: t_I }, "[a] [a-street] with several grand office buildings");
		// - hazards
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, cold: b1 }, "[A] [a-street] [a-sectortype] [n-street] with a whistling, cold draft.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, cold: b1 }, "[A] [a-street] [a-sectortype] [n-street] where the invisible ventilation systems are wheezing in overdrive.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, debris: b1 }, "[A] [n-street] full of debris");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, debris: b1, sectorType: t_R }, "[a] [n-street] flanked by several completely destroyed residential towers");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, flooded: b1, level: lmodern, sectorType: t_R, wear: b12 }, "A flooded [n-sector] with signs of a hasty evacuation");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, flooded: b1 }, "An empty [a-sectortype] [n-sector] with the quiet sound of dripping echoing through it.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, flooded: b1 }, "A flooded [n-material] tunnel under a collapsed building, with water up to the ankles covering random pieces of debris and a quiet sound of dripping echoing without direction.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, flooded: b1, sectorType: t_P }, "A [n-street] along a vertical public garden, still partially watered by pipes that leak steadily into the streets below.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, flooded: b1, buildingDensity: b33 }, "A flooded and overgrown [n-material] corridor between structures.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, radiation: b1, wear: b22 }, "A regular [n-sector], abandoned long before the Fall due to the radiation.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, poison: b1 }, "[A] [a-street] [n-sector], abandoned and ghostly, left to rot due to the pollution.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, poison: b1 }, "[A] [a-street] [n-street] with a foul smell hanging in the air.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, radiation: b1 }, "[A] [n-street] with an an eerie quiet that makes you wonder if the air is safe.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, radiation: b1, wear: b22, sunlit: 0 }, "[A] [n-street] with strange moss growing on the [n-material] walls, and the air humid with decay.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, radiation: b1, isSurfaceLevel: false, wear: b22, sunlit: 0, campable: false }, "[a] [a-street] [n-street] with long-abandoned buildings covered in strange moss");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, territory: b1 }, "[A] [a-street] [a-sectortype] [n-street] with signs of clear gang presence.");
		// - enemies
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, hasEnemies: true, enemyTags: "bat", buildingDensity: b22 }, "[A] [a-street] [n-street] with a low ceiling and the occasional sensation of a bat flying by.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, hasEnemies: true, enemyTags: "big_animal" }, "A dark [n-street] whose silence is tense with potential movement.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, hasEnemies: true, enemyTags: "bird" }, "A [a-street] [n-street] bombarded with the screams of birds somewhere above.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, hasEnemies: true, enemyTags: "flora" }, "[A] [a-street] [n-street] whose [n-material] walls are spotted with unfriendly growth.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, hasEnemies: true, enemyTags: "fungi" }, "A [a-street] [n-street] with some fungal growth.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, hasEnemies: true, enemyTags: "insect" }, "[A] [a-street] [n-street] whose silence is tainted with the faint shuffling of insects.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, hasEnemies: true, enemyTags: "magic" }, "A [a-sectortype] [n-street] alive with a vague sense of danger.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, hasEnemies: true, enemyTags: "spider" }, "[A] [a-street] [n-street] crossed by spiderweb.");
		// - campable sectors
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_R, sectorStyle: wildcard }, "[A] [a-street] [n-street] sheltered by a non-descript but sturdy residential structure.");
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_R, sectorStyle: wildcard }, "[A] cluster of well-preserved [n-material] housing units forming a rare pocket of calm.");
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_I, sectorStyle: wildcard }, "[A] [a-street] [n-street] with a stable foundation.");
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_I, sectorStyle: wildcard }, "[A] [a-street] warehouse which is mostly empty and seems structurally stable.");
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_M, sectorStyle: wildcard }, "A safe space surrounded by City's infrastructure, with plenty of space to build.");
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_M, sectorStyle: wildcard }, "A cluster of inactive repair bays with ample sheltered space.");
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_C, sectorStyle: wildcard }, "[A] [a-street] [n-street] with easy access to the surrounding area.");
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_C, sectorStyle: wildcard }, "[A] [a-street] [n-street] where pedestrian lanes cut through rows of intact retail spaces.");
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_P, sectorStyle: wildcard }, "[A] [a-street] [n-street] raised slightly above the surrounding level.");
		DescriptionMapper.add("sector-vision", { campable: true, sectorType: t_P, sectorStyle: wildcard }, "[A] [a-street] civic plaza populated only by benches and civic planters.");
		// - level features
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_HOLE_COLLAPSE }, "A mostly collapsed [a-sectortype] area with only some exposed beams and pieces of the level floor still remaining.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_HOLE_COLLAPSE_EDGE }, "A [a-street] [n-street] on the edge of a totally collapsed area.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_HOLE_WELL }, "A [a-street] bridge crossing the sunwell, with several levels visible both above and below.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_HOLE_WELL_EDGE }, "A [a-street] [n-street] on the edge of the sunwell with a dazzling view of the levels above and below.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_HOLE_WELL_EDGE }, "A walkway along the dizzying edge of the sunwell, revealing the edges of the levels above and below.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_HOLE_MOUNTAIN_EDGE, sunlit: b1 }, "A [a-street] [n-street] with a close view of a mountain trapped inside the City.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_STRUCTURE_GIGA_CENTER }, "[A] part of a huge office headquarters in clean black, white and orange.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_STRUCTURE_PILLAR }, "A [a-street] [n-street] by a gigantic pillar supporting the level above.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_STRUCTURE_PILLAR, buildingDensity: b22, wealth: b12 }, "A dark maze of little alleys and stairs between improvised buildings that seem to have organically grown around a level support pillar.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_STRUCTURE_PILLAR, isSurfaceLevel: false }, "[a] [n-street] at the base of an enormous pillar supporting the level above");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_STRUCTURE_PILLAR, wear: b33 }, "An ancient square, long since forgotten, with a huge pillar supporting the City above.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_TRAIN_TRACKS_NEW }, "A [a-street] [n-street] by some modern train tracks.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_TRAIN_TRACKS_NEW, sectorType: t_C }, "A [n-street] following the train tracks, lined with small shops.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_TRAIN_TRACKS_OLD }, "A [a-street] [n-street] by some old train tracks.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_TRAIN_TRACKS_OLD }, "A path by the train tracks running along the side of a massive [a-sectortype] complex.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_TRAIN_STATION, wear: b12 }, "A [a-building] train station filled with [an-decos].");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_TRAIN_STATION, wear: b22 }, "An abandoned train station, low [n-material] wall hanging close.");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_TRAIN_STATION, wear: b12, hasEnemies: true }, "A tile-walled, spacious maglev station, built for hundreds, now occupied by [n-enemies].");
		DescriptionMapper.add("sector-vision", { levelFeatures: WorldConstants.FEATURE_TRAIN_STATION }, "A [a-street] station hall with a high arched roof and decorative, stately walls, filled with trash and looted kiosks.");
		// - neighbouring sector features
		DescriptionMapper.add("sector-vision", { hasNeighbourFeature: true, hasLevelFeature: false, buildingDensity: b22, activity: b12 }, "[A] vaulted pedestrian passage leading to the [n-neighbour], pristine and quiet.");
		DescriptionMapper.add("sector-vision", { hasNeighbourFeature: true, hasLevelFeature: false, activity: b12, wear: b22 }, "A long-forgotten shortcut behind the [n-neighbour].");
		DescriptionMapper.add("sector-vision", { hasNeighbourFeature: true, hasLevelFeature: false }, "A non-descript [n-street] leading to the [n-neighbour].");
		DescriptionMapper.add("sector-vision", { hasNeighbourFeature: true, hasLevelFeature: false }, "A [a-street] [n-street] leading to the [n-neighbour].");
		DescriptionMapper.add("sector-vision", { hasNeighbourFeature: true, hasLevelFeature: false, buildingDensity: b13 }, "A [a-street] [n-street] near the [n-neighbour].");
		DescriptionMapper.add("sector-vision", { hasNeighbourFeature: true, hasLevelFeature: false, buildingDensity: bmoderate }, "A [a-sectortype] [n-street] leaning close to the [n-neighbour].");
		// - misc features
		DescriptionMapper.add("sector-vision", { passageUp: MovementConstants.PASSAGE_TYPE_STAIRWELL }, "A [a-street] space behind [a] [n-building] with dimly lit signs for an emergency staircase to the level above.");
		DescriptionMapper.add("sector-vision", { passageDown: MovementConstants.PASSAGE_TYPE_STAIRWELL }, "A [a-street] space behind [a] [n-building] with dimly lit signs for an emergency staircase to the level below.");
		DescriptionMapper.add("sector-vision", { passageUp: MovementConstants.PASSAGE_TYPE_PREBUILT }, "A [a-street] space behind [a] [n-building] with dimly lit signs for an emergency staircase to the level above.");
		DescriptionMapper.add("sector-vision", { passageDown: MovementConstants.PASSAGE_TYPE_PREBUILT }, "A [a-street] space behind [a] [n-building] with dimly lit signs for an emergency staircase to the level below.");
		DescriptionMapper.add("sector-vision", { passageUp: MovementConstants.PASSAGE_TYPE_ELEVATOR }, "A [a-street] [n-street] with dimly lit signs for an emergency elevator to the level above.");
		DescriptionMapper.add("sector-vision", { passageDown: MovementConstants.PASSAGE_TYPE_ELEVATOR }, "A [a-street] [n-street] with dimly lit signs for an emergency elevator to the level below.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, affiliation: SectorConstants.SECTOR_AFFILIATION_AGRICORP }, "[A] [a-street] [n-street] with several signs with a leaves-and-fish logo.");
		DescriptionMapper.add("sector-vision", { affiliation: SectorConstants.SECTOR_AFFILIATION_AGRICORP, sectorType: t_I, wear: b12 }, "A former farm, with futuristic pedestals and automatic watering systems for fruit trees now grey and lifeless.");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard, affiliation: SectorConstants.SECTOR_AFFILIATION_MINECORP }, "[A] [a-street] [n-street] with a large orange G logo on several of the buildings.");
		DescriptionMapper.add("sector-vision", { hasCollectableWater: true, wear: b22, campable: false }, "A [a-street] [n-street] with the water conduits exposed.");
		
		// descriptions when player has no vision (lamp/sunglasses)
		// - any
		DescriptionMapper.add("sector-novision", { sunlit: wildcard }, "[A] [a-street] [n-street] of some kind.");
		DescriptionMapper.add("sector-novision", { sunlit: wildcard, buildingDensity: b13 }, "A wide and open space of some kind.");
		DescriptionMapper.add("sector-novision", { sunlit: wildcard, sectorType: t_R, damage: b0 }, "What feels like a fairly regular [n-street].");
		DescriptionMapper.add("sector-novision", { sunlit: wildcard, sectorType: t_I }, "An obscured [n-street] in an industrial area of some sort.");
		DescriptionMapper.add("sector-novision", { sunlit: wildcard, sectorType: t_M, campable: false }, "[A] [a-street] [n-street] humming with residual power.");
		// - dark
		DescriptionMapper.add("sector-novision", { sunlit: 0 }, "[A] [n-street] inside the city, shrouded in darkness.");
		DescriptionMapper.add("sector-novision", { sunlit: 0 }, "[A] [a-street] [n-street] inside the city, disorienting in the darkness.");
		DescriptionMapper.add("sector-novision", { sunlit: 0, buildingDensity: b13 }, "[A] [a-street] space which feels open and wide.");
		DescriptionMapper.add("sector-novision", { sunlit: 0, buildingDensity: b33 }, "A dense [n-street] with barely enough space to walk. You feel your way in the darkness");
		DescriptionMapper.add("sector-novision", { sunlit: 0, flooded: gt0 }, "An unidentifiable [n-street], with the sound of dripping water.");
		DescriptionMapper.add("sector-novision", { sunlit: 0, wear: b22 }, "[A] [a-street] [n-street] humming in the blackness.");
		// - sunlit
		DescriptionMapper.add("sector-novision", { sunlit: b1 }, "[A] [n-street] inside the City, indistinct in the blinding light");
		DescriptionMapper.add("sector-novision", { sunlit: b1, buildingDensity: b13 }, "An open [n-street], disorienting in the blinding sunlight.");
		DescriptionMapper.add("sector-novision", { sunlit: b1, buildingDensity: b23, wear: b12 }, "[A] [a-street] street or corridor. Details fade in the sunlight");
		DescriptionMapper.add("sector-novision", { sunlit: b1, buildingDensity: b33 }, "A dense [n-street] with barely enough space to walk. You feel your way in the blinding light");

		// settings
		// - default value for filter props that shouldn't make the description more likely to be chosen
		DescriptionMapper.setDefaultValue("sector-vision", "sectorType", wildcard);
		// - default value for required props that if sector has non-default value should only use templates matching that
		// DescriptionMapper.setDefaultValue("sector-vision", "isSurfaceLevel", false);
		// DescriptionMapper.setDefaultValue("sector-vision", "isGroundLevel", false);
		// - score for important props that should be selected more often
		DescriptionMapper.setParamScore("sector-vision", "sunlitReason", 2);
		DescriptionMapper.setParamScore("sector-vision", "hazard", 2);
		DescriptionMapper.setParamScore("sector-vision", "hasNeighbourFeature", 2);
		DescriptionMapper.setParamScore("sector-vision", "sectorStyle", 2);
		DescriptionMapper.setParamScore("sector-vision", "affiliation", 2);
		DescriptionMapper.setParamScore("sector-vision", "passageUp", 2);
		DescriptionMapper.setParamScore("sector-vision", "passageDown", 2);
		DescriptionMapper.setParamScore("sector-vision", "isGroundLevel", 3);
		DescriptionMapper.setParamScore("sector-vision", "isSurfaceLevel", 3);
		DescriptionMapper.setParamScore("sector-vision", "levelFeatures", 10);
	}
	
	function initWaymarkTexts() {
		var wildcard = DescriptionMapper.WILDCARD;
		
		var t_R = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
		var t_I = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
		var t_M = SectorConstants.SECTOR_TYPE_MAINTENANCE;
		var t_C = SectorConstants.SECTOR_TYPE_COMMERCIAL;
		var t_P = SectorConstants.SECTOR_TYPE_PUBLIC;
		
		let wt_CL = SectorConstants.WAYMARK_TYPE_CLINIC;
		let wt_CM = SectorConstants.WAYMARK_TYPE_CAMP;
		let wt_DS = SectorConstants.WAYMARK_TYPE_DISTRICT;
		let wt_PO = SectorConstants.WAYMARK_TYPE_POLLUTION;
		let wt_PS = SectorConstants.WAYMARK_TYPE_PASSAGE;
		let wt_RD = SectorConstants.WAYMARK_TYPE_RADIATION;
		let wt_SS = SectorConstants.WAYMARK_TYPE_SETTLEMENT;
		let wt_WW = SectorConstants.WAYMARK_TYPE_SPRING;
		
		// brackets for values like building density, wear, damage
		var b0 = [0, 0];
		var b12 = [0, 5];
		var b22 = [5, 10];
		
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "A wall by a corridor leading [direction] has been painted with a big [n-target] symbol");
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "There is a graffiti with the word [n-target] and an arrow pointing [direction]");
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "There is a small sign for a {n-target} pointing [direction]");
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "There are a few worn posters indicating there is [n-target] to the [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_CL }, "Someone has put up a sign pointing to [a] [n-target] to the [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_CM }, "You spot a few graffiti with arrows pointing [direction] and words like 'safe' and 'shelter'");
		DescriptionMapper.add("waymark", { waymarkType: wt_CM }, "Graffiti pointing towards [direction] promises shelter");
		DescriptionMapper.add("waymark", { waymarkType: wt_DS }, "An old sign points to [a] [n-district-type] district to the [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_DS }, "Official signage points to a [n-district-type] district to the [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_PO }, "There are multiple skull signs on walls when heading towards [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_PS }, "An orange emergency exit sign points [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_RD }, "There are multiple skull signs on walls when heading towards [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_SS }, "There is a metal plaque on a wall by a passage leading [direction] with the name '[n-settlement-name]'");
		DescriptionMapper.add("waymark", { waymarkType: wt_WW }, "A blue arrow painted on the street is pointing [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_WW }, "Helpful graffiti is pointing [direction] for water");
		DescriptionMapper.add("waymark", { waymarkType: wt_WW }, "Some bricks have been arranged in the shape of an arrow pointing [direction] and a crude symbol that might mean [n-target]");
		DescriptionMapper.add("waymark", { sectorType: t_C }, "A store billboard has been painted over with the an arrow pointing [direction] and the word [n-target]");
		DescriptionMapper.add("waymark", { sectorType: t_I }, "A street sign with directions has been painted over. Towards [direction] it says [n-target]");
		DescriptionMapper.add("waymark", { sectorType: t_M }, "Pipes near the ceiling have arrows painted on them. One pointing [direction] is next to a symbol for [n-target]");
	}
	
	function initBookTexts() {
		var wildcard = DescriptionMapper.WILDCARD;
		
		let t_S = ItemConstants.bookTypes.science;
		let t_F = ItemConstants.bookTypes.fiction;
		let t_H = ItemConstants.bookTypes.history;
		let t_E = ItemConstants.bookTypes.engineering;
		
		let l_1 = 1;
		let l_2 = 2;
		let l_3 = 3;
		
		DescriptionMapper.add("book-intro", { bookType: wildcard }, "You read the book.");
		DescriptionMapper.add("book-intro", { bookLevel: l_1 }, "You leaf through the book.");
		DescriptionMapper.add("book-intro", { bookLevel: l_2 }, "You study the book.");
		DescriptionMapper.add("book-intro", { bookLevel: l_3 }, "You spend some time studying the book.");
		DescriptionMapper.add("book-intro", { bookType: t_S }, "You study the book.");
		DescriptionMapper.add("book-intro", { bookType: t_F }, "You examine the book.");
		DescriptionMapper.add("book-intro", { bookType: t_H }, "You study the book.");
		DescriptionMapper.add("book-intro", { bookType: t_H }, "You skim through the book.");
		DescriptionMapper.add("book-intro", { bookType: t_E }, "You study the book.");
		
		DescriptionMapper.add("book-description", { bookType: wildcard }, "A passage describing [n-topic] catches your eye.");
		DescriptionMapper.add("book-description", { bookType: wildcard }, "A section describing [n-topic] seems interesting.");
		DescriptionMapper.add("book-description", { bookType: wildcard }, "You learn something about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: wildcard }, "It's rather [a-bad], but you learn something anyway.");
		
		DescriptionMapper.add("book-description", { bookLevel: l_1 }, "It gives you some insights into [n-topic].");
		DescriptionMapper.add("book-description", { bookLevel: l_2 }, "It seems like a good source on [n-topic].");
		DescriptionMapper.add("book-description", { bookLevel: l_3 }, "It is not easy to follow, but teaches you a lot about [n-topic].");
		DescriptionMapper.add("book-description", { bookLevel: l_3 }, "It describes in great detail how [c-fact]");
		DescriptionMapper.add("book-description", { bookLevel: l_3 }, "It describes in great detail [n-topic]");
		
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is a cook book, not much of it relevant to the ingredients available today.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is [a] [a-level] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is [a] [a-style] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is [a] [a-good] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is [a] [a-bad] textbook on [n-topic], but you learn something new anyway.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It describes [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "There are several interesting passages about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is a rather dry text on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It contains a description of [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "You learn that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "You find out that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is a grammar book for the Kievan language.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is a grammar book for the Hansa language and its many dialects.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It is an introductory text on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It is [a] [a-bad] book on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It is a scout's handbook.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It contains some basic information about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "A description of a refining process offers clues to the kind of building materials used commonly before the Fall.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It contains a catalog of known animal life in the 'Dark Levels'. You recognize several.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "You notice old census data about people who are exposed daily to sunlight versus those who are not.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "It contains a detailed description of a sun-based calendar system you are unfamiliar with.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "You find details about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "It contains detailed information about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "It is a survivor's cookbook, and contains a few useful tips.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "It is an old book exploring the possibility of extending the City to cover oceans.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "You are spell-bound by a description of abundant plant-life on the Ground.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "There is a wealth of information about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "It contains a dissertation on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "It contains in-depth information about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "It is an ethical inquiry into lab grown meat versus keeping animals.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "It explores the theoretical possibility of restarting human life outside the City, and concludes that it would be nearly impossible.");
		
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is [a] [a-level] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is [a] [a-style] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is [a] [a-good] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is [a] [a-bad] textbook on [n-topic], but you learn something new anyway.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "There are abandoned plans of [n-object].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It contains a detailed description of [n-object].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "There is diagram explaining in detail how [n-object] worked.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is an operation manual for [n-object].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "You learn a lot about how the [n-object].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "You learn that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "You find out that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_1 }, "There is an interesting diagram of [n-object].");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_1 }, "It contains some basic information about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_2 }, "It contains many useful bits of information on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_2 }, "It contains detailed information about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_3 }, "There are technical drawings of [n-object]");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_3 }, "It contains in-depth information about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_3 }, "It is a legal book about the rights and obligations of robots and rules for programming their behaviour.");
		
		DescriptionMapper.add("book-description", { bookType: t_H }, "You find details about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It describes [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It describes [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is a rather dry text on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is [a] [a-style] overview of [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is very [a-level] introduction [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "You learn that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It seems that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "You learn about [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It describes the explosive urbanization that led to the formation of the City.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "There is [a] [a-style] chapter on [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "A section on [c-event] catches your eye.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "There are several references to [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is [a] very [a-good] explanation of [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is otherwise dull, but there is [a] [a-good] chapter on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is a history of Donbalism, a monotheistic religion that has been popular in the City throughout its history.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is a history of Ugurism, a fairly new religion combining bleak apocalyptic spiritualism and a worship of the City as a sentient entity.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "A reference to the \"currently uninhabited levels\" of the City offers a perspective on the pre-Fall City.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is an old book predicting a huge population explosion in the City, driven by immigration and medical breakthroughs.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It describes the Dictatorship era, how it rose to power from the Utopia, waged war against the Western Government, and finally collapsed to rebellion.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is an introductory text on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is the autobiography of a famous athlete.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It mentions [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It discusses [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It discusses the utopistic roots of the City and how it was first built and imagined.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is a biased exposition of the charitable work of a religious group.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is a Government-produced text book in the history of the City, stressing class differences and the importance of unity.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is an art book featuring architecture from the earliest levels of the City, quiant with windows and ventilation and greenery.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is an overview of the Karboque architecture which the author believes is unjustly unpopular because of its associations with the Dictatorship era.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is an ode to the architecture of the City States.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "There is a long section about [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "It is a history of the use of nuclear weapons, describing the first use by the City against a civilization outside, and then second use within the City by one City state against another.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "It is a detailed exploration of [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "It discusses the splintering of the original City Government into multiple City States within the City, their flourishing, war and collapse.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "It discusses the gradual depopulation of the planet outside the City, first driven by economy, then pollution, and finally floods.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_3 }, "You a wealth of information [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_3 }, "You a wealth of information [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_3 }, "You find a detailed timeline of [c-event].");
		
		DescriptionMapper.add("book-description", { bookType: t_F }, "There is [a] [a-good] story about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is a tale about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is story about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "A story about [c-theme] stays with you.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "You are touched by a poem about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It contains [a] [a-good] description of [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is [a] [a-style] novel dealing with [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is [a] [a-style] tale about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is a very [a-style] portrayal of [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is [a] [a-style] story about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It a collection of [a-style] short stories about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is [a] [a-style] and [a-good] story about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_1 }, "It is a children's book featuring [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_1 }, "It's a simple story about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_1 }, "It seems to be aimed at school children.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_2 }, "It is a classic novel about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_2 }, "It is a [a-style] novel about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_2 }, "It is a [a-style] story set in the time of the great Rebellion.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_3 }, "It is quite a heavy book on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_3 }, "It is a [a-good] story about [c-theme].");
	}
	
	function initNewspaperTexts() {
		var wildcard = DescriptionMapper.WILDCARD;
		
		let l_1 = 1;
		let l_2 = 2;
		let l_3 = 3;
		
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "There is an editorial about [n-topic].");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "There is an opinion piece about [n-topic].");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "There is a big story about [c-event].");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "The issue revolves around [c-event].");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "According to it, [c-fact].");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "Contrary to rumours, [c-fact].");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "It is a story about a settlement plagued by swarms of mechanical locusts, destroying all its stores including building materials whenever they appeared.");
		DescriptionMapper.add("newspaper-description", { itemLevel: l_2 }, "It contains supposed stories of survivors who saw the Fall, all very different.");
		DescriptionMapper.add("newspaper-description", { itemLevel: l_3 }, "There is an investigative story about [n-topic].");
	}
	
	function initResearchPaperTexts() {
		var wildcard = DescriptionMapper.WILDCARD;
		
		let l_1 = 1;
		let l_2 = 2;
		let l_3 = 3;
		
		DescriptionMapper.add("researchpaper-description", { itemLevel: wildcard }, "It is about [n-topic].");
		DescriptionMapper.add("researchpaper-description", { itemLevel: wildcard }, "You learn that [c-fact].");
		DescriptionMapper.add("researchpaper-description", { itemLevel: wildcard }, "You deduce that [c-fact].");
		DescriptionMapper.add("researchpaper-description", { itemLevel: wildcard }, "It seems that [c-fact].");
		DescriptionMapper.add("researchpaper-description", { itemLevel: l_1 }, "It is a basic overview of [n-topic].");
		DescriptionMapper.add("researchpaper-description", { itemLevel: l_2 }, "It is an outline of [n-topic].");
		DescriptionMapper.add("researchpaper-description", { itemLevel: l_3 }, "It is a detailed analysis of [n-topic].");
	}
	
	initSectorTexts();
	initWaymarkTexts();
	initBookTexts();
	initNewspaperTexts();
	initResearchPaperTexts();
	
	return TextConstants;
	
});
