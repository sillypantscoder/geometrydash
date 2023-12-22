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
	}
	tick() {
		this.elm.setAttribute("style", `--x: ${this.x}; --y: ${this.y}; transform: rotate(${this.rotation}deg);${this.extraStyles.map((v) => v==undefined ? "" : ` ${v}`).join("")}`)
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
	tick() {
		this.elm.parentNode.setAttribute("style", `--move-amount: ${Math.max(0, player.x - 5)};`)
		super.tick()
	}
}
class Player extends SceneItem {
	constructor() {
		super(-3, 0)
		this.elm.classList.add("player")
		/** @type {number} */
		this.vy = 0
		/** @type {boolean} */
		this.onGround = false
		/** @type {number} */
		this.deathTime = 0
	}
	getRect() {
		return new Rect(this.x, this.y, 1, 1)
	}
	tick() {
		if (this.deathTime > 0) {
			if (! debugMode) this.deathTime -= 1
			if (this.deathTime == 0) {
				this.respawn()
			}
			return
		}
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
		super.tick()
	}
	finishTick() {
		if (this.deathTime > 0) return
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
		if (this.x > stageWidth) this.destroy()
		if (debugMode) RectDisplay.create(this)
	}
	cubeJump() {
		this.vy += 0.35
	}
	destroy() {
		this.deathTime = 40
		super.destroy()
		particles.push(new DeathParticleMain(this.x + 0.5, this.y + 0.5))
		for (var i = 0; i < 20; i++) {
			particles.push(new DeathParticleExtra(this.x + 0.5, this.y + 0.5))
		}
	}
	respawn() {
		document.querySelector("#scene").appendChild(this.elm)
		this.x = -3
		this.y = 0
		this.vy = 0
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
		this.extraStyles[2] = `bottom: calc(25% + calc(${rect.y} * var(--tile-size))); left: calc(calc(${rect.x} * var(--tile-size)) + calc(-1 * calc(var(--move-amount) * var(--tile-size)))); width: calc(${rect.w} * var(--tile-size)); height: calc(${rect.h} * var(--tile-size));`
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
		var r = item.getRect()
		if (item instanceof Player) color = "yellow"
		else r = r.rotate(item.rotation, item.x + 0.5, item.y + 0.5)
		if (item instanceof TileDeath) color = "red"
		particles.push(new RectDisplay(r, color))
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
		if (debugMode) RectDisplay.create(this)
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
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			var yIncrease = (thisRect.y + thisRect.h) - playerRect.y
			if (yIncrease < 0.5) {
				// Player is fine
				player.y += yIncrease
				player.onGround = true
			} else {
				if (debugMode) {
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
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Player dies!
			player.destroy()
			if (debugMode) {
				setTimeout(() => {
					particles.push(new RectDisplay(player.getRect(), "orange"))
				}, 100)
			}
		}
	}
}
class BasicBlock extends TileBlock {
	constructor(x, y, rotation) {
		super(x, y, "basic-block", rotation)
	}
}
class HalfBlock extends TileBlock {
	constructor(x, y, rotation) {
		super(x, y, "half-block", rotation)
	}
	getRect() {
		return super.getRect().relative(0, 0.5, 1, 0.5);
	}
}
class BasicSpike extends TileDeath {
	constructor(x, y, rotation) {
		super(x, y, "basic-spike", rotation)
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.8);
	}
}
class HalfSpike extends TileDeath {
	constructor(x, y, rotation) {
		super(x, y, "half-spike", rotation)
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
var stageWidth = 0

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
	"basic-block": BasicBlock,
	"basic-spike": BasicSpike,
	"half-block": HalfBlock,
	"half-spike": HalfSpike
}
/** @param {{ type: string, x: number, y: number, rotation: number }[]} o */
function importObjects(o) {
	for (var i = 0; i < o.length; i++) {
		var obj = o[i]
		/** @type {Tile} */
		var c = new blockTypes[obj.type](obj.x, obj.y, obj.rotation)
		tiles.push(c)
		stageWidth = Math.max(stageWidth, c.x + 5)
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
var debugMode = url_query.debug == "true"
importObjects(JSON.parse(atob(url_query.objects)))

function frame() {
	for (var i = 0; i < particles.length; i++) {
		particles[i].tick()
	}
	stage.tick()
	player.tick()
	if (player.deathTime == 0) {
		for (var i = 0; i < tiles.length; i++) {
			tiles[i].tick()
		}
	}
	player.finishTick()
}
async function frameLoop() {
	while (true) {
		frame()
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}
frameLoop()