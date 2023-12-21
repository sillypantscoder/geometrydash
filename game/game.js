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
	}
	tick() {
		this.elm.setAttribute("style", `--x: ${this.x}; --y: ${this.y};${this.extraStyles.map((v) => v==undefined ? "" : ` ${v}`).join("")}`)
	}
	destroy() {
		this.elm.remove()
	}
}
class Stage extends SceneItem {
	constructor() {
		super(0, 0)
		this.elm.classList.remove("regularPos")
		this.elm.classList.add("stage")
	}
}
class Player extends SceneItem {
	constructor() {
		super(-3, 0)
		this.elm.classList.add("player")
		/** @type {boolean} */
		this.alive = true
		/** @type {number} */
		this.rotation = 0
		/** @type {number} */
		this.vy = 0
		/** @type {boolean} */
		this.onGround = false
	}
	getRect() {
		return new Rect(this.x, this.y, 1, 1)
	}
	tick() {
		// Move forwards
		this.x += 0.1
		// Fall
		this.vy -= 0.028
		this.y += this.vy
		this.onGround = false
		// Check for collision with stage
		if (this.y < 0) {
			this.y = 0
			this.onGround = true
		}
		// Update styles
		this.extraStyles[0] = `transform: rotate(${this.rotation}deg);`
		super.tick()
	}
	finishTick() {
		if (this.onGround) {
			this.vy = 0
			this.rotation = 0
			particles.push(new SlideParticle(this.x, this.y))
			// Jump
			if (isPressing) {
				this.cubeJump()
			}
		} else {
			this.rotation += 5
		}
		if (this.x > 20) this.destroy()
		if (url_info.debug) RectDisplay.create(this)
	}
	cubeJump() {
		this.vy += 0.35
	}
	destroy() {
		this.alive = false
		super.destroy()
		particles.push(new DeathParticleMain(this.x + 0.5, this.y + 0.5))
		for (var i = 0; i < 20; i++) {
			particles.push(new DeathParticleExtra(this.x + 0.5, this.y + 0.5))
		}
	}
}
class Particle extends SceneItem {
	constructor(x, y) {
		super(x, y)
		this.elm.classList.remove("regularPos")
		this.elm.classList.add("particle")
		this.extraStyles[0] = `background: radial-gradient(circle, #0F53 0%, #0F5F 100%);`
		this.extraStyles[1] = `border-radius: 50%;`
		this.extraStyles[2] = `--size: 0.2;`
	}
}
class SlideParticle extends Particle {
	constructor(x, y) {
		super(x, y)
		this.oy = y
		this.vx = Math.random() / -20
		this.vy = Math.random() / 10
		this.time = 0
		this.extraStyles[2] = `--size: 0.1;`
	}
	tick() {
		this.time += 1
		this.vy -= 0.005
		this.x += this.vx
		this.y += this.vy
		if (this.y <= this.oy) {
			this.y = this.oy
			this.vy = 0
		}
		this.extraStyles[1] = `opacity: ${this.time.map(0, 15, 1, 0)};`
		super.tick()
		if (this.time >= 15) this.destroy()
	}
}
class DeathParticleMain extends Particle {
	constructor(x, y) {
		super(x, y)
		this.size = 1
	}
	tick() {
		this.size += 0.2
		this.extraStyles[2] = `--size: ${this.size};`
		this.extraStyles[3] = `opacity: ${this.size.map(1, 5, 1, 0)};`
		super.tick()
		if (this.size >= 5) this.destroy()
	}
}
class DeathParticleExtra extends Particle {
	constructor(x, y) {
		super(x, y)
		this.vx = (Math.random() - 0.5) / 3
		this.vy = (Math.random() - 0.5) / 3
		this.size = 1
	}
	tick() {
		this.size += 0.2
		this.x += this.vx
		this.y += this.vy
		this.extraStyles[1] = `opacity: ${this.size.map(1, 5, 1, 0)};`
		super.tick()
		if (this.size >= 5) this.destroy()
	}
}
class RectDisplay extends Particle {
	/** @param {Rect} rect */
	constructor(rect, color) {
		super(rect.x, rect.y)
		this.elm.classList.remove("particle")
		this.elm.classList.add(`rect-${rect.x}-${rect.y}-${rect.w}-${rect.h}`)
		this.extraStyles[0] = `background: ${color};`
		this.extraStyles[2] = `bottom: calc(25% + calc(${rect.y} * var(--tile-size))); left: calc(${rect.x} * var(--tile-size)); width: calc(${rect.w} * var(--tile-size)); height: calc(${rect.h} * var(--tile-size));`
		this.time = 0
	}
	tick() {
		// this.time += 1
		this.extraStyles[1] = `opacity: ${this.time.map(0, 5, 1, 0)};`
		super.tick()
		if (this.time >= 5) this.destroy()
	}
	/** @param {Tile | Player} item */
	static create(item) {
		var color = "lime"
		if (item instanceof Player) color = "yellow"
		if (item instanceof TileDeath) color = "red"
		particles.push(new RectDisplay(item.getRect(), color))
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
		if (url_info.debug) RectDisplay.create(this)
	}
	getRect() {
		return new Rect(this.x, this.y, 1, 1)
	}
	tick() {
		this.collide()
		super.tick()
		// RectDisplay.create(this)
	}
	collide() {}
}
class TileBlock extends Tile {
	collide() {
		var playerRect = player.getRect()
		var thisRect = this.getRect()
		if (playerRect.colliderect(thisRect)) {
			var yIncrease = (thisRect.y + thisRect.h) - playerRect.y
			if (yIncrease < 0.5) {
				// Player is fine
				player.y += yIncrease
				player.onGround = true
			} else {
				if (url_info.debug) {
					setTimeout((thisRect, playerRect, yIncrease) => {
						particles.push(new RectDisplay(new Rect(thisRect.x, playerRect.y, thisRect.w, yIncrease), "pink"))
					}, 100, thisRect, playerRect, yIncrease)
				}
				player.destroy()
			}
		}
	}
}
class TileDeath extends Tile {
	collide() {
		var playerRect = player.getRect()
		var thisRect = this.getRect()
		if (playerRect.colliderect(thisRect)) {
			// Player dies!
			player.destroy()
			if (url_info.debug) {
				setTimeout(() => {
					particles.push(new RectDisplay(player.getRect(), "orange"))
				}, 100)
			}
		}
	}
}
class BasicBlock extends TileBlock {
	constructor(x, y) {
		super(x, y, "basic-block")
	}
}
class HalfBlock extends TileBlock {
	constructor(x, y) {
		super(x, y, "half-block")
	}
	getRect() {
		return super.getRect().relative(0, 0.5, 1, 0.5);
	}
}
class BasicSpike extends TileDeath {
	constructor(x, y) {
		super(x, y, "basic-spike")
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.8);
	}
}
class HalfSpike extends TileDeath {
	constructor(x, y) {
		super(x, y, "half-spike")
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.4);
	}
}
var player = new Player()
var stage = new Stage()
/** @type {Particle[]} */
var particles = []
/** @type {Tile[]} */
var tiles = []
var isPressing = false

