(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

/**
 * Bunny
 * @class Bunny
 * @param {PIXI.Texture} texture
 * @param {Object} bounds
 */
var Bunny = function(texture, bounds)
{
	PIXI.Sprite.call(this, texture);

    /**
     * The amount of gravity
     * @type {Number}
     */
    this.gravity = 0.75;

    /**
     * Horizontal speed
     * @type {Number}
     */
	this.speedX = Math.random() * 10;

	/**
     * Vertical speed
     * @type {Number}
     */
    this.speedY = (Math.random() * 10) - 5;

    /**
     * Reference to the bounds object
     * @type {Object}
     */
	this.bounds = bounds;

    // Set the anchor position
    this.anchor.x = 0.5;
    this.anchor.y = 1;
};

// Extend the prototype
Bunny.prototype = Object.create(PIXI.Sprite.prototype);

/**
 * Update the position of the bunny
 * @method update
 */
Bunny.prototype.update = function()
{
    this.position.x += this.speedX;
    this.position.y += this.speedY;
    this.speedY += this.gravity;

    if (this.position.x > this.bounds.right)
    {
        this.speedX *= -1;
        this.position.x = this.bounds.right;
    }
    else if (this.position.x < this.bounds.left)
    {
        this.speedX *= -1;
        this.position.x = this.bounds.left;
    }

    if (this.position.y > this.bounds.bottom)
    {
        this.speedY *= -0.85;
        this.position.y = this.bounds.bottom;
        if (Math.random() > 0.5)
        {
            this.speedY -= Math.random() * 6;
        }
    }
    else if (this.position.y < this.bounds.top)
    {
        this.speedY = 0;
        this.position.y = this.bounds.top;
    }
};

/**
 * Don't use after this.
 * @method destroy
 */
Bunny.prototype.destroy = function()
{
    this.bounds = null;
    PIXI.Sprite.prototype.destroy.call(this);
};

module.exports = Bunny;

},{}],2:[function(require,module,exports){
var Resources = require('./Resources');

/**
 * Application call for simulation
 * @class BunnyMark
 * @param {String} domElementSelector Selector for the frame element
 */
var BunnyMark = function(domElementSelector)
{
    /**
     * Collection of currently running bunnies
     * @type {Array<PIXI.Sprite>}
     */
    this.bunnies = [];

    /**
     * Containing frame element
     * @type {JQuery}
     */
    this.domElement = $(domElementSelector);

    /**
     * Stage bounds
     * @type {Object}
     */
    this.bounds = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
    };

    /**
     * `true` to increment the number of bunnies
     * @type {boolean}
     */
    this.isAdding = false;

    /**
     * Number of bunnies on the stage
     * @type {int}
     */
    this.count = 0;

    /**
     * The maximum number of bunnies to render.
     * @type {Number}
     * @default 200000
     */
    this.maxCount = 200000;

    /**
     * Number of bunnies to add each frame if isAdding is `true`
     * @type {int}
     */
    this.amount = 100;

    /**
     * Render for the stage
     * @type {PIXI.CanvasRenderer|PIXI.WebGLRenderer}
     */
    this.renderer = null;

    /**
     * Container for the bunnies
     * @type {PIXI.Container}
     */
    this.stage = null;

    /**
     * The stats UI for showing framerate
     * @type {Stats}
     */
    this.stats = null;

    /**
     * Collection of bunny textures
     * @type {Array<PIXI.Texture>}
     */
    this.textures = null;

    /**
     * Container for the counter
     * @type {JQuery}
     */
    this.counter = null;
};

/**
 * To be called when window and PIXI is ready
 * @method ready
 * @param {int} [startBunnyCount=100000] The number of bunnies to start with
 */
BunnyMark.prototype.ready = function(startBunnyCount)
{
    // Default bunnies to 100000
    if (typeof startBunnyCount === 'undefined') {
        startBunnyCount = 100000;
    }

    this.domElement.removeClass('hidden');

    if (typeof PIXI === 'undefined')
    {
        this.domElement.addClass('error');
        throw "PIXI is required to run";
    }

    var $stage = $('#stage');
    var view = $stage.get(0);
    this.bounds.right = $stage.width();
    this.bounds.bottom = $stage.height();

    var options = {
        backgroundColor: 0xFFFFFF,
        view: view
    };

    $('input[type=checkbox]').each(function() {
        options[this.value] = this.checked;
    });
    $('select').each(function() {
        options.powerPreference = this.value;
    });

    if (PIXI.autoDetectRenderer) {
        this.renderer = PIXI.autoDetectRenderer(
            this.bounds.right,
            this.bounds.bottom,
            options
        );

        // Add fewer bunnies for the canvas renderer
        if (this.renderer instanceof PIXI.CanvasRenderer)
        {
            this.amount = 5;
            this.renderer.context.mozImageSmoothingEnabled = false;
            this.renderer.context.webkitImageSmoothingEnabled = false;
        }
    }
    // Support for v5
    else if (PIXI.Renderer) {
        this.renderer = new PIXI.Renderer(
            this.bounds.right,
            this.bounds.bottom,
            options
        );
    }

    // The current stage
    this.stage = new PIXI.Container();

    // Create the stats element
    this.stats = new Stats();
    this.stats.domElement.id = "stats";
    this.domElement.append(this.stats.domElement);

    // Get bunny textures
    this.textures = Resources.map(function(a){
        return PIXI.Texture.fromImage(a, null, 1);
    });

    var gl = this.renderer.gl;
    this.textures.length = Math.min(
        gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), 
        this.textures.length
    );

    // Create the sounder
    this.counter = $("#counter");
    this.counter.html(this.count + " BUNNIES");

    if (startBunnyCount > 0)
    {
        this.addBunnies(startBunnyCount);
    }

    var $view = $(view);
    var $doc = $(document);
    var startAdding = this.startAdding.bind(this);
    var stopAdding = this.stopAdding.bind(this);

    $view.on('mousedown touchstart', startAdding);
    $view.on('mouseup touchend', stopAdding);
    $doc.on('touchstart', startAdding);
    $doc.on('touchend', stopAdding);

    // Handle window resizes
    $(window).on(
        'resize orientationchange', 
        this.resize.bind(this)
    );

    this.resize();
    this.startUpdate();
};

