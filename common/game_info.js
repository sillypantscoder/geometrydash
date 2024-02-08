if (window.viewType == undefined) {
	/** @type {"game" | "editor"} */
	var viewType = "game"
}

/**
 * @param {number} n
 * @param {number} in_min
 * @param {number} in_max
 * @param {number} out_min
 * @param {number} out_max
 */
function map(n, in_min, in_max, out_min, out_max) {
	return (n - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
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
	/**
	 * @param {number} _amount
	 */
	tick(_amount) {
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
	/**
	 * @param {number} initialValue
	 */
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
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		if (this.totalTicks == -1) return
		this.ticks += amount
		if (this.ticks >= this.totalTicks) {
			this.ticks = 0
			this.totalTicks = -1
			this.startValue = this.endValue
		}
	}
	/**
	 * @param {number} newValue
	 * @param {number} duration
	 */
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
		return map(this.ticks / this.totalTicks, 0, 1, this.startValue, this.endValue)
	}
}
class InterpolatedColor {
	/**
	 * @param {number} r
	 * @param {number} g
	 * @param {number} b
	 */
	constructor(r, g, b) {
		/** @type {InterpolatedVariable} */
		this.r = new InterpolatedVariable(r)
		/** @type {InterpolatedVariable} */
		this.g = new InterpolatedVariable(g)
		/** @type {InterpolatedVariable} */
		this.b = new InterpolatedVariable(b)
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.r.tick(amount)
		this.g.tick(amount)
		this.b.tick(amount)
	}
	/**
	 * @param {number} r
	 * @param {number} g
	 * @param {number} b
	 * @param {number} duration
	 */
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
	/**
	 * @param {number[]} values
	 */
	static fromRGB(values) {
		return new InterpolatedColor(values[0], values[1], values[2])
	}
}
class Stage extends SceneItem {
	constructor() {
		super(0, 0)
		this.elm.classList.remove("regularPos")
		this.elm.classList.add("stage")
		this.bgColor = InterpolatedColor.fromRGB(levelMeta.settings.colorbg)
		this.stageColor = InterpolatedColor.fromRGB(levelMeta.settings.colorstage)
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.bgColor.tick(amount)
		this.stageColor.tick(amount)
		// @ts-ignore
		this.elm.parentNode.setAttribute("style", `--move-amount: ${Math.max(0, ...view.players.map((v) => v.x - 15))}; --bg-color: ${this.bgColor.getHex()}; --stage-color: ${this.stageColor.getHex()};`)
		super.tick(amount)
	}
	reset() {
		this.bgColor = InterpolatedColor.fromRGB(levelMeta.settings.colorbg)
		this.stageColor = InterpolatedColor.fromRGB(levelMeta.settings.colorstage)
		for (var i = 0; i < view.tiles.length; i++) {
			var t = view.tiles[i]
			if (t instanceof Trigger) {
				t.activated = false
			}
			if (t instanceof Coin) {
				t.activated = 0
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
		/** @type {null | (() => void)} */
		this.specialJump = null
		/** @type {number} */
		this.gravity = 1
		/** @type {GameMode} */
		this.mode = new CubeMode(this);
		/** @type {boolean} */
		this.isPressing = false
		this.setStartMode()
	}
	/** @param {Player} other */
	sameAs(other) {
		if (Math.abs(this.y - other.y) > this.mode.getPosThreshold()) return false;
		if (Math.abs(this.vy - other.vy) > this.mode.getVThreshold()) return false;
		// if (this.y != other.y) return false;
		// if (this.vy != other.vy) return false;
		if (this.gravity != other.gravity) return false;
		if (! this.mode.sameAs(other.mode)) return false;
		if (this.isPressing != other.isPressing) return false;
		return true;
	}
	copy() {
		var o = new Player()
		o.x = this.x
		o.y = this.y
		o.rotation = this.rotation
		o.vy = this.vy
		o.onGround = this.onGround
		o.gravity = this.gravity
		o.mode = this.mode.copy(o)
		o.isPressing = this.isPressing
		return o
	}
	split() {
		var a = this.copy()
		a.isPressing = false
		var b = this.copy()
		b.isPressing = true
		return [a, b]
	}
	getRect() {
		return this.mode.getRect()
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		// Move forwards
		this.x += 0.1 * amount
		// Fall
		this.mode.gravity(amount)
		this.y += this.vy * amount
		this.onGround = false
		this.specialJump = null
		// Check for collision with stage
		if (this.y < 0) {
			this.y = 0
			this.onGround = true
		}
		this.mode.getMax()
		// Update styles
		this.extraStyles[0] = "background: url(../assets/game/player/" + getLocationFromObject("gamemode", this.mode) + ".svg);"
		this.extraStyles[1] = `transform: rotate(${this.rotation}deg) scaleY(${this.gravity});`
		super.tick(amount)
	}
	/**
	 * @param {number} amount
	 */
	finishTick(amount) {
		if (this.x > view.stageWidth) view.win()
		if (this.onGround) {
			if (this.gravity < 0) {
				if (this.vy > 0) this.vy = 0
			} else {
				if (this.vy < 0) this.vy = 0
			}
		}
		this.mode.checkJump(amount, this.isPressing)
	}
	destroy(particles) {
		view.players.splice(view.players.indexOf(this), 1)
		super.destroy()
		if (particles) {
			view.particles.push(new DeathParticleSmall(this.x + 0.5, this.y + 0.5))
			// view.particles.push(new DeathParticleMain(this.x + 0.5, this.y + 0.5))
			// for (var i = 0; i < 20; i++) {
			// 	view.particles.push(new DeathParticleExtra(this.x + 0.5, this.y + 0.5))
			// }
		}
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
	setStartMode() {
		var c = getObjectFromLocation("gamemode", [levelMeta.settings.gamemode])
		this.mode = new c(this)
	}
}
class GameMode {
	/**
	 * @param {Player} player
	 */
	constructor(player) {
		/** @type {Player} */
		this.player = player
	}
	/**
	 * @param {GameMode} other
	 */
	sameAs(other) {
		return false;
	}
	copy(player) {
		return new GameMode(player)
	}
	getPosThreshold() {
		return 0.03
	}
	getVThreshold() {
		return 0.03
	}
	/**
	 * @param {number} amount
	 */
	gravity(amount) {
		this.player.vy -= 0.028 * this.player.gravity * amount
	}
	/**
	 * @param {number} _amount
	 * @param {boolean} isPressing
	 */
	checkJump(_amount, isPressing) {}
	getMax() {
		if (this.player.y > 40) {
			this.player.destroy(true)
		}
	}
	getRect() {
		return new Rect(this.player.x, this.player.y, 1, 1)
	}
	/**
	 * @param {number} _h The height of the ceiling
	 */
	hitCeiling(_h) {
		this.player.destroy(true)
	}
}
class CubeMode extends GameMode {
	/**
	 * @param {GameMode} other
	 */
	sameAs(other) {
		return other instanceof CubeMode;
	}
	copy(player) {
		return new CubeMode(player)
	}
	/**
	 * @param {number} amount
	 * @param {boolean} isPressing
	 */
	checkJump(amount, isPressing) {
		if (this.player.onGround) {
			this.player.rotation = 0
			if (this.player.gravity < 0) {
				view.particles.push(new SlideParticle(this.player.x, this.player.y + 1, this.player))
			} else {
				view.particles.push(new SlideParticle(this.player.x, this.player.y, this.player))
			}
		} else {
			this.player.rotation += 5 * amount * this.player.gravity
		}
		if (isPressing) {
			if (this.player.specialJump != null) {
				this.player.specialJump()
			} else if (this.player.onGround) {
				this.player.vy = 0.34 * this.player.gravity
			}
		}
	}
}
class ShipMode extends GameMode {
	/**
	 * @param {GameMode} other
	 */
	sameAs(other) {
		return other instanceof ShipMode;
	}
	copy(player) {
		return new ShipMode(player)
	}
	getPosThreshold() {
		return 0.85
	}
	getVThreshold() {
		return 0.015
	}
	/**
	 * @param {number} _amount
	 */
	gravity(_amount) {}
	/**
	 * @param {number} _amount
	 * @param {boolean} isPressing
	 */
	checkJump(_amount, isPressing) {
		this.player.rotation = this.player.vy * -100
		if (isPressing) {
			if (this.player.specialJump != null) {
				this.player.specialJump()
			} else {
				this.player.vy += 0.005 * this.player.gravity
			}
		} else {
			this.player.vy -= 0.005 * this.player.gravity
		}
	}
	getRect() {
		return super.getRect().relative(0, 0.1, 1, 0.8)
	}
	/**
	 * @param {number} h
	 */
	hitCeiling(h) {
		this.player.y = h - 0.1
		this.player.vy = -0.01
	}
}
class BallMode extends GameMode {
	/**
	 * @param {GameMode} other
	 */
	sameAs(other) {
		return other instanceof BallMode;
	}
	copy(player) {
		return new BallMode(player)
	}
	/**
	 * @param {number} amount
	 * @param {boolean} isPressing
	 */
	checkJump(amount, isPressing) {
		this.player.rotation += 10 * amount * this.player.gravity
		if (this.player.onGround || this.player.y == 14) {
			if (this.player.gravity < 0) {
				view.particles.push(new SlideParticle(this.player.x + 0.3, this.player.y + 1, this.player))
			} else {
				view.particles.push(new SlideParticle(this.player.x + 0.3, this.player.y, this.player))
			}
		}
		if (isPressing) {
			if (this.player.specialJump != null) {
				this.player.specialJump()
			} else if (this.player.onGround) {
				this.player.gravity *= -1
			}
		}
	}
}
class WaveMode extends GameMode {
	/**
	 * @param {GameMode} other
	 */
	sameAs(other) {
		return other instanceof WaveMode;
	}
	copy(player) {
		return new WaveMode(player)
	}
	getPosThreshold() {
		return 0.1
	}
	getVThreshold() {
		return 0.03
	}
	/**
	 * @param {number} _amount
	 */
	gravity(_amount) {}
	/**
	 * @param {number} _amount
	 * @param {boolean} isPressing
	 */
	checkJump(_amount, isPressing) {
		this.player.rotation = this.player.vy * -450
		if (isPressing) {
			this.player.vy = 0.1 * this.player.gravity
		} else {
			this.player.vy = -0.1 * this.player.gravity
		}
	}
	getRect() {
		return super.getRect().relative(0, 0.1, 1, 0.8)
	}
}
class Particle extends SceneItem {
	/**
	 * @param {number} x
	 * @param {number} y
	 */
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
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {Player} player
	 */
	constructor(x, y, player) {
		super(x, y)
		this.player = player
		this.oy = y
		this.vx = Math.random() / -20
		this.vy = (Math.random() / 10) * this.player.gravity
		this.time = 0
		this.extraStyles[2] = `--size: 0.1;`
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.time += amount
		this.vy -= 0.005 * amount * this.player.gravity
		this.x += this.vx * amount
		this.y += this.vy * amount
		if (this.player.gravity < 0) {
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
		this.extraStyles[1] = `opacity: ${map(this.time, 0, 15, 1, 0)};`
		super.tick(amount)
		if (this.time >= 15) this.destroy()
	}
}
class WaveParticle extends Particle {
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(x, y) {
		super(x, y)
		this.time = 0
		this.extraStyles[2] = `--size: 0.3; border-radius: 50%;`
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.time += amount
		this.extraStyles[1] = `opacity: ${map(this.time, 0, 100, 1, 0)};`
		super.tick(amount)
		if (this.time >= 100) this.destroy()
	}
}
class DeathParticleSmall extends Particle {
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(x, y) {
		super(x, y)
		this.size = 1
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.size += 0.5 * amount
		this.extraStyles[0] = `background: radial-gradient(circle, #0F5F 0%, #0F53 100%);`
		this.extraStyles[2] = `--size: ${this.size};`
		this.extraStyles[3] = `opacity: ${map(this.size, 1, 5, 0.25, 0)};`
		super.tick(amount)
		if (this.size >= 5) this.destroy()
	}
}
class DeathParticleMain extends Particle {
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(x, y) {
		super(x, y)
		this.size = 1
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.size += 0.2 * amount
		this.extraStyles[2] = `--size: ${this.size};`
		this.extraStyles[3] = `opacity: ${map(this.size, 1, 5, 1, 0)};`
		super.tick(amount)
		if (this.size >= 5) this.destroy()
	}
}
class DeathParticleExtra extends Particle {
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(x, y) {
		super(x, y)
		this.vx = (Math.random() - 0.5) / 3
		this.vy = (Math.random() - 0.5) / 3
		this.size = 1
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.size += 0.2 * amount
		this.x += this.vx * amount
		this.y += this.vy * amount
		this.extraStyles[1] = `opacity: ${map(this.size, 1, 5, 1, 0)};`
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
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		if (this.time < 100) this.time += amount
		else if (! this.hasButtons) {
			this.addButtons()
		}
		var sizem = Math.pow(map(this.time, 0, 100, 0, 1), 0.2)
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
class ProgressBar extends SceneItem {
	constructor() {
		super(0, 0)
		this.elm.classList.add("progress-bar")
		document.querySelector("#scene").insertAdjacentElement("afterend", this.elm)
		this.elm.innerHTML = `<div></div><div id="log"></div><div></div>`
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		var c = view.getCompletion()
		this.elm.children[0].innerText = `Attempt ${view.attempt}`
		this.elm.children[2].setAttribute("style", `background: linear-gradient(90deg, #AFA ${c}%, #AAF ${c}%, #AAF ${levelMeta.completion.percentage}%, white ${levelMeta.completion.percentage}%);`)
		this.elm.children[2].innerText = `${c}% complete`
	}
	destroy() {
		view.particles.splice(view.particles.indexOf(this), 1)
		super.destroy()
	}
}
class RectDisplay extends Particle {
	/**
	 * @param {Rect} rect
	 * @param {string} color
	 */
	constructor(rect, color) {
		super(rect.x, rect.y)
		this.elm.classList.remove("particle")
		// this.elm.classList.add(`rect-${rect.x}-${rect.y}-${rect.w}-${rect.h}`)
		this.extraStyles[0] = `background: ${color};`
		this.extraStyles[2] = `bottom: calc(25% + calc(${rect.y} * var(--tile-size))); left: calc(calc(${rect.x} * var(--tile-size)) + calc(-1 * calc(var(--move-amount) * var(--tile-size)))); width: calc(${rect.w} * var(--tile-size)); height: calc(${rect.h} * var(--tile-size));`
		this.time = 0
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		// this.time += 1
		this.extraStyles[1] = `opacity: ${map(this.time, 0, 5, 1, 0)};`
		super.tick(amount)
		if (this.time >= 5) this.destroy()
	}
	/** @param {Tile | Player} item */
	static create(item) {
		var color = "lime"
		var r = item.getRect()
		if (r.hasInvalid()) return
		if (item instanceof Player) return//color = "transparent;outline: 1px solid yellow;"
		else r = r.rotate(item.rotation, item.x + 0.5, item.y + 0.5)
		if (item instanceof TileDeath) color = "red"
		view.particles.push(new RectDisplay(r, color))
		if (item.elm.parentNode) item.elm.parentNode.appendChild(item.elm)
	}
}
class Rect {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 */
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
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	move(x, y) {
		return new Rect(this.x + x, this.y + y, this.w, this.h)
	}
	centerY() {
		return this.y + (this.h / 2)
	}
	centerX() {
		return this.x + (this.w / 2)
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 */
	relative(x, y, w, h) {
		return new Rect(
			this.x + (this.w * x),
			this.y + (this.h * y),
			this.w * w,
			this.h * h
		)
	}
	/**
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 */
	static fromPoints(x1, y1, x2, y2) {
		return new Rect(
			Math.min(x1, x2),
			Math.min(y1, y2),
			Math.abs(x1 - x2),
			Math.abs(y1 - y2)
		)
	}
	/**
	 * @param {any} amount
	 * @param {number} centerX
	 * @param {number} centerY
	 */
	rotate(amount, centerX, centerY) {
		/**
		 * @param {number} cx
		 * @param {number} cy
		 * @param {number} x
		 * @param {number} y
		 * @param {number} angle
		 */
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
		if (Number.isNaN(this.x) || this.x == undefined) return true
		if (Number.isNaN(this.y) || this.y == undefined) return true
		if (Number.isNaN(this.w) || this.w == undefined) return true
		if (Number.isNaN(this.h) || this.h == undefined) return true
		return false
	}
}
class Tile extends SceneItem {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} dw
	 * @param {number} dh
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, dw, dh, rotation, groups) {
		super(x, y)
		this.display_size = [dw, dh]
		this.extraStyles[0] = `background: url(../assets/tile/${getLocationFromObject("tile", this).join("/")}.svg);`
		this.extraStyles[1] = `--dw: ${dw}; --dh: ${dh};`
		this.rotation = rotation
		this.groups = groups
		// this.enabled = false
		if (debugMode) RectDisplay.create(this)
	}
	/**
	 * @param {typeof Object} type
	 * @param {object} info
	 */
	static load(type, info) {
		// @ts-ignore
		return new type(info.x, info.y, info.rotation, info.groups)
	}
	/**
	 * @param {number[]} pos
	 * @returns {object}
	 */
	static default(pos) {
		return {
			x: pos[0],
			y: pos[1],
			rotation: 0,
			/** @type {string[]} */
			groups: []
		}
	}
	/**
	 * @returns {object}
	 */
	save() {
		return {
			x: this.x,
			y: this.y,
			rotation: this.rotation,
			groups: this.groups
		}
	}
	getEdit() {
		return [
			`<div><button onclick="editing.destroy(); view.tiles.splice(view.tiles.indexOf(editing), 1); deselect();">Remove Tile</button></div>`,
			`<div>Tile Rotation: <select oninput="editing.rotation = Number(this.value); editing.tick();">
	<option value="0"${this.rotation==0 ? " selected" : ""}>&nbsp;&uarr; 0</option>
	<option value="90"${this.rotation==90 ? " selected" : ""}>&rarr; 90</option>
	<option value="180"${this.rotation==180 ? " selected" : ""}>&nbsp;&darr; 180</option>
	<option value="270"${this.rotation==270 ? " selected" : ""}>&larr; 270</option>
</select></div>`,
			`<div>X: <input type="number" value="${this.x}" min="0" oninput="editing.x = this.valueAsNumber; editing.tick();"></div>`,
			`<div>Y: <input type="number" value="${this.y}" min="0" oninput="editing.y = this.valueAsNumber; editing.tick();"></div>`
		]
	}
	getRect() {
		return new Rect(this.x, this.y, 1, 1)
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		if (view.players) view.players.forEach((v) => this.collide(v))
		super.tick(amount)
	}
	/** @param {Player} target */
	collide(target) {}
}
class TileBlock extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, 1, 1, rotation, groups)
	}
	/**
	 * @param {Player} target
	 */
	collide(target) {
		var playerRect = target.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Wave shortcut:
			if (playerRect.mode instanceof WaveMode) {
				target.destroy(true)
				return
			}
			// if (thisRect.y - (playerRect.y + playerRect.h) > -0.1) return
			var yIncrease = (thisRect.y + thisRect.h) - playerRect.y
			if (target.gravity < 0) yIncrease = (playerRect.y + playerRect.h) - thisRect.y
			var playerDies = yIncrease >= 0.5
			if (! playerDies) {
				// Player is fine
				target.y += yIncrease * target.gravity
				target.onGround = true
				// this.enabled = true
			} else if (thisRect.y + 0.5 > playerRect.y + playerRect.h) {
				target.mode.hitCeiling(thisRect.y - playerRect.h)
				// this.enabled = true
			} else {
				if (debugMode) {
					setTimeout((/** @type {Rect} */ thisRect, /** @type {Rect} */ playerRect, /** @type {number} */ yIncrease) => {
						view.particles.push(new RectDisplay(new Rect(thisRect.x, playerRect.y, thisRect.w, yIncrease), "pink"))
					}, 100, thisRect, playerRect, yIncrease)
				}
				target.destroy(true)
				// this.enabled = true
			}
		}
	}
}
class TileDeath extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, 1, 1, rotation, groups)
	}
	/**
	 * @param {Player} target
	 */
	collide(target) {
		var playerRect = target.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Player dies!
			target.destroy(true)
			if (debugMode) {
				setTimeout(() => {
					view.particles.push(new RectDisplay(target.getRect(), "orange"))
				}, 100)
			}
			// this.enabled = true
		}
	}
}
class BasicBlock extends TileBlock {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
}
class HalfBlock extends TileBlock {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
	getRect() {
		return super.getRect().relative(0, 0.5, 1, 0.5);
	}
}
class BasicSpike extends TileDeath {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.8);
	}
}
class HalfSpike extends TileDeath {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.4);
	}
}
class Orb extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, 1, 1, rotation, groups)
		/** @type {Player[]} */
		this.activated = []
	}
	/**
	 * @param {Player} target
	 */
	collide(target) {
		if (this.activated.includes(target)) return
		var playerRect = target.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			this.enabled = true
			// Jumpy jumpy
			var orbT = this
			target.specialJump = () => {
				orbT.activated.push(target)
				orbT.activate(target)
			}
		}
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {}
}
class JumpOrb extends Orb {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {
		target.vy = 0.34 * target.gravity
	}
}
class GravityOrb extends Orb {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {
		target.gravity *= -1
		target.vy = target.gravity * -0.5
	}
}
class BlackOrb extends Orb {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {
		target.vy += target.gravity * -0.7
	}
}
class StartPosBlock extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(x, y) {
		super(x, y, 1, 1, 0, [])
		if (viewType == "game") this.elm.remove()
	}
	/**
	 * @param {typeof Object} type
	 * @param {object} info
	 */
	static load(type, info) {
		// @ts-ignore
		return new type(info.x, info.y)
	}
	/**
	 * @param {number[]} pos
	 */
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
class Coin extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, 1, 1, rotation, groups)
		/** @type {number} */
		this.activated = 0
		/** @type {boolean} */
		this.alreadygot = false
	}
	/**
	 * @param {Player} target
	 */
	collide(target) {
		if (this.activated > 0) {
			return
		}
		var playerRect = target.getRect()
		var thisRect = this.getRect()
		if (playerRect.colliderect(thisRect)) {
			this.activated = 1
			this.trigger()
		}
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		if (this.alreadygot) this.extraStyles[0] = `background: url(../assets/tile/special/coin-alreadygot.svg);`
		this.extraStyles[1] = `--dw: var(--tsize); --dh: var(--tsize);`
		this.extraStyles[2] = `--tsize: ${Math.sqrt(Math.sqrt(this.activated + 1))};`
		this.extraStyles[3] = `opacity: ${map(this.activated, 0, 100, 1, 0)};`
		super.tick(amount)
		if (this.activated > 0) {
			if (this.activated < 100) {
				this.activated += amount
			}
		}
	}
	trigger() {}
}
class Trigger extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {boolean} needsTouch
	 * @param {string[]} groups
	 */
	constructor(x, y, needsTouch, groups) {
		super(x, y, 1, 1, 0, groups)
		/** @type {boolean} */
		this.needsTouch = needsTouch == true
		/** @type {boolean} */
		this.activated = false
		if (viewType == "game") this.elm.remove()
	}
	getEdit() {
		return [
			...super.getEdit(),
			`<div>Needs touch: <input type="checkbox"${this.needsTouch ? " checked" : ""} oninput="editing.needsTouch = this.checked"></div>`
		]
	}
	/**
	 * @param {Player} target
	 */
	hasCollision(target) {
		var playerRect = target.getRect()
		var thisRect = this.getRect()
		if (this.needsTouch) {
			return playerRect.colliderect(thisRect)
		} else {
			return playerRect.centerX() > thisRect.centerX()
		}
	}
	/**
	 * @param {Player} target
	 */
	collide(target) {
		if (this.activated) return
		if (this.hasCollision(target)) {
			this.activated = true
			this.trigger()
		}
	}
	trigger() {}
}
class ColorTrigger extends Trigger {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {boolean} needsTouch
	 * @param {"stage" | "bg"} section
	 * @param {number[]} newColor
	 * @param {number} duration
	 * @param {string[]} groups
	 */
	constructor(x, y, needsTouch, section, newColor, duration, groups) {
		super(x, y, needsTouch, groups)
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
	/**
	 * @param {any[]} pos
	 */
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
	/**
	 * @param {typeof Object} type
	 * @param {object} info
	 */
	static load(type, info) {
		// @ts-ignore
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
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.extraStyles[2] = `--trigger-color: rgb(${this.color.join(", ")});`
		super.tick(amount)
	}
	trigger() {
		/** @type {InterpolatedColor} */
		var section = {
			"stage": view.stage.stageColor,
			"bg": view.stage.bgColor
		}[this.section]
		section.interpolate(this.color[0], this.color[1], this.color[2], this.duration)
	}
}
class Pad extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, 1, 1, rotation, groups)
		/** @type {Player[]} */
		this.activated = []
	}
	getRect() {
		return super.getRect().relative(0, 0, 1, 0.2)
	}
	/**
	 * @param {Player} target
	 */
	collide(target) {
		if (this.activated.includes(target)) return
		var playerRect = target.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			this.enabled = true
			// Jumpy jumpy
			this.activate(target)
			this.activated.push(target)
		}
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {}
}
class JumpPad extends Pad {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {
		target.vy = 0.34 * target.gravity
	}
}
class SmallJumpPad extends Pad {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {
		target.vy = 0.22 * target.gravity
	}
}
class GravityPad extends Pad {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, groups)
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {
		if (this.rotation == 0) target.gravity = -1
		else if (this.rotation == 180) target.gravity = 1
		else target.gravity *= -1
		target.vy = target.gravity * -0.5
	}
}
class Portal extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} realheight
	 * @param {number} rotation
	 * @param {number} dw
	 * @param {number} dh
	 * @param {string[]} groups
	 */
	constructor(x, y, dw, dh, realheight, rotation, groups) {
		super(x, y, dw, dh, rotation, groups)
		this.realheight = realheight
		if (debugMode) RectDisplay.create(this)
	}
	getRect() {
		return super.getRect().relative(0, (this.realheight * -0.5) + 0.5, 1, this.realheight);
	}
	/**
	 * @param {Player} target
	 */
	collide(target) {
		var playerRect = target.getRect()
		var thisRect = this.getRect()
		if (playerRect.colliderect(thisRect)) {
			this.enabled = true
			this.activate(target)
		}
	}
	activate(target) {}
}
class GravityPortal extends Portal {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {number} gravity
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, gravity, groups) {
		super(x, y, 1, 2.57, 3, rotation, groups)
		this.gravity = gravity
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {
		target.gravity = this.gravity;
	}
}
class GravityPortalDown extends GravityPortal {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, 1, groups)
	}
}
class GravityPortalUp extends GravityPortal {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, -1, groups)
	}
}
class GamemodePortal extends Portal {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {typeof GameMode} gamemode
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, gamemode, groups) {
		super(x, y, 1.4545, 3.2, 3, rotation, groups)
		/** @type {typeof GameMode} */
		this.mode = gamemode
	}
	/**
	 * @param {Player} target
	 */
	activate(target) {
		var newMode = new this.mode(target);
		target.mode = newMode;
	}
}
class CubePortal extends GamemodePortal {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, CubeMode, groups)
	}
}
class ShipPortal extends GamemodePortal {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, ShipMode, groups)
	}
}
class BallPortal extends GamemodePortal {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, BallMode, groups)
	}
}
class WavePortal extends GamemodePortal {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(x, y, rotation, groups) {
		super(x, y, rotation, WaveMode, groups)
	}
}