document.addEventListener("keydown", (e) => {
	if (e.key == " ") isPressing = true
})
document.addEventListener("keyup", (e) => {
	if (e.key == " ") isPressing = false
})
document.addEventListener("mousedown", (e) => {
	isPressing = true
})
document.addEventListener("mouseup", (e) => {
	isPressing = false
})
document.addEventListener("touchstart", (e) => {
	isPressing = true
})
document.addEventListener("touchend", (e) => {
	isPressing = false
})

var blockTypes = {
	"Basic Block": BasicBlock,
	"Basic Spike": BasicSpike,
	"Half Block": HalfBlock,
	"Half Spike": HalfSpike
}
/** @param {{ type: string, x: number, y: number }[]} o */
function importObjects(o) {
	for (var i = 0; i < o.length; i++) {
		var obj = o[i]
		var c = new blockTypes[obj.type](obj.x, obj.y)
		tiles.push(c)
	}
}
// importObjects([
// 	{type: "Basic Block", x: 10, y: 0},
// 	{type: "Basic Block", x: 11, y: 0},
// 	{type: "Basic Block", x: 12, y: 0},
// 	{type: "Basic Block", x: 13, y: 0},
// 	{type: "Basic Block", x: 13, y: 1},
// 	{type: "Basic Spike", x: 12, y: 1},
// 	{type: "Basic Block", x: 9, y: 0},
// 	{type: "Basic Block", x: 9, y: 1},
// 	{type: "Basic Block", x: 9, y: 3},
// 	{type: "Half Block", x: 14, y: 1},
// 	{type: "Half Block", x: 15, y: 1},
// 	{type: "Half Spike", x: 15, y: 2}
// ])
var url_info = JSON.parse(atob(location.search.substring(1)))
importObjects(url_info.objects)

function frame() {
	stage.tick()
	for (var i = 0; i < particles.length; i++) {
		particles[i].tick()
	}
	if (player.alive) {
		player.tick()
		for (var i = 0; i < tiles.length; i++) {
			tiles[i].tick()
		}
		player.finishTick()
	}
}
async function frameLoop() {
	while (true) {
		frame()
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}
frameLoop()