/**
 * Add an arbitrary amount of bunnies
 * @method addBunnies
 */
BunnyMark.prototype.addBunnies = function(num)
{
    // We don't include this until later because pixi is required
    var Bunny = require('./Bunny');

    for (var i = 0; i < num; i++)
    {
        var texture = this.textures[this.count % this.textures.length];
        var bunny = new Bunny(texture, this.bounds);
        bunny.position.x = (this.count % 2) * 800;
        this.bunnies.push(bunny);
        this.stage.addChild(bunny);
        this.count++;
    }
    this.counter.html(this.count + " BUNNIES");
};

/**
 * Turn on flag to start adding more bunnies.
 * @method startAdding
 */
BunnyMark.prototype.startAdding = function()
{
    this.isAdding = true;
};

/**
 * Turn off flag to stop adding bunnies.
 * @method stopAdding
 */
BunnyMark.prototype.stopAdding = function()
{
    this.isAdding = false;
};

/**
 * Start the requestAnimationFrame update
 * @method startUpdate
 */
BunnyMark.prototype.startUpdate = function()
{
    var _this = this;
    requestAnimationFrame(function()
    {
        _this.update();
    });
};

/**
 * Resize the stage
 * @method resize
 */
BunnyMark.prototype.resize = function()
{
    var width = this.domElement.width();
    var height = this.domElement.height();
    this.bounds.right = width;
    this.bounds.bottom = height;
    this.renderer.resize(width, height);
};

/**
 * Remove all bunnies
 * @method reset
 */
BunnyMark.prototype.reset = function()
{
    this.stage.removeChildren();
    this.count = 0;
    for (var i = this.bunnies.length - 1; i >= 0; i--)
    {
        var bunny = this.bunnies[i];
        bunny.destroy();
    }
    this.bunnies.length = 0;
};

/**
 * Frame update function
 * @method update
 */
BunnyMark.prototype.update = function()
{
    this.stats.begin();

    if (this.isAdding)
    {
        if (this.count < this.maxCount)
        {
            this.addBunnies(this.amount);
        }
    }

    for (var i = 0; i < this.bunnies.length; i++)
    {
        this.bunnies[i].update();
    }

    this.renderer.render(this.stage);
    this.startUpdate();
    this.stats.end();
};

