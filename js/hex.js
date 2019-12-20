(function (window) {
	'use strict';

	var Hex = function (string) {
		if (typeof string !== "string") {
			string = '000000';
		}

		this.r = parseInt(string.slice(0, 2), 16);
		this.g = parseInt(string.slice(2, 4), 16);
		this.b = parseInt(string.slice(4, 6), 16);

		return this;
	};

	Hex.prototype.pad = function (num) {
		return (num.length === 1) ? '0' + num : num;
	};

	Hex.prototype.brighten = function (by) {
		this.r = Math.min(this.r + by, 255);
		this.g = Math.min(this.g + by, 255);
		this.b = Math.min(this.b + by, 255);

		return this;
	};

	Hex.prototype.get = function () {
		return this.pad(this.r.toString(16)) + this.pad(this.g.toString(16)) + this.pad(this.b.toString(16));
	};

	window.Hex = Hex;
}(window));