class View {
	constructor() {
		this.stage = new Stage()
		/** @type {Tile[]} */
		this.tiles = []
	}
	/** @param {{ type: string, data: object }[]} o */
	importObjects(o) {
		var coin_no = 0
		for (var i = 0; i < o.length; i++) {
			var obj = o[i]
			var type = getObjectFromLocation("tile", obj.type.split("."))
			/** @type {Tile} */
			var c = type.load(type, obj.data)
			this.tiles.push(c)
			this.stageWidth = Math.max(this.stageWidth, c.x + 5)
			if (viewType == "editor") c.tick(1)
			else if (c instanceof Coin) {
				var has_coin = levelMeta.completion.coins[coin_no]
				coin_no += 1
				if (has_coin) {
					c.alreadygot = true
				}
			}
		}
	}
	loadLevel() {
		if (levelName == undefined) {
			levelName = `new_level${Math.floor(Math.random() * 1000000)}.json`
			return
		}
		var x = new XMLHttpRequest()
		x.open("GET", "../levels/" + levelName)
		x.addEventListener("loadend", () => {
			var level = JSON.parse(x.responseText)
			levelMeta.completion = level.completion
			view.importObjects(level.objects)
			levelMeta.name = level.name
			levelMeta.description = level.description
			levelMeta.settings.colorbg = level.settings.colorbg
			levelMeta.settings.colorstage = level.settings.colorstage
			levelMeta.settings.gamemode = level.settings.gamemode
			if (view instanceof GameView) view.players.push(new Player())
			view.stage.reset()
		})
		x.send()
	}
}
class GameView extends View {
	constructor() {
		super()
		/** @type {Player[]} */
		this.players = []
		/** @type {Particle[]} */
		this.particles = []
		this.stageWidth = 0
		this.hasWon = false
		this.attempt = 0
	}
	win() {
		this.hasWon = true
		this.particles.push(new LevelCompleteSign())
		this.sendVerification()
	}
	getCompletion() {
		var maxX = Math.max(...this.players.map((v) => v.x))
		var pc = Math.floor((maxX / this.stageWidth) * 100)
		if (pc < 0) return 0
		if (pc > 100) return 100
		return pc
	}
	sendVerification() {
		var amount = this.getCompletion()
		levelMeta.completion.percentage = Math.max(levelMeta.completion.percentage, amount)
		var coins = []
		for (var i = 0; i < this.tiles.length; i++) {
			var t = this.tiles[i]
			if (t instanceof Coin) {
				coins.push(t.activated > 0)
			}
		}
		var x = new XMLHttpRequest()
		x.open("POST", "../verify")
		x.send(JSON.stringify({
			level: levelName,
			completion: amount,
			coins
		}))
	}
}

