(function () {
    
    require.config({
        baseUrl: '../src',
    
        paths: {
            brejep: "../lib/brejep",
            ash: "../lib/ash/ash.min",
            jquery: "../lib/jquery",
            lzstring: "../lib/lzstring",
            json: "../lib/requirejs/json",
            utils: "utils",
            game: "game",
            test: "../test"
        },

        urlArgs: "bust=" + (new Date()).getTime(),
    });

	let deps = [
        "game/GameGlobalsInitializer",
		"test/WorldCreatorTests",
	];
	
	require(deps, function(GameGlobalsInitializer) {
        GameGlobalsInitializer.init(null, null, true);
        setTimeout(() => {
            QUnit.start();
        }, 500);
	});
}());