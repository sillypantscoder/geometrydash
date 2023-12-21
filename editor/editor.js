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
		/** @type {(string | undefined)[]} */
		this.extraStyles = []
		this.update()
	}
	update() {
		this.elm.setAttribute("style", `--x: ${this.x}; --y: ${this.y};${this.extraStyles.map((v) => v==undefined ? "" : ` ${v}`).join("")}`)
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
	relative(x, y, w, h) {
		return new Rect(
			this.x + (this.w * x),
			this.y + (this.h * y),
			this.w * w,
			this.h * h
		)
	}
}
class Tile extends SceneItem {
	constructor(x, y, type) {
		super(x, y)
		this.extraStyles[0] = `background: url(../assets/tile-${type}.svg);`
		this.update()
	}
	getRect() {
		return new Rect(this.x, this.y, 1, 1)
	}
	update() {
		super.update()
	}
}
class BasicBlock extends Tile {
	constructor(x, y) {
		super(x, y, "basic-block")
	}
}
class HalfBlock extends Tile {
	constructor(x, y) {
		super(x, y, "half-block")
	}
	getRect() {
		return super.getRect().relative(0, 0.5, 1, 0.5);
	}
}
class BasicSpike extends Tile {
	constructor(x, y) {
		super(x, y, "basic-spike")
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.5);
	}
}
class HalfSpike extends Tile {
	constructor(x, y) {
		super(x, y, "half-spike")
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.4);
	}
}
/** @type {Tile[]} */
var tiles = [
	new BasicBlock(10, 0),
	new BasicBlock(11, 0),
	new BasicBlock(12, 0),
	new BasicBlock(13, 0),
	new BasicBlock(13, 1),
	new BasicSpike(12, 1),
	new BasicBlock(9, 0),
	new BasicBlock(9, 1),
	new BasicBlock(9, 3),
	new HalfBlock(14, 1),
	new HalfBlock(15, 1),
	new HalfSpike(15, 2)
]
var blockTypes = {
	"Basic Block": BasicBlock,
	"Basic Spike": BasicSpike,
	"Half Block": HalfBlock,
	"Half Spike": HalfSpike
}

function onclick(evt) {
	var pos = [
		Math.floor(evt.clientX / 20),
		Math.floor(((window.innerHeight * 0.75) - evt.clientY) / 20)
	]
	if (pos[1] < 0) return
	var selectedBlock = document.querySelector("#currentBlock").value
	if (selectedBlock == "") {
		// Remove
		for (var i = 0; i < tiles.length; i++) {
			if (tiles[i].x == pos[0] && tiles[i].y == pos[1]) {
				tiles[i].destroy()
				tiles.splice(i, 1)
				i -= 1;
			}
		}
	} else {
		var type = blockTypes[selectedBlock]
		tiles.push(new type(pos[0], pos[1]))
	}
}
document.querySelector("#scene").addEventListener("click", onclick);

var debug = false
function exportLevel() {
	var r = []
	var map = Object.entries(blockTypes)
	var values = map.map((v) => v[1])
	var keys = map.map((v) => v[0])
	for (var i = 0; i < tiles.length; i++) {
		var type = keys[values.findIndex((v) => tiles[i] instanceof v)]
		r.push({
			type,
			x: tiles[i].x,
			y: tiles[i].y
		})
	}
	var data = btoa(JSON.stringify({
		objects: r,
		debug
	}))
	window.open("../game/index.html?" + data)
}

(() => {
	var k = Object.keys(blockTypes)
	for (var i = 0; i < k.length; i++) {
		var e = document.createElement("option")
		e.text = k[i]
		e.value = k[i]
		document.querySelector("#currentBlock").appendChild(e)
	}
})();
