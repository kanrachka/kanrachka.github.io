(function (window) {
	var Export = function () {
		this.string   = '';

		return this;
	};

	Export.prototype.append = function (name, text) {
		var now = new Date();

		this.string += '[' + now.toUTCString() + '] ' + name + ': ' + text + "\n";
	};

	Export.prototype.print = function () {
		var poppy    = window.open('', '_blank');
		poppy.document.write('<textarea style="width:100%;height:100%">' + this.string + '</textarea>');
	};

	window.Export = Export;

}(window));
