(function (window) {
	'use strict';

	var Connection = function () {
		return this;
	};

	Connection.prototype.opened   = new signals.Signal();
	Connection.prototype.closed   = new signals.Signal();
	Connection.prototype.received = new signals.Signal();
	Connection.prototype.sent     = new signals.Signal();
	Connection.prototype.besent   = new signals.Signal();
	Connection.prototype.ballsed  = new signals.Signal();

	Connection.prototype.connect = function () {
		this.close();

		if (this.type === "websocket") {
			try {
				this.ws = new WebSocket(this.url.websocket);
				this.bind();
			} catch (Exception) {
				this.type = 'comet';
				this.connect();
			}
		} else {
			this.poll_req = this.poll();
			this.opened.dispatch();
		}
	};

	Connection.prototype.close = function () {
		if (typeof this.ws === "object") {
			this.ws.close();
		}

		if (typeof this.poll_req === "object") {
			this.poll_req.abort();
			this.closed.dispatch();
		}

		this.ws       = undefined;
		this.poll_req = undefined;
	};

	Connection.prototype.status = function () {
		return ((this.type === "websocket" && typeof this.ws === "object" && this.ws.readyState < 2) || (this.type === "comet" && typeof this.poll_req === "object")) ? 'online' : 'offline';
	};

	Connection.prototype.bind = function () {
		var self = this;

		this.ws.onopen    = function () {
			self.opened.dispatch();
		};

		this.ws.onmessage = function (event) {
			var data;

			try {
				data = JSON.parse(event.data);
			} catch (Exception) {
				data = event.data;
			}

			self.received.dispatch(data);
		};

		this.ws.onclose   = function () {
			self.closed.dispatch();
		};

		this.ws.onerror = function () {
			self.ballsed.dispatch();
		};
	};

	Connection.prototype.poll = function () {
		var self = this;

		return $.ajax(this.url.comet.pull, {
			type:     'GET',
			dataType: 'json',
			cache:    false,
			async:    true,
			timeout:  890000,
			success:  function (data) {
				self.received.dispatch(data);
				self.poll_req = self.poll();
			},
			error:    function () {
				self.ballsed.dispatch();
			}
		});
	};

	Connection.prototype.send = function (data) {
		var self = this;

		this.besent.dispatch();

		if (typeof this.ws === "object") {
			this.ws.send(JSON.stringify(data));
			this.sent.dispatch();
		} else {
			return $.ajax(this.url.comet.push, {
				type:     'GET',
				async:    true,
				data:     { 'data': JSON.stringify(data) },
				dataType: 'json',
				success:  function (data) {
					self.received.dispatch(data);
					self.sent.dispatch();
				},
				error:    function () {
					self.ballsed.dispatch();
				}
			});
		}
	};

	window.Connection = Connection;
}(window));
