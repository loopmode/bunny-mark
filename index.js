(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

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
 */
BunnyMark.prototype.ready = function(startBunnyCount)
{
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

    this.renderer = PIXI.autoDetectRenderer(this.bounds.right, this.bounds.bottom, {
        backgroundColor: 0xFFFFFF,
        view: view
    });

    // Add fewer bunnies for the canvas renderer
    if (this.renderer instanceof PIXI.CanvasRenderer)
    {
        this.amount = 5;
        this.renderer.context.mozImageSmoothingEnabled = false;
        this.renderer.context.webkitImageSmoothingEnabled = false;
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
        callback();
    });
};

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
        callback();
    });
};

/**
 * Start setup
 * @method init
 */
VersionChooser.prototype.init = function()
{
    var _this = this;
    
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
    var domTags = this.domElement.find('#tags').html('');
    var domBranches = this.domElement.find('#branches').html('');
    var i, button;

    for (i = this.tags.length - 1; i >= 0; i--)
    {
        button = $('<button></button>');
        button.addClass('btn btn-primary btn-sm');
        button.html(this.tags[i]);
        domTags.append(button);
    }

    for (i = this.branches.length - 1; i >= 0; i--)
    {
        button = $('<button></button>');
        button.addClass('btn btn-primary btn-sm');
        button.html(this.branches[i]);
        domBranches.append(button);
    }

    this.domElement.find('button').click(this.start.bind(this));
};

/**
 * Start loadin PIXI
 * @method start
 */
VersionChooser.prototype.start = function(event)
{
    event.preventDefault();

    var tag = event.target.innerHTML;
    this.domElement.find('button')
        .prop('disabled', true)
        .addClass('hidden');

    var script = $('<script></script>');
    var src = this.cdnTemplate.replace('${tag}', tag);
    script.prop('src', src);
    script.get(0).onerror = function() {
        console.log("Script loading error");
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

var app = new BunnyMark('#frame');
var chooser = new VersionChooser('#chooser');
chooser.select = app.ready.bind(app);

// Wait for window
$(chooser.init.bind(chooser));
},{"./BunnyMark":2,"./VersionChooser":4}]},{},[5]);
