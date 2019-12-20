(function (window) {
	'use strict';

	var Reconnector = function () {
		this.reset();
		return this;
	};

	Reconnector.prototype.attempt = function (callback) {
		this.incr();
		this.timer = window.setTimeout(callback, this.seconds * 1000);
	};

	Reconnector.prototype.incr = function () {
		if (this.seconds < 60) {
			this.seconds += 1;
		}
	};

	Reconnector.prototype.reset = function () {
		this.seconds = 0;
		window.clearTimeout(this.timer);
		this.timer   = undefined;
	};

	window.Reconnector = Reconnector;
}(window));