/**
 * @param {string} registry
 * @param {string | string[]} location
 */
function getObjectFromLocation(registry, location) {
	// @ts-ignore
	var path = registries[registry]
	if (location == "") return path
	for (var segment of location) {
		path = path[segment]
	}
	return path
}
/**
 * @param {string} registry
 * @param {Tile | GameMode} object
 */
function getLocationFromObject(registry, object) {
	/**
	 * @type {any[]}
	 */
	var v = null
	/**
	 * @param {any} registry
	 * @param {any[]} path
	 * @param {any} object
	 */
	function find(registry, path, object) {
		var folder = getObjectFromLocation(registry, path)
		var keys = Object.keys(folder)
		for (var i = 0; i < keys.length; i++) {
			var check = folder[keys[i]]
			// Check the item for the object
			if (typeof check == "function") {
				if (object instanceof check || object == check) {
					v = [...path, keys[i]]
				}
			} else {
				find(registry, [...path, keys[i]], object)
			}
			if (v != null) return
		}
	}
	find(registry, [], object)
	if (v == null) debugger;
	return v
}

var registries = {
	"tile": {
		"block": {
			"basic-block": BasicBlock,
			"half-block": HalfBlock
		},
		"death": {
			"basic-spike": BasicSpike,
			"half-spike": HalfSpike
		},
		"jump": {
			"orb": {
				"jump": JumpOrb,
				"black": BlackOrb,
				"gravity": GravityOrb
			},
			"pad": {
				"jump": JumpPad,
				"jump-small": SmallJumpPad,
				"gravity": GravityPad
			}
		},
		"portal": {
			"gamemode": {
				"cube": CubePortal,
				"ship": ShipPortal,
				"ball": BallPortal,
				"wave": WavePortal
			},
			"gravity-down": GravityPortalDown,
			"gravity-up": GravityPortalUp
		},
		"special": {
			"trigger": {
				"color": ColorTrigger
			},
			"start-pos": StartPosBlock,
			"coin": Coin
		}
	},
	"gamemode": {
		"cube": CubeMode,
		"ship": ShipMode,
		"ball": BallMode,
		"wave": WaveMode
	}
}

// @ts-ignore
var levelName = url_query.level
var levelMeta = {
	"name": "Untitled Level",
	"description": "",
	"settings": {
		"colorbg": [0, 125, 255],
		"colorstage": [0, 125, 255],
		"gamemode": "cube"
	},
	"completion": {
		"percentage": 0,
		/** @type {boolean[]} */
		"coins": []
	}
}
// @ts-ignore
var debugMode = url_query.debug == "true"
/** @type {GameView} */
// @ts-ignore
var view = new ({
	"game": GameView,
	"editor": View
}[viewType])();
view.loadLevel()