module.exports = BunnyMark;

},{"./Bunny":1,"./Resources":3}],3:[function(require,module,exports){
/**
 * The collection of bunny textures
 */
module.exports = [
    'images/rabbitv3_ash.png',
    'images/rabbitv3_batman.png',
    'images/rabbitv3_bb8.png',
    'images/rabbitv3_neo.png',
    'images/rabbitv3_sonic.png',
    'images/rabbitv3_spidey.png',
    'images/rabbitv3_stormtrooper.png',
    'images/rabbitv3_superman.png',
    'images/rabbitv3_tron.png',
    'images/rabbitv3_wolverine.png',
    'images/rabbitv3.png',
    'images/rabbitv3_frankenstein.png'
];
},{}],4:[function(require,module,exports){
var GITHUB_TOKEN = 'a3cd5bd2660280b5e8bac7606a0f11764428da1d';

/**
 * Select the version of pixi.js to test
 * @class VersionChooser
 * @param {String} domElementSelector Selector for containing element
 */
var VersionChooser = function(domElementSelector)
{
    /**
     * Containing frame element
     * @type {JQuery}
     */
    this.domElement = $(domElementSelector);

    /**
     * Collection of tag options
     * @type {Array<String>}
     */
    this.tags = [];

    /**
     * Collection of branch options
     * @type {Array<String>}
     */
    this.branches = [];

    /**
     * Callback funtion when complete
     * @type {Function}
     */
    this.select = function(){};

    /**
     * The setInterval timer
     * @type {int}
     */
    this.ticker = null;

    /**
     * The timeout
     * @type {int}
     */
    this.timeout = null;

    /**
     * Path for loading PIXI from the CDN
     * @type {String}
     */
    this.cdnTemplate = '//d157l7jdn8e5sf.cloudfront.net/${tag}/pixi.js';

    /**
     * The input for bunny count
     * @type {JQuery}
     */
    this.initCount = $("#startBunnyCount");
};

/**
 * Get the list of releases (versions) from the Github API
 * @method getReleases
 * @param {Function} callback when completed
 */
VersionChooser.prototype.getReleases = function(callback)
{
    var _this = this;
    var api = 'https://api.github.com/repos/pixijs/pixi.js/releases';
    $.getJSON(api, { access_token: GITHUB_TOKEN }, function(releases)
    {
        for (var i = 0; i < releases.length; i++)
        {
            _this.tags.push(releases[i].tag_name);
        }
        _this.tags.sort();
        callback();
    });
};

/**
 * Get the list of branches of pixijs/pixi.js from the Github API
 * @method getBranches
 * @param {Function} callback when completed
 */
VersionChooser.prototype.getBranches = function(callback)
{
    var _this = this;
    var api = 'https://api.github.com/repos/pixijs/pixi.js/branches';
    $.getJSON(api, { access_token: GITHUB_TOKEN }, function(branches)
    {
        for (var i = 0; i < branches.length; i++)
        {
            _this.branches.push(branches[i].name);
        }
        _this.branches.sort();
        callback();
    });
};

/**
 * Start setup
 * @method init
 */
VersionChooser.prototype.init = function()
{
    this.domElement.removeClass('hidden');

    var _this = this;

    // Listen for local file upload
    $('#browseFile :file').change(function() {
        
        if (!window.FileReader)
        {
            alert('Your browser is not supported');
            return false;
        }

        var reader = new FileReader();
        if (this.files.length)
        {
            var textFile = this.files[0];
            reader.readAsText(textFile);
            $(reader).on('load', function(e)
            {
                var file = e.target.result;
                if (file && file.length)
                {
                    var script = $("<script></script>");
                    script.html(file);
                    _this.addScript(script);
                }
            });
        }
        else
        {
            alert('Please upload a file before continuing');
        }        
    });

    _this.getReleases(function()
    {
        _this.getBranches(function()
        {
            _this.displayTags();
        })
    });
};

/**
 * Display the tag options
 * @method displayTags
 */
VersionChooser.prototype.displayTags = function()
{
    var domTags = this.domElement.find('#tags');
    var domBranches = this.domElement.find('#branches');
    var i, option;

    for (i = this.tags.length - 1; i >= 0; i--)
    {
        option = $(document.createElement('option'));
        option.html(this.tags[i]);
        domTags.append(option);
    }

    for (i = this.branches.length - 1; i >= 0; i--)
    {
        option = $(document.createElement('option'));
        option.html(this.branches[i]);
        domBranches.append(option);
    }

    var tagsButton = this.domElement.find('#tagsButton');
    var branchesButton = this.domElement.find('#branchesButton');
    var start = this.start.bind(this);

    tagsButton.on('click', function(event) {
        event.preventDefault();
        var value = domTags.val();
        if (value) {
            start(value);
        }
    });

    branchesButton.on('click', function(event) {
        event.preventDefault();
        var value = domBranches.val();
        if (value) {
            start(value);
        }
    });
};

/**
 * Start loadin PIXI
 * @method start
 */
VersionChooser.prototype.start = function(tag)
{
    var script = $('<script></script>');
    var src = this.cdnTemplate.replace('${tag}', tag);
    script.prop('src', src);

    this.addScript(script);
};

/**
 * Start loadin PIXI
 * @method addScript
 * @param {JQuery} script The script element
 */
VersionChooser.prototype.addScript = function(script)
{
    script.get(0).onerror = function() {
        console.error("Script loading error");
    };

    this.domElement.append(script);
    this.domElement.addClass('loading');

    // Check for pixi being available
    this.ticker = setInterval(this.update.bind(this), 15);

    // Also add a timeout
    this.timeout = setTimeout(this.stop.bind(this), 10000);
};

/**
 * Check for when pixi is available
 * @method update
 */
VersionChooser.prototype.update = function()
{
    if (typeof PIXI !== 'undefined')
    {
        this.stop();
    }
};

/**
 * Finish the loading
 * @method stop
 */
VersionChooser.prototype.stop = function()
{
    this.domElement.addClass('hidden');
    clearInterval(this.ticker);
    clearTimeout(this.timeout);
    this.timeout = null;
    this.ticker = null;
    this.select(parseInt(this.initCount.val()));
};

module.exports = VersionChooser;

},{}],5:[function(require,module,exports){
var BunnyMark = require('./BunnyMark');
var VersionChooser = require('./VersionChooser');

// Window ready
$(function()
{
    var app = new BunnyMark('#frame');

    // Check for local pixi.js
    if (typeof PIXI === 'undefined')
    {
        var chooser = new VersionChooser('#chooser');
        chooser.select = app.ready.bind(app);
        chooser.init();
    }
    else
    {
        app.ready();
    }
});
},{"./BunnyMark":2,"./VersionChooser":4}]},{},[5]);
