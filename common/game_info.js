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
	tick(amount) {
		if (this == window.editing) {
			this.elm.setAttribute("style", `--x: ${this.x}; --y: ${this.y}; transform: rotate(${this.rotation}deg); box-shadow: 0px 7px 15px 5px orange; outline: 1px solid red;${this.extraStyles.map((v) => v==undefined ? "" : ` ${v}`).join("")}`)
		} else {
			this.elm.setAttribute("style", `--x: ${this.x}; --y: ${this.y}; transform: rotate(${this.rotation}deg);${this.extraStyles.map((v) => v==undefined ? "" : ` ${v}`).join("")}`)
		}
	}
	destroy() {
		this.elm.remove()
	}
}
class InterpolatedVariable {
	constructor(initialValue) {
		/** @type {number} */
		this.startValue = initialValue
		/** @type {number} */
		this.endValue = initialValue
		/** @type {number} */
		this.ticks = 0
		/** @type {number} */
		this.totalTicks = -1
	}
	tick(amount) {
		if (this.totalTicks == -1) return
		this.ticks += amount
		if (this.ticks >= this.totalTicks) {
			this.ticks = 0
			this.totalTicks = -1
			this.startValue = this.endValue
		}
	}
	interpolate(newValue, duration) {
		if (this.totalTicks != -1) {
			this.startValue = this.endValue
		}
		this.ticks = 0
		this.totalTicks = duration
		this.endValue = newValue
	}
	/** @returns {number} */
	get() {
		if (this.totalTicks == -1) return this.startValue
		return (this.ticks / this.totalTicks).map(0, 1, this.startValue, this.endValue)
	}
}
class InterpolatedColor {
	constructor(r, g, b) {
		/** @type {InterpolatedVariable} */
		this.r = new InterpolatedVariable(r)
		/** @type {InterpolatedVariable} */
		this.g = new InterpolatedVariable(g)
		/** @type {InterpolatedVariable} */
		this.b = new InterpolatedVariable(b)
	}
	tick(amount) {
		this.r.tick(amount)
		this.g.tick(amount)
		this.b.tick(amount)
	}
	interpolate(r, g, b, duration) {
		this.r.interpolate(r, duration)
		this.g.interpolate(g, duration)
		this.b.interpolate(b, duration)
	}
	/** @returns {number[]} */
	get() {
		return [
			this.r.get(),
			this.g.get(),
			this.b.get()
		]
	}
	getHex() {
		return "#" + this.get().map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
	}
}
class Stage extends SceneItem {
	constructor() {
		super(0, 0)
		this.elm.classList.remove("regularPos")
		this.elm.classList.add("stage")
		this.bgColor = new InterpolatedColor(...levelMeta.settings.colorbg)
		this.stageColor = new InterpolatedColor(...levelMeta.settings.colorstage)
	}
	tick(amount) {
		this.bgColor.tick(amount)
		this.stageColor.tick(amount)
		this.elm.parentNode.setAttribute("style", `--move-amount: ${Math.max(0, view.player.x - 5)}; --bg-color: ${this.bgColor.getHex()}; --stage-color: ${this.stageColor.getHex()};`)
		super.tick()
	}
	reset() {
		this.bgColor = new InterpolatedColor(...levelMeta.settings.colorbg)
		this.stageColor = new InterpolatedColor(...levelMeta.settings.colorstage)
		for (var i = 0; i < view.tiles.length; i++) {
			var t = view.tiles[i]
			if (t instanceof Trigger) {
				t.activated = false
			}
		}
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
		/** @type {null | () => void} */
		this.specialJump = null
		/** @type {number} */
		this.deathTime = 1
		/** @type {number} */
		this.gravity = 1
		/** @type {GameMode} */
		this.mode = new CubeMode(this);
	}
	getRect() {
		return this.mode.getRect()
	}
	tick(amount) {
		// console.log(1, this.x, this.y, this.vy)
		if (this.deathTime > 0) {
			if (this.deathTime == 1 || (! debugMode)) this.deathTime -= 1
			if (this.deathTime == 0) {
				this.respawn()
			}
			return
		}
		// Move forwards
		// console.log(2, this.x, this.y, this.vy)
		this.x += 0.1 * amount
		// Fall
		// console.log(3, this.x, this.y, this.vy)
		this.mode.gravity(amount)
		// console.log(4, this.x, this.y, this.vy)
		this.y += this.vy * amount
		// console.log(5, this.x, this.y, this.vy)
		this.onGround = false
		this.specialJump = null
		// Check for collision with stage
		if (this.y < 0) {
			this.y = 0
			this.onGround = true
		}
		this.mode.getMax()
		// Update styles
		this.extraStyles[0] = "background: url(../assets/game/Player" + this.mode.getFilename() + ".svg)"
		super.tick(amount)
		// console.log(0, this.x, this.y, this.vy)
		// throw new Error()
	}
	finishTick(amount) {
		if (this.deathTime > 0) return
		if (this.onGround) {
			this.vy = 0
		}
		this.mode.checkJump(amount)
		if (this.x > view.stageWidth) view.win()
		if (debugMode && Math.abs(this.vy) > 0.3) RectDisplay.create(this)
	}
	destroy() {
		this.deathTime = 40
		super.destroy()
		view.particles.push(new DeathParticleMain(this.x + 0.5, this.y + 0.5))
		for (var i = 0; i < 20; i++) {
			view.particles.push(new DeathParticleExtra(this.x + 0.5, this.y + 0.5))
		}
	}
	respawn() {
		document.querySelector("#scene").appendChild(this.elm)
		this.mode = new CubeMode(this);
		this.x = -3
		this.y = 0
		this.vy = 0
		this.gravity = 1
		view.stage.reset()
		this.setStartPos()
	}
	setStartPos() {
		for (var i = 0; i < view.tiles.length; i++) {
			var t = view.tiles[i]
			if (t instanceof StartPosBlock) {
				var rect = t.getRect()
				this.x = rect.x
				this.y = rect.y
			}
		}
	}
}
class GameMode {
	constructor(player) {
		/** @type {Player} */
		this.player = player
	}
	gravity(amount) {
		this.player.vy -= 0.028 * this.player.gravity * amount
	}
	checkJump(amount) {}
	getMax() {
		if (this.player.y > 40) {
			this.player.destroy()
		}
	}
	getRect() {
		return new Rect(this.player.x, this.player.y, 1, 1)
	}
	getFilename() {
		return "Cube";
	}
	hitCeiling(h) {
		view.player.destroy()
	}
}
class CubeMode extends GameMode {
	checkJump(amount) {
		if (this.player.onGround) {
			this.player.rotation = 0
			if (this.player.gravity < 0) {
				view.particles.push(new SlideParticle(this.player.x, this.player.y + 1))
			} else {
				view.particles.push(new SlideParticle(this.player.x, this.player.y))
			}
		} else {
			this.player.rotation += 5 * amount * this.player.gravity
		}
		if (view.isPressing) {
			if (this.player.specialJump != null) {
				this.player.specialJump()
			} else if (this.player.onGround) {
				this.player.vy = 0.34 * this.player.gravity
			}
		}
	}
}
class ShipMode extends GameMode {
	gravity(amount) {}
	checkJump(amount) {
		this.player.rotation = this.player.vy * -100
		view.particles.push(new SlideParticle(this.player.x + 0.05, this.player.y + 0.2))
		if (view.isPressing) {
			if (this.player.specialJump != null) {
				this.player.specialJump()
			} else {
				this.player.vy += 0.005 * this.player.gravity
			}
		} else {
			this.player.vy -= 0.005 * this.player.gravity
		}
	}
	getMax() {
		if (this.player.y > 14) {
			this.player.y = 14
			this.player.vy = 0
		}
	}
	getRect() {
		return super.getRect().relative(0, 0.1, 1, 0.8)
	}
	getFilename() {
		return "Ship";
	}
	hitCeiling(h) {
		this.player.y = h - 0.1
		this.player.vy = -0.01
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
	destroy() {
		super.destroy()
		view.particles.splice(view.particles.indexOf(this), 1)
	}
}
class SlideParticle extends Particle {
	constructor(x, y) {
		super(x, y)
		this.oy = y
		this.vx = Math.random() / -20
		this.vy = (Math.random() / 10) * view.player.gravity
		this.time = 0
		this.extraStyles[2] = `--size: 0.1;`
	}
	tick(amount) {
		this.time += amount
		this.vy -= 0.005 * amount * view.player.gravity
		this.x += this.vx * amount
		this.y += this.vy * amount
		if (view.player.gravity < 0) {
			if (this.y >= this.oy) {
				this.y = this.oy
				this.vy = 0
				this.time += 1
			}
		} else {
			if (this.y <= this.oy) {
				this.y = this.oy
				this.vy = 0
				this.time += 1
			}
		}
		this.extraStyles[1] = `opacity: ${this.time.map(0, 15, 1, 0)};`
		super.tick(amount)
		if (this.time >= 15) this.destroy()
	}
}
class DeathParticleMain extends Particle {
	constructor(x, y) {
		super(x, y)
		this.size = 1
	}
	tick(amount) {
		this.size += 0.2 * amount
		this.extraStyles[2] = `--size: ${this.size};`
		this.extraStyles[3] = `opacity: ${this.size.map(1, 5, 1, 0)};`
		super.tick(amount)
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
	tick(amount) {
		this.size += 0.2 * amount
		this.x += this.vx * amount
		this.y += this.vy * amount
		this.extraStyles[1] = `opacity: ${this.size.map(1, 5, 1, 0)};`
		super.tick(amount)
		if (this.size >= 5) this.destroy()
	}
}
class LevelCompleteSign extends Particle {
	constructor() {
		super(0, 0)
		this.imgSize = [676, 66]
		this.time = 0
		this.elm.innerHTML = `<img src="../assets/game/LevelComplete.png" style="width: 100%; height: 100%;">`
		this.hasButtons = false
	}
	tick(amount) {
		if (this.time < 100) this.time += amount
		else if (! this.hasButtons) {
			this.addButtons()
		}
		var sizem = Math.pow(this.time.map(0, 100, 0, 1), 0.2)
		this.realSize = [
			this.imgSize[0] * sizem,
			this.imgSize[1] * sizem
		]
		this.elm.setAttribute("style", `left: ${(window.innerWidth  / 2) - (this.realSize[0] / 2)}px; top: ${(window.innerHeight / 2) - (this.realSize[1] / 2)}px; width: ${this.realSize[0]}px; height: ${this.realSize[1]}px;`)
	}
	addButtons() {
		this.hasButtons = true
		var e = document.createElement("div")
		e.innerHTML = `<div onclick='view.restart()'><img src="../assets/ui/Restart.svg" class="finish-button"></div><div><a href="../home/index.html"><img src="../assets/ui/Home.svg" class="finish-button"></a></div>`
		view.stage.elm.appendChild(e)
		e.setAttribute("style", `opacity: 0; transition: opacity 0.7s linear;`)
		requestAnimationFrame(() => {
			e.setAttribute("style", `opacity: 1; transition: opacity 0.7s linear;`)
		})
	}
	destroy() {
		super.destroy()
		view.stage.elm.children[0].remove()
	}
}
class RectDisplay extends Particle {
	/** @param {Rect} rect */
	constructor(rect, color) {
		super(rect.x, rect.y)
		this.elm.classList.remove("particle")
		// this.elm.classList.add(`rect-${rect.x}-${rect.y}-${rect.w}-${rect.h}`)
		this.extraStyles[0] = `background: ${color};`
		this.extraStyles[2] = `bottom: calc(25% + calc(${rect.y} * var(--tile-size))); left: calc(calc(${rect.x} * var(--tile-size)) + calc(-1 * calc(var(--move-amount) * var(--tile-size)))); width: calc(${rect.w} * var(--tile-size)); height: calc(${rect.h} * var(--tile-size));`
		this.time = 0
	}
	tick(amount) {
		// this.time += 1
		this.extraStyles[1] = `opacity: ${this.time.map(0, 5, 1, 0)};`
		super.tick(amount)
		if (this.time >= 5) this.destroy()
	}
	/** @param {Tile | Player} item */
	static create(item) {
		var color = "lime"
		var r = item.getRect()
		if (r.hasInvalid()) return
		if (item instanceof Player) color = "transparent;outline: 1px solid yellow;"
		else r = r.rotate(item.rotation, item.x + 0.5, item.y + 0.5)
		if (item instanceof TileDeath) color = "red"
		if (item instanceof TileInvisible) color = "#0A0A"
		view.particles.push(new RectDisplay(r, color))
		if (item.elm.parentNode) item.elm.parentNode.appendChild(item.elm)
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
	hasInvalid() {
		if (this.x == NaN || this.x == undefined) return true
		if (this.y == NaN || this.y == undefined) return true
		if (this.w == NaN || this.w == undefined) return true
		if (this.h == NaN || this.h == undefined) return true
		return false
	}
}
class Tile extends SceneItem {
	constructor(x, y, type, rotation) {
		super(x, y)
		this.type_file = type
		this.extraStyles[0] = `background: url(../assets/tile/${type}.svg);`
		this.rotation = rotation
		if (debugMode) RectDisplay.create(this)
	}
	static load(type, info) {
		return new type(info.x, info.y, info.rotation)
	}
	static default(pos) {
		return {
			x: pos[0],
			y: pos[1],
			rotation: 0
		}
	}
	save() {
		return {
			x: this.x,
			y: this.y,
			rotation: this.rotation
		}
	}
	getEdit() {
		return [
			`<div><button onclick="editing.destroy(); view.tiles.splice(view.tiles.indexOf(editing), 1); deselect();">Remove Tile</button></div>`,
			`<div>Tile Rotation: <select oninput="editing.rotation = Number(this.value); editing.tick();">
	<option value="0">&nbsp;&uarr; 0</option>
	<option value="90">&rarr; 90</option>
	<option value="180">&nbsp;&darr; 180</option>
	<option value="270">&larr; 270</option>
</select></div>`,
			`<div>X: <input type="number" value="${this.x}" min="0" oninput="editing.x = Math.round(this.valueAsNumber); editing.tick();"></div>`,
			`<div>Y: <input type="number" value="${this.y}" min="0" oninput="editing.y = Math.round(this.valueAsNumber); editing.tick();"></div>`
		]
	}
	getRect() {
		return new Rect(this.x, this.y, 1, 1)
	}
	tick(amount) {
		if (viewType == "game") this.collide()
		super.tick(amount)
		// if (debugMode) RectDisplay.create(this)
	}
	collide() {}
}
class TileBlock extends Tile {
	collide() {
		var playerRect = view.player.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// if (thisRect.y - (playerRect.y + playerRect.h) > -0.1) return
			var yIncrease = (thisRect.y + thisRect.h) - playerRect.y
			if (view.player.gravity < 0) yIncrease = (playerRect.y + playerRect.h) - thisRect.y
			var playerDies = yIncrease >= 0.5
			if (! playerDies) {
				// Player is fine
				view.player.y += yIncrease * view.player.gravity
				view.player.onGround = true
			} else if (thisRect.y + 0.5 > playerRect.y + playerRect.h) {
				view.player.mode.hitCeiling(thisRect.y - playerRect.h)
			} else {
				if (debugMode) {
					setTimeout((thisRect, playerRect, yIncrease) => {
						view.particles.push(new RectDisplay(new Rect(thisRect.x, playerRect.y, thisRect.w, yIncrease), "pink"))
					}, 100, thisRect, playerRect, yIncrease)
				}
				view.player.destroy()
			}
		}
	}
}
class TileDeath extends Tile {
	collide() {
		var playerRect = view.player.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Player dies!
			view.player.destroy()
			if (debugMode) {
				setTimeout(() => {
					view.particles.push(new RectDisplay(view.player.getRect(), "orange"))
				}, 100)
			}
		}
	}
}
class TileInvisible extends Tile {
	constructor(x, y, type, rotation) {
		super(x, y, type, rotation)
		if (viewType == "game") this.elm.remove()
		if (debugMode) RectDisplay.create(this)
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
class JumpOrb extends Tile {
	constructor(x, y, rotation) {
		super(x, y, "jump-orb", rotation)
		this.timeout = 0
	}
	tick(amount) {
		if (this.timeout > 0) this.timeout -= amount
		super.tick(amount)
	}
	collide() {
		if (this.timeout > 0) return
		var playerRect = view.player.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Jumpy jumpy
			var target = this
			view.player.specialJump = () => {
				target.timeout = 10
				view.player.vy = 0.34 * view.player.gravity
			}
		}
	}
}
class GravityOrb extends Tile {
	constructor(x, y, rotation) {
		super(x, y, "gravity-orb", rotation)
		this.timeout = 0
	}
	tick(amount) {
		if (this.timeout > 0) this.timeout -= amount
		super.tick(amount)
	}
	collide() {
		if (this.timeout > 0) return
		var playerRect = view.player.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Jumpy jumpy
			var target = this
			view.player.specialJump = () => {
				target.timeout = 10
				view.player.gravity *= -1
				view.player.vy = view.player.gravity * -0.5
				view.isPressing = false
			}
		}
	}
}
class BlackOrb extends Tile {
	constructor(x, y, rotation) {
		super(x, y, "black-orb", rotation)
		this.timeout = 0
	}
	tick(amount) {
		if (this.timeout > 0) this.timeout -= amount
		super.tick(amount)
	}
	collide() {
		if (this.timeout > 0) return
		var playerRect = view.player.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Jumpy jumpy
			var target = this
			view.player.specialJump = () => {
				target.timeout = 10
				view.player.vy += view.player.gravity * -0.7
			}
		}
	}
}
class StartPosBlock extends TileInvisible {
	constructor(x, y) {
		super(x, y, "start-pos", 0)
	}
	static load(type, info) {
		return new type(info.x, info.y)
	}
	static default(pos) {
		return {
			x: pos[0],
			y: pos[1]
		}
	}
	save() {
		return {
			x: this.x,
			y: this.y
		}
	}
	getEdit() {
		return [
			`<div><button onclick="editing.destroy(); view.tiles.splice(view.tiles.indexOf(editing), 1); deselect();">Remove Tile</button></div>`,
			`<div>X: <input type="number" value="${this.x}" min="0" oninput="editing.x = Math.round(this.valueAsNumber); editing.tick();"></div>`,
			`<div>Y: <input type="number" value="${this.y}" min="0" oninput="editing.y = Math.round(this.valueAsNumber); editing.tick();"></div>`
		]
	}
}
class Trigger extends TileInvisible {
	constructor(x, y, type, needsTouch) {
		super(x, y, type, 0)
		/** @type {boolean} */
		this.needsTouch = needsTouch == true
		/** @type {boolean} */
		this.activated = false
	}
	getEdit() {
		return [
			...super.getEdit(),
			`<div>Needs touch: <input type="checkbox"${this.needsTouch ? " checked" : ""} oninput="editing.needsTouch = this.checked"></div>`
		]
	}
	hasCollision() {
		var playerRect = view.player.getRect()
		var thisRect = this.getRect()
		if (this.needsTouch) {
			return playerRect.colliderect(thisRect)
		} else {
			return playerRect.centerX() > thisRect.centerX()
		}
	}
	collide() {
		if (this.activated) return
		if (this.hasCollision()) {
			this.activated = true
			this.trigger()
		}
	}
	trigger() {}
}
class ColorTrigger extends Trigger {
	constructor(x, y, needsTouch, section, newColor, duration) {
		super(x, y, "color-trigger", needsTouch)
		/** @type {"stage" | "bg"} */
		this.section = section
		/** @type {number[]} */
		this.color = [
			Number(newColor[0]),
			Number(newColor[1]),
			Number(newColor[2])
		]
		/** @type {number} */
		this.duration = duration
		this.extraStyles[0] = this.extraStyles[0].substring(0, this.extraStyles[0].length - 1) + `, radial-gradient(circle, var(--trigger-color) 50%, transparent 50%);`
	}
	static default(pos) {
		return {
			x: pos[0],
			y: pos[1],
			needsTouch: false,
			section: "stage",
			color: [255, 0, 0],
			duration: 0
		}
	}
	static load(type, info) {
		return new type(info.x, info.y, info.needsTouch, info.section, info.color, info.duration)
	}
	save() {
		return {
			x: this.x,
			y: this.y,
			needsTouch: this.needsTouch,
			section: this.section,
			color: this.color,
			duration: this.duration
		}
	}
	getEdit() {
		return [
			...super.getEdit(),
			`<div>Section: <select oninput="editing.section = this.value">
	<option value="stage"${this.section=="stage" ? " selected" : ""}>Stage</option>
	<option value="bg"${this.section=="bg" ? " selected" : ""}>Background</option>
</select></div>`,
			`<div>Color: <input type="color" value="${getHexFromRGB(this.color)}" oninput="editing.color = getRGBFromHex(this.value)"></div>`,
			`<div>Duration (60ths of a second): <input type="number" value="${this.duration}" min="1" oninput="editing.duration = this.valueAsNumber"></div>`
		]
	}
	tick() {
		this.extraStyles[1] = `--trigger-color: rgb(${this.color.join(", ")});`
		super.tick()
	}
	trigger() {
		/** @type {InterpolatedColor} */
		var section = {
			"stage": view.stage.stageColor,
			"bg": view.stage.bgColor
		}[this.section]
		section.interpolate(...this.color, this.duration)
	}
}
class GravityPad extends Tile {
	constructor(x, y, rotation) {
		super(x, y, "gravity-pad", rotation)
		this.timeout = 0
	}
	getRect() {
		return super.getRect().relative(0, 0, 1, 0.2)
	}
	tick(amount) {
		this.timeout -= amount
		super.tick(amount)
	}
	collide() {
		if (this.timeout > 0) return
		var playerRect = view.player.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Jumpy jumpy
			if (this.rotation == 0) view.player.gravity = -1
			else if (this.rotation == 180) view.player.gravity = 1
			else view.player.gravity *= -1
			view.player.vy = view.player.gravity * -0.5
			this.timeout = 10
		}
	}
}
class Portal extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {string} type
	 * @param {number} displayheight
	 * @param {number} realheight
	 * @param {number} rotation
	 */
	constructor(x, y, type, displayheight, realheight, displaywidth, rotation) {
		super(x, y, "portal-" + type, rotation)
		this.displayheight = displayheight
		this.realheight = realheight
		this.extraStyles[1] = `--h: ${displayheight}; width: calc(${displaywidth} * var(--tile-size));`
		if (debugMode) RectDisplay.create(this)
	}
	getRect() {
		return super.getRect().relative(0, (this.realheight * -0.5) + 0.5, 1, this.realheight);
	}
	collide() {
		var playerRect = view.player.getRect()
		var thisRect = this.getRect()
		if (playerRect.colliderect(thisRect)) {
			this.activate()
		}
	}
	activate() {}
}
class GamemodePortal extends Portal {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {string} type
	 * @param {number} rotation
	 * @param {typeof GameMode} gamemode
	 */
	constructor(x, y, type, rotation, gamemode) {
		super(x, y, "gamemode-" + type, 3.2, 3, 1.4545, rotation)
		/** @type {typeof GameMode} */
		this.mode = gamemode
	}
	activate() {
		var newMode = new this.mode(view.player);
		view.player.mode = newMode;
	}
}
class CubePortal extends GamemodePortal {
	constructor(x, y, rotation) {
		super(x, y, "cube", rotation, CubeMode)
	}
}
class ShipPortal extends GamemodePortal {
	constructor(x, y, rotation) {
		super(x, y, "ship", rotation, ShipMode)
	}
}

