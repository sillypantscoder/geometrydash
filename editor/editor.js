Number.prototype.map = function (in_min, in_max, out_min, out_max) {
	return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}



class SceneItem {
	/**
	 * @param {number} x The starting X position.
	 * @param {number} y The starting Y position.
	 */
	constructor(x, y) {
		/** @type {HTMLDivElement} */
		this.elm = document.createElement("div")
		this.elm.classList.add("regularPos")
		document.querySelector("#scene").appendChild(this.elm)
		/** @type {number} */
		this.x = x
		/** @type {number} */
		this.y = y
		/** @type {number} */
		this.rotation = 0
		/** @type {(string | undefined)[]} */
		this.extraStyles = []
		this.update()
	}
	update() {
		this.elm.setAttribute("style", `--x: ${this.x}; --y: ${this.y}; transform: rotate(${this.rotation}deg);${this.extraStyles.map((v) => v==undefined ? "" : ` ${v}`).join("")}`)
	}
	destroy() {
		this.elm.remove()
	}
}
class Rect {
	constructor(x, y, w, h) {
		/** @type {number} */
		this.x = x
		/** @type {number} */
		this.y = y
		/** @type {number} */
		this.w = w
		/** @type {number} */
		this.h = h
	}
	/**
	 * Determine whether this Rect collides with another Rect.
	 * @param {Rect} other The rect to check.
	 */
	colliderect(other) {
		return this.x < other.x + other.w
			&& this.x + this.w > other.x
			&& this.y < other.y + other.h
			&& this.y + this.h > other.y;
	}
	move(x, y) {
		return new Rect(this.x + x, this.y + y, this.w, this.h)
	}
	centerY() {
		return this.y + (this.h / 2)
	}
	centerX() {
		return this.x + (this.w / 2)
	}
	relative(x, y, w, h) {
		return new Rect(
			this.x + (this.w * x),
			this.y + (this.h * y),
			this.w * w,
			this.h * h
		)
	}
	static fromPoints(x1, y1, x2, y2) {
		return new Rect(
			Math.min(x1, x2),
			Math.min(y1, y2),
			Math.abs(x1 - x2),
			Math.abs(y1 - y2)
		)
	}
	rotate(amount, centerX, centerY) {
		function rotate(cx, cy, x, y, angle) {
			var radians = (Math.PI / 180) * angle,
				cos = Math.cos(radians),
				sin = Math.sin(radians),
				nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
				ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
			return [nx, ny];
		}
		var a = rotate(centerX, centerY, this.x, this.y, amount)
		var b = rotate(centerX, centerY, this.x + this.w, this.y + this.h, amount)
		return Rect.fromPoints(a[0], a[1], b[0], b[1])
	}
}
class Tile extends SceneItem {
	constructor(x, y, type, rotation) {
		super(x, y)
		this.extraStyles[0] = `background: url(../assets/tile-${type}.svg);`
		this.rotation = rotation
		this.update()
	}
	getRect() {
		return new Rect(this.x, this.y, 1, 1)
	}
}
class BasicBlock extends Tile {
	constructor(x, y, rotation) {
		super(x, y, "basic-block", rotation)
	}
}
class HalfBlock extends Tile {
	constructor(x, y, rotation) {
		super(x, y, "half-block", rotation)
	}
	getRect() {
		return super.getRect().relative(0, 0.5, 1, 0.5);
	}
}
class BasicSpike extends Tile {
	constructor(x, y, rotation) {
		super(x, y, "basic-spike", rotation)
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.5);
	}
}
class HalfSpike extends Tile {
	constructor(x, y, rotation) {
		super(x, y, "half-spike", rotation)
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.4);
	}
}
/** @type {Tile[]} */
var tiles = []
var blockTypes = {
	"basic-block": BasicBlock,
	"basic-spike": BasicSpike,
	"half-block": HalfBlock,
	"half-spike": HalfSpike
}
/** @param {{ type: string, x: number, y: number }[]} o */
function importObjects(o) {
	for (var i = 0; i < o.length; i++) {
		var obj = o[i]
		var c = new blockTypes[obj.type](obj.x, obj.y, obj.rotation)
		tiles.push(c)
	}
}
importObjects(JSON.parse(atob(url_query.objects)))

function onclick(evt) {
	var pos = [
		Math.floor(evt.clientX / 20),
		Math.floor(((window.innerHeight * 0.75) - evt.clientY) / 20)
	]
	if (pos[1] < 0) return
	var selectedBlock = document.querySelector(".option-element-selected").dataset.value
	if (selectedBlock == ".eraser") {
		// Remove
		for (var i = 0; i < tiles.length; i++) {
			if (tiles[i].x == pos[0] && tiles[i].y == pos[1]) {
				tiles[i].destroy()
				tiles.splice(i, 1)
				i -= 1;
			}
		}
	} else if (selectedBlock == ".rotate") {
		// Rotate
		for (var i = 0; i < tiles.length; i++) {
			if (tiles[i].x == pos[0] && tiles[i].y == pos[1]) {
				tiles[i].rotation = (tiles[i].rotation + 90) % 360
				tiles[i].update()
			}
		}
	} else {
		// Remove old block
		for (var i = 0; i < tiles.length; i++) {
			if (tiles[i].x == pos[0] && tiles[i].y == pos[1]) {
				tiles[i].destroy()
				tiles.splice(i, 1)
				i -= 1;
			}
		}
		// Add new block
		var type = blockTypes[selectedBlock]
		tiles.push(new type(pos[0], pos[1], 0))
	}
}
document.querySelector("#scene").addEventListener("click", onclick);

var debug = false
function getExport() {
	var r = []
	var map = Object.entries(blockTypes)
	var values = map.map((v) => v[1])
	var keys = map.map((v) => v[0])
	for (var i = 0; i < tiles.length; i++) {
		var type = keys[values.findIndex((v) => tiles[i] instanceof v)]
		r.push({
			type,
			x: tiles[i].x,
			y: tiles[i].y,
			rotation: tiles[i].rotation
		})
	}
	return r
}
function exportLevel() {
	var r = getExport()
	var data = btoa(JSON.stringify(r))
	window.open("../game/index.html?objects=" + data)
}
function saveLevel() {
	var r = getExport()
	var data = btoa(JSON.stringify(r))
	location.search = "?objects=" + data
}

(() => {
	document.querySelector("#blocks").addEventListener("click", () => {
		document.querySelector('.option-element-selected').classList.remove('option-element-selected');
	}, true)
	var k = Object.keys(blockTypes)
	for (var i = 0; i < k.length; i++) {
		var e = document.createElement("span")
		e.classList.add("option-element")
		e.setAttribute("onclick", `this.classList.add("option-element-selected")`)
		e.innerHTML = `<div style="background: url(../assets/tile-${k[i]}.svg); width: 1em; height: 1em; display: inline-block;"></div>`
		e.dataset.value = k[i]
		document.querySelector("#blocks").appendChild(e)
	}
})();
