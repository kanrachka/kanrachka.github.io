/** This file represents the user client for The Colorless Chat application.
* 
* The Colorless Chat Client
* Revision: 1 2015/12/29
* @Authors: Warlock, Gargron, Trev, Acostoss
*
**/

// Function to congifure browser window.
(function (window) {
  'use strict';

  // Function to set up a Router.
  var router = new Router({
    '': { // Main default route handler.
      on: function () {
        router.setRoute('channel/main');
      }
    },

    '/channel/:id': { // Channel handler.
      on: function (id) {
        $('.page').append(channel_el);

        if (window.Chat.channel !== id) {
          window.Chat.switch_channel(id);
        }

        $('.current-channel').text('Channel: /' + id + '/');
        $('.back').hide();
      },
      after: function () {
        $(channel_el).detach();
        $('.back').slideDown();
      }
    },

    '/auth': { // Auth handler.
      on: function () {
        $('.page').append(auth_el);
      },
      after: function () {
        $(auth_el).detach();
      }
    },

    '/users': { // Users handler.
      on: function () {
        var str = '';

        window.Chat.users.each(function () {
		  // String for creating list of online users in userlist.
          str += '<li><a href="http://thecolorless.net/users/' + this.name + '" target="_blank"><img src="http://gravatar.com/avatar/' + this.hash + '?s=64" width="30" height="30" /><strong>' + this.name + '</strong>' + (this.role === -1 ? 'Guest' : window.Chat.roles[this.role]) + '</a></li>';
        });

        $(users_el).find('ul').html(str);
        $('.page').append(users_el);
      },
      after: function () {
        $(users_el).detach();
      }
    },

    '/activity': { // Activity handler.
      on: function () {
        $('.page').append(activity_el);

		// Fetch a defined activity.
        if (typeof Activity !== "undefined") {
          Activity.fetch();
        }
      },
      after: function () {
        $(activity_el).detach();

		// Stop defined activities.
        if (typeof Activity !== "undefined") {
          Activity.stop();
        }
      }
    }
  }); // End router settings.

  
  // Begin Chat Window Configuration.
  window.Chat = {
    channels: [],
    users:    new UserList(),
    me:       {},
    synced:   false,

	// Chat Colors.
    colors: {
      "Black":      "222223",
      "Orange":     "d68f19",
      "Blue":       "5d9dc2",
      "Dark blue":  "3c629b",
      "Red":        "920003",
      "Magenta":    "95005c",
      "Green":      "1d8140",
      "Grey":       "717171",
      "Mud Green":  "777137",
      "Purple":     "3c1773",
      "Lime green": "5ab800",
      "Custom":     null
    },

	// Chat roles.
    roles: [
      'Banned member',
      'Regular member',
      'Ranger',
      'Moderator',
      'Admin',
      'Owner',
    ],

	// Function for switching channels.
    switch_channel: function (id) {
      var self = this;

	  // Return if user already on desired channel to avoid fallthrough.
      if (id === self.channel && typeof self.channel !== "undefined") {
        return;
      }
	  
	  // Redirect undefined channels to "main" channel.
      if (typeof id === "undefined") {
        id = 'main';
      }

      self.connection.close(); // Close current connection.
      self.channel = id; // Set to desired channel.

      $('.back').attr('href', '#/channel/' + id);

	  // Set connection path.
      self.connection.url = {
        websocket: 'ws://chatdev.thecolorless.net:1251/ws/' + id,
        comet: {
          push: 'http://chatdev.thecolorless.net:1250/comet/send?channel=' + id,
          pull: 'http://chatdev.thecolorless.net:1250/comet/poll?channel=' + id
        }
      };

	  // Connect to the connection.
      self.connection.connect();
    }, // End settings for changing channels.

	// Function for channel binding.
    bind:  function () {
      var self = this,
          name;

      self.connection  = new Connection(); // Create a new Connection instance.
      self.reconnector = new Reconnector(); // Create a new Reconnection instance.
      self.export      = new Export(); // Create a new Export instance.
      self.sound       = true; // Enable ping sound by default.
      self.bling       = document.getElementById('bling'); // Store ping element properties.

	  // Function to set up a connection event.
      self.connection.opened.add(function () {
        self.synced = false; // Connection not synced yet.

        self.connection.send({
          request: true // Connection request sent.
        });

		// Set a current connection type.
        $('.current-connection').text(self.connection.type === "websocket" ? "WebSocket" : "Comet");

		// Reset the reconnector.
        self.reconnector.reset();

		// Hide loading gif after connnection.
        $("#loading").hide();

        /*!
         * If after 10 seconds after connecting we still aren't synced, switch protocol
         */

		// Function to timeout window.
        window.setTimeout(function () {
          console.log("Testing current connection for validity...");
		  
		  // Check if connection synced yet.
          if (self.synced === false) {
            console.log("Nope, not valid. Switching protocols...");

            self.connection.type = self.connection.type === "websocket" ? "comet" : "websocket"; // Set a connection type.
            self.connection.connect(); // Connect to the connection.
          } else {
            console.log("Connection is fine, we are synced!");
          }
        }, 10000);
      }); // End connection event settings.

	  // Function for closed connection.
      self.connection.closed.add(function () {
        var latest_message = $(".subscription li:eq(0)");

		// Show the loading gif.
        $("#loading").show();

		// Check if user has latest message.
        if (latest_message.hasClass('disconnect') === false) {
          $(channel_el).prepend('<li class="info disconnect"><abbr title="Here you disconnected. There might be messages that you did not receive while you were offline.">&hellip;</abbr></li>');
        }

		// Function to timeout window.
        window.setTimeout(function () {
          if (self.connection.status() === 'offline') {
            self.reconnector.attempt(function () {
              console.log('Connection closed, reconnecting...');
              self.connection.connect();
            });
          }
        }, 1000);
      });

      self.connection.received.add(function (d) {
        self.handle.apply(self, [d]);
      });

      self.connection.besent.add(function () {
        $('#loading').show(); // Show loading gif.
      });

      self.connection.sent.add(function () {
        $('.publish input').val('');
        $('#loading').hide(); // Hide loading gif.
      });

      self.connection.ballsed.add(function () {
        self.reconnector.attempt(function () {
          console.log('Error! Reconnecting...');
          self.connection.connect();
        });
      });

	  // Change WebSocket type for compatability.
      if (typeof window.WebSocket === "undefined" && typeof window.MozWebSocket !== "undefined") {
        window.WebSocket = window.MozWebSocket;
      }

	  // Check for defined non-matching connection types.
      if (typeof window.WebSocket !== "undefined") {
        self.connection.type = "websocket"; // Set connection type as WebSocket.
      } else {
        self.connection.type = "comet"; // Set connection type as Comet.
      }

      /*!
       * Setup DOM events
       */

      $(document).on('submit', '.publish', function (e) {
        e.preventDefault();

        self.connection.send({
          text: $(e.currentTarget).find('input').val(),
          hex:  $('.current-color').data('hex')
        });
      });

      /*!
       * Pre-build dynamic DOM elements
       */

      for (name in self.colors) {
        if (self.colors.hasOwnProperty(name)) {
          $('.colors').append('<li data-hex="' + self.colors[name] + '">' + name + '</li>');
        }
      }

      $(document).on('click', '.colors li', function (e) {
        var el = $(e.currentTarget);

        $('.current-color').data('hex', el.data('hex')).text('Color: ' + el.text());
      });

	  // Toggle sound on/off.
      $(document).on('click', 'a[data-toggle=sound]', function (e) {
        e.preventDefault();
        var el = $(e.currentTarget);

        if (self.sound) {
          self.sound = false; // disable sound.
          el.text("Sound: off");
        } else {
          self.sound = true; // enable sound.
          el.text("Sound: on");
        }
      });

	  // Export chat contents.
      $(document).on('click', 'a[data-toggle=export]', function (e) {
        self.export.print();
      });

	  // Function to choose desired connection type.
      $(document).on('click', '.connection-types li', function (e) {
        var el = $(e.currentTarget);

        self.connection.type = el.data('type'); // Store the desired connection type.
        self.connection.connect(); // Connect to the connection.
      });

	  // Function to create a new channel.
      $(document).on('click', '.new-channel', function () {
        var chname = window.prompt('New channel name:');

        if (typeof chname === "string") {
          chname = chname.match(/[\w_\-]+/g).join('');

          if (chname.length > 0) {
            window.open('/#/channel/' + chname, '_blank');
          }
        }
      });

	  // Function to quick reply to a user.
      $(document).on('click', 'a[data-replyto]', function (e) {
        var el = $(e.currentTarget);
        $('.message').val($('.message').val() + '@' + el.data('replyto') + ' ');
        $('.message').focus();
      });

	  // Function to kick a user.
      $(document).on('click', 'a[data-kick]', function (e) {
        var name = $(e.currentTarget).data('kick');
        if(window.confirm('Are you sure you want to mute ' + name + ' for 300 seconds (5 minutes)?')) {
          self.connection.send({
            text: '/boot ' + name + ' 300',
            hex:  '000000'
          });
        }
      });

      self.switch_channel('main'); // Switch the channel to "main" by default.
      router.init(); // Initiate the router.

	  // Check for invalid routing.
      if (router.getRoute().length === 1 && router.getRoute()[0].length === 0) {
        router.setRoute('channel/main'); // Reroute to main.
      }
    }, // End channel binding.

	// Function to handle various data sent within a message.
    handle: function (data) {
      var self = this,
          i,
          len,
          mention_me,
          is_nsfw,
          text,
          hex,
          current_scroll,
          newest_height;

	  // Return if data is non-object.
      if (typeof data !== "object") {
        return;
      }

	  // Check if data is synced.
      if (data.type === "sync") {
        self.users    = new UserList(); // Set up a new userlist.
        self.channels = data.text.channels; // Store channel list.
        self.me       = data.user; // Store user for each unique client.
        self.synced   = true; // Set synced to true.

		// Put all users in the userlist.
        for (i = 0, len = data.text.users.length; i < len; (i += 1)) {
          self.users.add(data.text.users[i]); // Add users to the userlist.
        }

        $('.channels').empty(); // Empty channels.
        $('.channels').append('<li class="new-channel">Create a new channel</li>');

		// Put all channels in the channel list.
        for (i = 0, len = data.text.channels.length; i < len; (i += 1)) {
          $('.channels').append('<li><a href="#/channel/' + data.text.channels[i] + '">/' + data.text.channels[i] + '/</a></li>');
        }

        $('.online').html(data.text.users.length); // Store number of online users.

		// Check if user is not registered.
        if (data.user.role < 0) {
          router.setRoute('auth');
        }
      }

	  // Verify posted sent data is text.
      if (data.type === "text") {
        mention_me = data.text.search(new RegExp(typeof self.me.name !== "undefined" ? self.me.name : "Guest", "i")) !== -1;
        text       = data.text.replace(/(^|\s)(https?:\/\/?[\w\-]+(\.[\w\-]+)+\.?(:\d+)?(\/\S*)?)/gi, "$1<a href='$2' target='_blank'>$2</a>");
        is_nsfw    = data.text.search(/^\/nsfw\s/i) !== -1;
		
		// Correct nsfw text placement.
        if (is_nsfw) {
          text = text.substr(6);
        }
		
		// Check message validity.
        if (!is_nsfw || self.me.nsfw) {
		
		  // Play sound when user pinged.
          if (mention_me && !!self.sound && !!self.bling.play) {
            self.bling.play();
          }
		  
          self.export.append(data.user.name, data.text);
		  
		  // Message displayed in chat.
          $(channel_el).prepend('<li class="text' + (mention_me ? ' mention' : '') + (is_nsfw ? ' nsfw' : '') + '"><address class="author"><div class="avatar"><img src="http://gravatar.com/avatar/' + data.user.hash + '?s=64&amp;d=http%3A%2F%2Fthecolorless.net%2Fimages%2Fno_avatar.gif" width="50" height="50" /><a href="javascript:;" data-replyto="' + data.user.name + '">@</a>' + (self.me.role > 1 ? '<a href="javascript:;" data-kick="' + data.user.name + '">K300</a>' : '') + '</div><a href="//thecolorless.net/users/' + data.user.name + '" target="_blank">' + data.user.name + '</a></address><span class="triangle"><span style="border-right-color: #' + data.hex + '"></span></span><div class="article" style="background-color: #' + data.hex + '">' + (is_nsfw ? '<abbr class="symbol-nsfw" title="Not Safe For Work">NSFW</abbr>' : '') + text + ((self.me.role > 2) && (data.user.role == -1) ? ' (' + data.user.ip + ')' : '') + '</div></li>');
		  //$(channel_el).prepend('<li class="text' + (mention_me ? ' mention' : '') + (is_nsfw ? ' nsfw' : '') + '"><address class="author"><div class="avatar"><img src="http://gravatar.com/avatar/' + data.user.hash + '?s=64&amp;d=http%3A%2F%2Fthecolorless.net%2Fimages%2Fno_avatar.gif" width="50" height="50" /><a href="javascript:;" data-replyto="' + data.user.name + '">@</a>' + (self.me.role > 1 ? '<a href="javascript:;" data-kick="' + data.user.name + '">K300</a>' : '') + '</div><a href="//thecolorless.net/users/' + data.user.name + '" target="_blank">' + data.user.name + '</a></address><span class="triangle"><span style="border-right-color: #' + data.hex + '"></span></span><div class="article" style="background-color: #' + data.hex + '; border-color: #' + data.hex + '">' + (is_nsfw ? '<abbr class="symbol-nsfw" title="Not Safe For Work">NSFW</abbr>' : '') + text + ((self.me.role > 2) && (data.user.role == -1) ? ' (' + data.user.ip + ')' : '') + '</div></li>');
		}
      }

      if (data.type === "action") {
        hex = new Hex(data.hex).brighten(100).get();
        $(channel_el).prepend('<li class="emote"><span style="color: #' + hex + '">&mdash;</span> <span class="author">' + data.user.name + '</span><span class="action"> ' + data.text + '</span></li>');
      }

	  // Scroll the page as it increases.
      if (data.type === "text"|| data.type === "nsfw" || data.type === "action" ) {
        current_scroll = $(document).scrollTop();
        newest_height  = $(channel_el).find('li:eq(0)').height() + 20;

        if (current_scroll > 0) {
          $(document).scrollTop(current_scroll + newest_height);
        }
      }


	  // Check if a user is online/offline and update status.
      if (data.type === "status") {
        $('.status').html(data.user.name + ' is now ' + data.text + 'line');

        if (data.text === 'on') {
          self.users.add(data.user); // Add online user.
        } else {
          self.users.remove(data.user); // Remove offline user.
        }

        $('.online').html(self.users.length());
      }
    }
  }; // End chat window settings.

  $(function () {
    window.channel_el  = $('.subscription').detach();
    window.auth_el     = $('.auth').detach();
    window.users_el    = $('.users').detach();
    window.activity_el = $('.activity').detach();

    Chat.bind();
  });

}(window));
