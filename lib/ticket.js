/**
 * ticket.js
 *
 * Copyright (C) 2016 by Ramon Lima
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
**/
const utils = require('./utils');
const querystring = require('querystring');
const crypto = require('crypto');

const status_cache = {};

const ticket = function (client, xml) {
	this.client = client;
	if (xml) utils.parse_xml(this, xml);
};

ticket.prototype.get = function (id, callback) {
	this.client.get_item(`/Tickets/Ticket/${id}`, ticket, callback);
};

ticket.prototype.search = function (query, callback) {
	const salt = crypto.randomBytes(20).toString('base64');
	const post_options = {
		e: '/Tickets/TicketSearch',
		apikey: this.client.get_apikey(),
		salt: salt,
		signature: this.client.generate_signature(salt),
	};
	for (let k in query) {
		post_options.query = query[k];
		post_options[k] = 1;
	}
	const postdata = querystring.stringify(post_options);
	const request_options = {
		path: '/api/index.php',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postdata.length
		}
	};
	this.client.request(request_options, postdata, (err, res) => {
		if (err) {
			callback(err);
		} else {
			this.client.parse_items(res.data, this.client, require('./ticket'), callback);
		}
	});
};

ticket.prototype.status = function (id, refresh, callback) {
	if (typeof id != 'undefined') {
		if (!refresh && status_cache[id]) {
			callback(null, status_cache[id]);
		} else {
			this.client.get_item(`/Tickets/TicketStatus/${id}`, ticket, (err, res) => {
				if (err) {
					callback(err);
				} else {
					status_cache[res.id] = res;
					callback(null, res);
				}
			});
		}
	} else {
		if (!refresh && Object.keys(status_cache).length) {
			callback(null, status_cache);
		} else {
			this.client.get_items(`/Tickets/TicketStatus`, ticket, (err, res) => {
				if (err) {
					callback(err);
				} else {
					res.forEach(e => status_cache[e.id] = e);
					callback(null, status_cache);
				}
			});
		}
	}
}

module.exports = ticket;