class View {
	constructor() {
		this.stage = new Stage()
		/** @type {Tile[]} */
		this.tiles = []
	}
	/** @param {{ type: string, x: number, y: number, rotation: number }[]} o */
	importObjects(o) {
		for (var i = 0; i < o.length; i++) {
			var obj = o[i]
			/** @type {Tile} */
			var c = blockTypes[obj.type].load(blockTypes[obj.type], obj.data)
			this.tiles.push(c)
			this.stageWidth = Math.max(this.stageWidth, c.x + 5)
			if (viewType == "editor") c.tick()
		}
	}
	loadLevel() {
		if (levelName == undefined) {
			levelName = "new_level.json"
			return
		}
		var x = new XMLHttpRequest()
		x.open("GET", "../levels/" + levelName)
		x.addEventListener("loadend", () => {
			var level = JSON.parse(x.responseText)
			view.importObjects(level.objects)
			levelMeta.name = level.name
			levelMeta.description = level.description
			levelMeta.settings.colorbg = level.settings.colorbg
			levelMeta.settings.colorstage = level.settings.colorstage
			levelMeta.settings.gamemode = level.settings.gamemode
			if (view instanceof GameView) view.player.mode = new ({
				"Cube": CubeMode,
				"Ship": ShipMode
			}[level.settings.gamemode])(view.player)
			view.stage.reset()
		})
		x.send()
	}
}
class GameView extends View {
	constructor() {
		super()
		this.player = new Player()
		/** @type {Particle[]} */
		this.particles = []
		this.isPressing = false
		this.stageWidth = 0
		this.hasWon = false
		// Add event listeners
		document.addEventListener("keydown", (e) => {
			if (e.key == " ") view.isPressing = true
		})
		document.addEventListener("keyup", (e) => {
			if (e.key == " ") view.isPressing = false
		})
		document.addEventListener("mousedown", (e) => {
			view.isPressing = true
		})
		document.addEventListener("mouseup", (e) => {
			view.isPressing = false
		})
		document.addEventListener("touchstart", (e) => {
			view.isPressing = true
		})
		document.addEventListener("touchend", (e) => {
			view.isPressing = false
		})
	}
	win() {
		this.hasWon = true
		this.player.elm.remove()
		this.particles.push(new LevelCompleteSign())
		this.sendVerification()
	}
	restart() {
		this.hasWon = false
		this.player.deathTime = 1
		for (; this.particles.length > 0; ) {
			this.particles[0].destroy()
		}
	}
	sendVerification() {
		var x = new XMLHttpRequest()
		x.open("POST", "/verify")
		x.send(JSON.stringify({
			level: levelName,
			completion: [true]
		}))
	}
}

