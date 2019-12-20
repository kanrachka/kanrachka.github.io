(function (window) {
	var UserList = function () {
		return this;
	};

	UserList.prototype.add = function (user) {
		this[user.name] = user;
	};

	UserList.prototype.remove = function (user) {
		delete this[user.name];
	};

	UserList.prototype.each = function (fn) {
		var key;

		for (key in this) {
			if (this.hasOwnProperty(key)) {
				fn.call(this[key]);
			}
		}
	};

	UserList.prototype.length = function () {
		var i = 0,
		    key;

		for (key in this) {
			if (this.hasOwnProperty(key)) {
				i += 1;
			}
		}

		return i;
	};

	window.UserList = UserList;
}(window));
