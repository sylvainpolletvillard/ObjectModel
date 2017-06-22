"use strict";

function _toConsumableArray(arr) {
	if (Array.isArray(arr)) {
		for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
			arr2[i] = arr[i];
		}
		return arr2;
	} else {
		return Array.from(arr);
	}
}

{
	var selectLink = function selectLink(hash) {
		var _iteratorNormalCompletion2 = true;
		var _didIteratorError2         = false;
		var _iteratorError2            = undefined;

		try {
			for (var _iterator2 = links[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
				var _link = _step2.value;

				_link.classList.toggle("active", _link.getAttribute("href") === hash);
			}
		} catch (err) {
			_didIteratorError2 = true;
			_iteratorError2    = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion2 && _iterator2.return) {
					_iterator2.return();
				}
			} finally {
				if (_didIteratorError2) {
					throw _iteratorError2;
				}
			}
		}
	};

	var links    = [].concat(_toConsumableArray(document.querySelectorAll("#menu a[href^='#']"))),
	    sections = links.map(function (link) {
		    return document.querySelector(link.getAttribute("href"));
	    });

	document.getElementById("menu-button").onclick = function toggleMenu() {
		document.body.classList.toggle("menu-opened");
	};

	var _iteratorNormalCompletion = true;
	var _didIteratorError         = false;
	var _iteratorError            = undefined;

	try {
		for (var _iterator = links[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var link = _step.value;

			link.addEventListener("focus", function showMenu() {
				document.body.classList.add("menu-opened");
			});
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError    = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	window.addEventListener("hashchange", function () {
		setTimeout(function () {
			return selectLink(location.hash);
		}, 1); //delay to trigger after scroll event
	});

	window.addEventListener("scroll", function () {
		var nearest = {section: sections[0], delta: Infinity},
		    pos     = window.scrollY + window.innerHeight / 6;

		var _iteratorNormalCompletion3 = true;
		var _didIteratorError3         = false;
		var _iteratorError3            = undefined;

		try {
			for (var _iterator3 = sections[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
				var section = _step3.value;

				var delta = Math.abs(pos - section.offsetTop);
				if (delta < nearest.delta) {
					nearest.section = section;
					nearest.delta   = delta;
				}
			}
		} catch (err) {
			_didIteratorError3 = true;
			_iteratorError3    = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion3 && _iterator3.return) {
					_iterator3.return();
				}
			} finally {
				if (_didIteratorError3) {
					throw _iteratorError3;
				}
			}
		}

		selectLink('#' + nearest.section.id);
	});

	var _loop = function _loop(code) {
		fetch(code.getAttribute("data-source")).then(function (res) {
			return res.text();
		}).then(function (source) {
			code.textContent = source;
			code.removeAttribute("data-source");
			Prism.highlightElement(code);
		});
	};

	var _arr = [].concat(_toConsumableArray(document.querySelectorAll("code[data-source]")));

	for (var _i = 0; _i < _arr.length; _i++) {
		var code = _arr[_i];
		_loop(code);
	}
}

//# sourceMappingURL=main-compiled.js.map