var blockTypes = {
	"basic-block": BasicBlock,
	"basic-spike": BasicSpike,
	"half-block": HalfBlock,
	"half-spike": HalfSpike,
	"jump-orb": JumpOrb,
	"color-trigger": ColorTrigger,
	"start-pos": StartPosBlock,
	"gravity-orb": GravityOrb,
	"gravity-pad": GravityPad,
	"black-orb": BlackOrb,
	"portal-gamemode-cube": CubePortal,
	"portal-gamemode-ship": ShipPortal
}
var levelName = url_query.level
var levelMeta = {
	"name": "Untitled Level",
	"description": "",
	"settings": {
		"colorbg": [0, 125, 255],
		"colorstage": [0, 125, 255],
		"gamemode": "Cube"
	}
}
// var level = {
// 	"name": "Unnamed",
// 	"description": "",
// 	"settings": {
// 		"colorbg": [0, 125, 255],
// 		"colorstage": [0, 125, 255],
// 		"gamemode": "Cube"
// 	},
// 	"objects": [],
// 	"verified": [false],
// 	"deleted": false
// }
var debugMode = url_query.debug == "true"
/** @type {GameView} */
var view = new ({
	"game": GameView,
	"editor": View
}[viewType])();
view.loadLevel()
// view.tiles.push(new Portal(5, 0, "portal-gamemode-cube", 3.2, 3, 0))
