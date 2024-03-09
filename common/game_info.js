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
/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 */
function rotatePoint(cx, cy, x, y, angle) {
	var radians = (Math.PI / 180) * angle,
		cos = Math.cos(radians),
		sin = Math.sin(radians),
		nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
		ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
	return [nx, ny];
}



class SceneItem {
	/**
	 * @param {View} view
	 * @param {number} x The starting X position.
	 * @param {number} y The starting Y position.
	 */
	constructor(view, x, y) {
		this.view = view
		/** @type {HTMLDivElement} */
		this.elm = document.createElement("div")
		this.elm.classList.add("regularPos")
		document.querySelector("#scene")?.appendChild(this.elm)
		/** @type {number} */
		this.x = x
		/** @type {number} */
		this.y = y
		/** @type {number} */
		this.rotation = 0
		/** @type {(string | undefined)[]} */
		this.extraStyles = []
		/** @type {boolean} */
		this.needsRedraw = true
	}
	/**
	 * @param {number} _amount
	 */
	tick(_amount) {
		if (this.needsRedraw) {
			this.update()
			this.needsRedraw = false
		}
	}
	update() {
		this.elm.setAttribute("style", `--x: ${this.x}; --y: ${this.y}; transform: rotate(${this.rotation}deg);${this.extraStyles.map((v) => v==undefined ? "" : ` ${v}`).join("")}`)
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
	/**
	 * @param {View} view
	 */
	constructor(view) {
		super(view, 0, 0)
		this.elm.classList.remove("regularPos")
		this.elm.classList.add("stage")
		this.bgColor = InterpolatedColor.fromRGB(levelMeta.settings.colorbg)
		this.stageColor = InterpolatedColor.fromRGB(levelMeta.settings.colorstage)
		this.lastX = 0
		this.lastY = 0
		// Filter
		this.filterParent = document.createElementNS("http://www.w3.org/2000/svg", "svg")
		document.body.appendChild(this.filterParent)
		this.filterElm = document.createElementNS("http://www.w3.org/2000/svg", "filter")
		this.filterParent.appendChild(this.filterElm)
		this.filter = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix")
		this.filterElm.appendChild(this.filter)
		this.filterElm.id = "main-key-filter"
		this.filter.setAttribute("type", "matrix")
		this.keys = {
			red: [0, 0],
			green: [0, 0],
			blue: [0, 0]
		}
		this.updateMatrixValues()
	}
	updateMatrixValues() {
		var r = this.keys.red[1]==0 ? 1 : this.keys.red[0] / this.keys.red[1]
		var g = this.keys.green[1]==0 ? 1 : this.keys.green[0] / this.keys.green[1]
		var b = this.keys.blue[1]==0 ? 1 : this.keys.blue[0] / this.keys.blue[1]
		this.filter.setAttribute("values",
`${r} 0 0 0 0\
 0 ${g} 0 0 0\
 0 0 ${b} 0 0\
 0 0 0 1 0`)
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.bgColor.tick(amount)
		this.stageColor.tick(amount)
		if (this.view.player) {
			// Camera X
			this.lastX = Math.max(0, this.view.player.x - 10)
			// Camera Y
			var ty = this.view.player.y - 5
			if (ty < 0) ty = 0
			var ypad = 7
			this.lastY = ((this.lastY * 80) + ty) / 81
			if (this.lastY < ty - ypad) this.lastY = ty - ypad
			if (this.lastY > ty + ypad) this.lastY = ty + ypad
		}
		/** @type {HTMLDivElement} */
		// @ts-ignore
		var viewport = this.elm.parentNode
		viewport.setAttribute("style", `--move-amount-x: ${this.lastX}; --move-amount-y: ${this.lastY}; --bg-color: ${this.bgColor.getHex()}; --stage-color: ${this.stageColor.getHex()};`)
		super.tick(amount)
	}
	reset() {
		this.lastY = 0
		this.bgColor = InterpolatedColor.fromRGB(levelMeta.settings.colorbg)
		this.stageColor = InterpolatedColor.fromRGB(levelMeta.settings.colorstage)
		for (var i = 0; i < this.view.tiles.length; i++) {
			var t = this.view.tiles[i]
			if (t instanceof Trigger) {
				t.activated = false
			}
			if (t instanceof Coin) {
				t.activated = 0
			}
			if (t instanceof Key) {
				t.activation = 0
				t.needsRedraw = true
			}
		}
		this.keys.red[0] = 0
		this.keys.green[0] = 0
		this.keys.blue[0] = 0
		this.updateMatrixValues()
	}
}
class Player extends SceneItem {
	/**
	 * @param {View} view
	 */
	constructor(view) {
		super(view, -3, 0)
		this.setStartPos()
		this.elm.classList.add("player")
		/** @type {number} */
		this.vy = 0
		/** @type {number | null} */
		this.groundHeight = null
		/** @type {null | (() => void)} */
		this.specialJump = null
		/** @type {number} */
		this.gravity = 1
		/** @type {GameMode} */
		this.mode = new CubeMode(this);
		this.setStartMode()
	}
	getGeneralRect() {
		return this.mode.getRect()
	}
	getDeathRect() {
		return this.getGeneralRect().relative(0.1, 0.1, 0.8, 0.8)
	}
	getBlockRects() {
		var margin = 0.2
		var general = this.getGeneralRect()
		const maxY = general.relative(0, 1 - margin, 1, margin)
		const minY = general.relative(0, 0, 1, margin)
		const top = this.gravity > 0 ? maxY : minY
		const bottom = this.gravity > 0 ? minY : maxY
		return {
			collide: general.relative(0, margin, 1, 1 - (margin * 2)),
			sides: general.relative(-margin, 0, 1 + (margin * 2), 1 - (margin * 2)),
			bottom
		}
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		// Move forwards
		if (levelMeta.settings.platformer && this.view instanceof GameView) {
			if (this.view.isPressingLeft) this.x -= 0.1 * amount
			if (this.view.isPressingRight) this.x += 0.1 * amount
		} else {
			this.x += 0.1 * amount
		}
		if (this.x < 0) {
			this.x = 0
		}
		// Fall
		this.mode.gravity(amount)
		// Update Y
		this.y += this.vy * amount
		// Setup collision detection
		this.groundHeight = null
		this.specialJump = null
		// Check for collision with stage
		if (this.y < 0) {
			this.y = 0
			if (this.gravity > 0) {
				this.groundHeight = 0
			}
		}
		this.mode.getMax()
		// Update styles
		// @ts-ignore
		this.extraStyles[0] = `background: url(data:image/svg+xml;base64,${btoa(this.mode.constructor.getIcon())});`
		this.extraStyles[1] = `transform: rotate(${this.rotation}deg) scaleY(${this.gravity});`
		this.needsRedraw = true;
		super.tick(amount)
	}
	/**
	 * @param {number} amount
	 */
	finishTick(amount) {
		if (this.groundHeight != null) {
			if (this.gravity < 0) {
				if (this.vy > 0) this.vy = 0
			} else {
				if (this.vy < 0) this.vy = 0
			}
		}
		this.mode.checkJump(amount)
		if (this.x > this.view.stageWidth) this.view.win()
		if (debugMode && Math.abs(this.vy) > 0.3) RectDisplay.create(this.view, this)
	}
	destroy() {
		super.destroy()
		if (this.view instanceof GameView) {
			this.view.deathTime = 30
			this.view.particles.push(new DeathParticleMain(this.view, this.x + 0.5, this.y + 0.5))
			for (var i = 0; i < 20; i++) {
				this.view.particles.push(new DeathParticleExtra(this.view, this.x + 0.5, this.y + 0.5))
			}
			this.view.sendVerification()
		}
		this.view.player = null
	}
	setStartPos() {
		for (var i = 0; i < this.view.tiles.length; i++) {
			var t = this.view.tiles[i]
			if (t instanceof StartPosBlock) {
				var rect = t.getRect()
				this.x = rect.x
				this.y = rect.y
				return
			}
		}
		this.x = -3
		this.y = 0
		if (levelMeta.settings.platformer) {
			this.x = 0
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
	/** @returns {string} */
	static getIcon() {
		throw new Error("Aaaaaa! You're not supposed to do that!");
	}
	/**
	 * @param {number} amount
	 */
	gravity(amount) {
		this.player.vy -= 0.028 * this.player.gravity * amount
	}
	/**
	 * @param {number} _amount
	 */
	checkJump(_amount) {}
	getMax() {
		if (this.player.y > this.player.view.stageHeight) {
			this.player.destroy()
		}
	}
	getRect() {
		return new Rect(this.player.x, this.player.y, 1, 1)
	}
	/**
	 * @param {number} _h The height of the ceiling
	 */
	hitCeiling(_h) {
		if (levelMeta.settings.platformer) {
			this.player.y = _h + (-1) + (this.player.gravity<0 ? 2 : 0)
			this.player.vy = -0.01 * this.player.gravity
		} else {
			this.player.destroy()
		}
	}
}
class CubeMode extends GameMode {
	static getIcon() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
	<style>
		.outline {
			fill: black;
		}
		.middle {
			fill: #00ff21;
		}
		.inside {
			fill: #00f2ff;
		}
	</style>
	<path class="outline" d="M 0 0 L 18 0 L 18 18 L 0 18 Z M 1 1 L 1 17 L 17 17 L 17 1 Z" />
	<path class="middle" d="M 1 1 L 17 1 L 17 17 L 1 17 Z M 5 5 L 5 13 L 13 13 L 13 5 Z" />
	<path class="outline" d="M 6 6 L 12 6 L 12 12 L 6 12 Z M 7 7 L 7 11 L 11 11 L 11 7 Z" />
	<path class="outline" d="M 4 4 L 14 4 L 14 14 L 4 14 Z M 5 5 L 5 13 L 13 13 L 13 5 Z" />
	<rect class="inside" x="7" y="7" width="4" height="4" />
</svg>`
	}
	/**
	 * @param {number} amount
	 */
	checkJump(amount) {
		if (this.player.groundHeight != null) {
			var targetRotation = (Math.floor((this.player.rotation - 45) / 90) * 90) + 90
			this.player.rotation = (targetRotation + (this.player.rotation * 2)) / 3
			if (this.player.gravity < 0) {
				if (this.player.view instanceof GameView) {
					if ((!levelMeta.settings.platformer) || this.player.view.isPressingRight) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x, this.player.y + 1, 1))
					if ((levelMeta.settings.platformer) && this.player.view.isPressingLeft) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 1, this.player.y + 1, -1))
				}
				var ph = this.player.getGeneralRect().h
				if (this.player.y + ph > this.player.groundHeight) {
					this.player.y -= 0.1
					if (this.player.y + ph < this.player.groundHeight) {
						this.player.y = this.player.groundHeight - ph
					}
				}
			} else {
				if (this.player.view instanceof GameView) {
					if ((!levelMeta.settings.platformer) || this.player.view.isPressingRight) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x, this.player.y, 1))
					if ((levelMeta.settings.platformer) && this.player.view.isPressingLeft) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 1, this.player.y, -1))
				}
				if (this.player.y < this.player.groundHeight) {
					this.player.y += 0.1
					if (this.player.y > this.player.groundHeight) {
						this.player.y = this.player.groundHeight
					}
				}
			}
		} else {
			this.player.rotation += 5 * amount * this.player.gravity
		}
		if (this.player.view instanceof GameView && this.player.view.isPressing) {
			if (this.player.specialJump != null) {
				this.player.specialJump()
			} else if (this.player.groundHeight != null) {
				this.player.vy = 0.33 * this.player.gravity
			}
		}
	}
}
class ShipMode extends GameMode {
	static getIcon() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-11 -4 37 37">
	<style>
		.outline {
			fill: black;
		}
		.middle {
			fill: #00ff21;
		}
		.inside {
			fill: #00f2ff;
		}
	</style>
	<g transform="scale(0.4)">
		${CubeMode.getIcon()}
	</g>
	<g>
		<g>
			<path class="outline" d="M -2 9 L 2 9 L 2 14 L 20 16 L 20 20 L -2 20 Z M -1 10 L -1 19 L 19 19 L 19 17 L 1 15 L 1 10 Z" />
			<path class="inside" d="M -1 10 L -1 19 L 19 19 L 19 17 L 1 15 L 1 10 Z" />
		</g>
		<g>
			<path class="outline" d="M 0 20 L 0 27 L 16 27 L 16 20 L 15 20 L 15 26 L 1 26 L 1 20 Z" />
			<rect class="middle" x="1" y="20" width="14" height="6" />
		</g>
		<g>
			<path class="outline" d="M 20 17 L 26 18 L 26 25 L 16 27 L 16 20 L 17 20 L 17 26 L 25 24 L 25 19 L 20 18 Z" />
			<path class="middle" d="M 20 18 L 25 19 L 25 24 L 17 26 L 17 20 L 20 20 Z" />
		</g>
		<g>
			<path class="outline" d="M 0 26 L 0 27 L -7 29 L -7 17 L -2 18 L -2 19 L -6 18 L -6 28 Z" />
			<path class="middle" d="M -6 18 L -2 19 L -2 20 L 0 20 L 0 26 L -6 28 Z" />
		</g>
		<g>
			<path class="outline" d="M -7 18 L -7 19 L -10 19 L -10 27 L -7 27 L -7 28 L -11 28 L -11 18 Z" />
			<rect class="middle" x="-10" y="19" width="3" height="8" />
		</g>
	</g>
</svg>`
	}
	/**
	 * @param {number} _amount
	 */
	gravity(_amount) {}
	/**
	 * @param {number} _amount
	 */
	checkJump(_amount) {
		this.player.rotation = this.player.vy * -100
		if (this.player.view instanceof GameView && this.player.view.isPressing) {
			if (this.player.specialJump != null) {
				this.player.specialJump()
			} else {
				this.player.vy += 0.005 * this.player.gravity
			}
		} else {
			this.player.vy -= 0.005 * this.player.gravity
		}
		if (this.player.gravity < 0) {
			if (this.player.view instanceof GameView) {
				if ((!levelMeta.settings.platformer) || this.player.view.isPressingRight) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 0.05, this.player.y + 0.8, 1))
				if ((levelMeta.settings.platformer) && this.player.view.isPressingLeft) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 0.95, this.player.y + 0.8, -1))
			}
			if (this.player.groundHeight != null) {
				var ph = this.player.getGeneralRect().h
				if (this.player.y + ph > this.player.groundHeight) {
					this.player.vy = 0
					this.player.y -= 0.1
					if (this.player.y + ph < this.player.groundHeight) {
						this.player.y = this.player.groundHeight - ph
					}
				}
			}
		} else {
			if (this.player.view instanceof GameView) {
				if ((!levelMeta.settings.platformer) || this.player.view.isPressingRight) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 0.05, this.player.y + 0.2, 1))
				if ((levelMeta.settings.platformer) && this.player.view.isPressingLeft) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 0.95, this.player.y + 0.2, -1))
			}
			if (this.player.groundHeight != null) {
				if (this.player.y/* + 0.2*/ < this.player.groundHeight) {
					this.player.vy = 0
					this.player.y += 0.1
					if (this.player.y/* + 0.2*/ > this.player.groundHeight) {
						this.player.y = this.player.groundHeight
					}
				}
			}
		}
	}
	// getRect() {
	// 	return super.getRect().relative(0, 0.1, 1, 0.8)
	// }
	/**
	 * @param {number} h
	 */
	hitCeiling(h) {
		this.player.y = h + (-0.8) + (this.player.gravity<0 ? 1.6 : 0)
		this.player.vy = -0.01 * this.player.gravity
	}
}
class BallMode extends GameMode {
	static getIcon() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
	<style>
		.outline {
			fill: black;
		}
		.middle {
			fill: #00ff21;
		}
		.inside {
			fill: #00f2ff;
		}
	</style>
	<!-- <path class="middle" d="M 0 8 L 3 6 L 3 3 L 8 4 L 9 0 L 14 5 L 18 5 L 16 11 L 18 14 L 12 18 L 10 16 L 7 18 L 5 17 L 7 13 L 0 14 L 4 9 Z" /> -->
	<!-- <path class="inside" d="M 6 7 L 5 6 L 9 6 L 9 3 L 13 7 L 17 7 L 13 11 L 16 13 L 11 16 L 10 13 L 7 17 L 8 11 L 3 13 L 7 8 L 2 8 Z" /> -->
	<path class="outline" d="M 9.78 17.97 L 9.7 16.97 L 15.89 14.79 L 15.13 14.14 L 17.97 8.22 L 16.97 8.3 L 14.79 2.11 L 14.14 2.87 L 8.22 0.03 L 8.3 1.03 L 2.11 3.21 L 2.87 3.86 L 0.03 9.78 L 1.03 9.7 L 3.21 15.89 L 3.86 15.13 Z" />
	<path class="middle" d="M 9 17 L 9 16 L 14.66 14.66 L 13.95 13.95 L 17 9 L 16 9 L 14.66 3.34 L 13.95 4.05 L 9 1 L 9 2 L 3.34 3.34 L 4.05 4.05 L 1 9 L 2 9 L 3.34 14.66 L 4.05 13.95 Z" />
	<path class="outline" d="M 9.44 13.98 L 9.35 12.98 L 12.83 12.21 L 12.06 11.57 L 13.98 8.56 L 12.98 8.65 L 12.21 5.17 L 11.57 5.94 L 8.56 4.02 L 8.65 5.02 L 5.17 5.79 L 5.94 6.43 L 4.02 9.44 L 5.02 9.35 L 5.79 12.83 L 6.43 12.06 Z" />
	<path class="inside" d="M 9 13 L 9 12 L 11.83 11.83 L 11.12 11.12 L 13 9 L 12 9 L 11.83 6.17 L 11.12 6.88 L 9 5 L 9 6 L 6.17 6.17 L 6.88 6.88 L 5 9 L 6 9 L 6.17 11.83 L 6.88 11.12 Z" />
</svg>`
	}
	/**
	 * @param {number} amount
	 */
	checkJump(amount) {
		if ((!levelMeta.settings.platformer) || (this.player.view instanceof GameView && this.player.view.isPressingRight)) {
			this.player.rotation += 10 * amount * this.player.gravity
		}
		if (levelMeta.settings.platformer && this.player.view instanceof GameView && this.player.view.isPressingLeft) {
			this.player.rotation += -10 * amount * this.player.gravity
		}
		if (this.player.groundHeight != null) {
			if (this.player.gravity < 0) {
				if (this.player.view instanceof GameView) {
					if ((!levelMeta.settings.platformer) || this.player.view.isPressingRight) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 0.3, this.player.y + 1, 1))
					if ((levelMeta.settings.platformer) && this.player.view.isPressingLeft) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 0.7, this.player.y + 1, -1))
				}
				var ph = this.player.getGeneralRect().h
				if (this.player.y + ph > this.player.groundHeight) {
					this.player.vy = 0
					this.player.y -= 0.1
					if (this.player.y + ph < this.player.groundHeight) {
						this.player.y = this.player.groundHeight - ph
					}
				}
			} else {
				if (this.player.view instanceof GameView) {
					if ((!levelMeta.settings.platformer) || this.player.view.isPressingRight) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 0.3, this.player.y, 1))
					if ((levelMeta.settings.platformer) && this.player.view.isPressingLeft) this.player.view.particles.push(new SlideParticle(this.player.view, this.player.x + 0.7, this.player.y, -1))
				}
				if (this.player.y < this.player.groundHeight) {
					this.player.vy = 0
					this.player.y += 0.1
					if (this.player.y > this.player.groundHeight) {
						this.player.y = this.player.groundHeight
					}
				}
			}
		}
		if (this.player.view instanceof GameView && this.player.view.isPressing) {
			if (this.player.specialJump != null) {
				this.player.specialJump()
			} else if (this.player.groundHeight != null) {
				this.player.gravity *= -1
				this.player.view.isPressing = false
			}
		}
	}
}
class WaveMode extends GameMode {
	/** @returns {string} */
	static getIcon() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 2 14 14">
	<style>
		.outline {
			fill: black;
		}
		.middle {
			fill: #00ff21;
		}
		.inside {
			fill: #00f2ff;
		}
	</style>
	<path class="outline" d="M 9 7 L 4 7 L 5 9 L 4 11 L 9 11 Z" />
	<path class="middle" d="M 5 7.5 L 8.4 7.5 L 9 9 L 8.4 10.5 L 5 10.5 L 5.8 9 Z" />
	<!--  -->
	<path class="outline" d="M 7 4 L 9 9 L 7 14 L 18 9 Z" />
	<path class="inside" d="M 8.5 5.5 L 10 9 L 8.5 12.5 L 16.5 9 Z" />
</svg>`
	}
	/**
	 * @param {number} _amount
	 */
	gravity(_amount) {}
	/**
	 * @param {number} _amount
	 */
	checkJump(_amount) {
		this.player.rotation = this.player.vy * -450
		if (this.player.view instanceof GameView) {
			this.player.view.particles.push(new WaveParticle(this.player.view, this.player.x, this.player.y + 0.5 + (-1 * this.player.vy)))
			if (this.player.view.isPressing) {
				this.player.vy = 0.1 * this.player.gravity
			} else {
				this.player.vy = -0.1 * this.player.gravity
			}
		}
	}
	getRect() {
		return super.getRect().relative(0, 0.1, 1, 0.8)
	}
	/**
	 * @param {number} h
	 */
	hitCeiling(h) {
		this.player.destroy()
	}
}
class Particle extends SceneItem {
	/**
	 * @param {GameView} view
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(view, x, y) {
		super(view, x, y)
		/** @type {GameView} */
		this.gameview = view
		this.elm.classList.remove("regularPos")
		this.elm.classList.add("particle")
		this.extraStyles[0] = `background: radial-gradient(circle, #0F53 0%, #0F5F 100%);`
		this.extraStyles[1] = `border-radius: 50%;`
		this.extraStyles[2] = `--size: 0.2;`
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.needsRedraw = true
		super.tick(amount)
	}
	destroy() {
		super.destroy()
		this.gameview.particles.splice(this.gameview.particles.indexOf(this), 1)
	}
}
class SlideParticle extends Particle {
	/**
	 * @param {GameView} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} direction
	 */
	constructor(view, x, y, direction) {
		super(view, x, y)
		this.oy = y
		this.gravity = 1
		if (this.view.player != null) this.gravity = this.view.player.gravity
		this.vx = (Math.random() / -20) * direction
		this.vy = (Math.random() / 10) * this.gravity
		this.time = 0
		this.extraStyles[2] = `--size: 0.1;`
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.time += amount
		this.vy -= 0.005 * amount * this.gravity
		this.x += this.vx * amount
		this.y += this.vy * amount
		if (this.gravity < 0) {
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
	 * @param {GameView} view
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(view, x, y) {
		super(view, x, y)
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
class DeathParticleMain extends Particle {
	/**
	 * @param {GameView} view
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(view, x, y) {
		super(view, x, y)
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
	 * @param {GameView} view
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(view, x, y) {
		super(view, x, y)
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
class OrbParticle extends Particle {
	/**
	 * @param {GameView} view
	 * @param {number} x
	 * @param {number} y
	 * @param {string} color
	 */
	constructor(view, x, y, color) {
		super(view, x, y)
		this.center = { x, y }
		this.deg = Math.random() * 360
		this.r = 0.6
		this.vdeg = 0
		this.vr = 0
		this.extraStyles[0] = `background: ${color};`
		this.extraStyles[1] = `border-radius: 0%;`
		this.extraStyles[2] = `--size: 0.1;`
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		// Update position based on velocity
		this.deg += this.vdeg * amount
		this.r += this.vr * amount
		// Calculate position
		var pos = rotatePoint(this.center.x, this.center.y, this.center.x - this.r, this.center.y, this.deg)
		this.x = pos[0]
		this.y = pos[1]
		// Accelerate
		this.vdeg += 2 * amount
		this.vr -= 0.01 * amount
		// Finish
		super.tick(amount)
		if (this.r <= 0) this.destroy()
	}
}
class OrbActivateParticle extends Particle {
	/**
	 * @param {GameView} view
	 * @param {number} x
	 * @param {number} y
	 * @param {string} color
	 */
	constructor(view, x, y, color) {
		super(view, x, y)
		this.center = { x, y }
		this.r = 0.75
		this.v = 0
		this.extraStyles[0] = `background: ${color};`
		this.extraStyles[2] = `--size: ${this.r * 2}; opacity: 0.5;`
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.v -= 0.001
		this.r += this.v
		this.extraStyles[2] = `--size: ${this.r * 2}; opacity: ${map(this.r, 0.75, 0, 0.75, 0)};`
		super.tick(amount)
		if (this.r <= 0) this.destroy()
	}
}
class LevelCompleteSign extends Particle {
	/**
	 * @param {GameView} view
	 */
	constructor(view) {
		super(view, 0, 0)
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
		this.view.stage.elm.appendChild(e)
		e.setAttribute("style", `opacity: 0; transition: opacity 0.7s linear;`)
		requestAnimationFrame(() => {
			e.setAttribute("style", `opacity: 1; transition: opacity 0.7s linear;`)
		})
	}
	destroy() {
		super.destroy()
		this.view.stage.elm.children[0].remove()
	}
}
class ProgressBar extends Particle {
	/**
	 * @param {GameView} view
	 */
	constructor(view) {
		super(view, 0, 0)
		this.elm.classList.add("progress-bar")
		document.querySelector("#scene")?.insertAdjacentElement("afterend", this.elm)
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		var c = this.gameview.getCompletion()
		this.elm.innerHTML = `<div>Attempt ${this.gameview.attempt}</div><div style="background: linear-gradient(90deg, #AFA ${c}%, #AAF ${c}%, #AAF ${levelMeta.completion.percentage}%, white ${levelMeta.completion.percentage}%);">${c}% complete</div>`
	}
	destroy() {
		this.gameview.particles.splice(this.gameview.particles.indexOf(this), 1)
		super.destroy()
	}
}
class RectDisplay extends Particle {
	/**
	 * @param {GameView} view
	 * @param {Rect} rect
	 * @param {string} color
	 */
	constructor(view, rect, color) {
		super(view, rect.x, rect.y + 0.5)
		this.elm.classList.remove("particle")
		// this.elm.classList.add(`rect-${rect.x}-${rect.y}-${rect.w}-${rect.h}`)
		this.extraStyles[0] = `background: ${color};`
		this.extraStyles[2] = `bottom: calc(25% + calc(${rect.y + 0.5} * var(--tile-size))); left: calc(calc(${rect.x} * var(--tile-size)) + calc(-1 * calc(var(--move-amount) * var(--tile-size)))); width: calc(${rect.w} * var(--tile-size)); height: calc(${rect.h} * var(--tile-size));`
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
	/**
	 * @param {View} view
	 * @param {Tile | Player} item
	 */
	static create(view, item) {
		var color = "lime"
		var r = item instanceof Player ? item.getDeathRect() : item.getRect()
		if (r.hasInvalid()) return
		if (item instanceof Player) return//color = "transparent;outline: 1px solid yellow;"
		else r = r.rotate(item.rotation, item.x + 0.5, item.y + 0.5)
		if (item instanceof TileDeath) color = "red"
		if (view instanceof GameView) view.particles.push(new RectDisplay(view, r, color))
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
		var a = rotatePoint(centerX, centerY, this.x, this.y, amount)
		var b = rotatePoint(centerX, centerY, this.x + this.w, this.y + this.h, amount)
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
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} dw
	 * @param {number} dh
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, dw, dh, rotation, groups) {
		super(view, x, y)
		this.display_size = [dw, dh]
		var location = getLocationFromObject("tile", this)
		var r_location = ["broken"]
		if (location != null) r_location = [...location]
		// @ts-ignore
		this.extraStyles[0] = `background: url(data:image/svg+xml;base64,${btoa(this.constructor.getImage())}) no-repeat;`
		this.extraStyles[1] = `--dw: ${dw}; --dh: ${dh};`
		this.rotation = rotation
		this.groups = groups
		// this.enabled = false
		if (debugMode) RectDisplay.create(this.view, this)
	}
	/** @returns {string} */
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	<path d="M 0 0 L 20 0 L 20 20 L 0 20 Z M 1 1 L 1 19 L 19 19 L 19 1 Z" fill="white" />
</svg>`
	}
	/**
	 * @param {View} view
	 * @param {typeof Tile} type
	 * @param {object} info
	 */
	static load(view, type, info) {
		// @ts-ignore
		return new type(view, info.x, info.y, info.rotation, info.groups)
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
			`<div>Tile Rotation: <select oninput="editing.rotation = Number(this.value); editing.update();">
	<option value="0"${this.rotation==0 ? " selected" : ""}>&nbsp;&uarr; 0</option>
	<option value="90"${this.rotation==90 ? " selected" : ""}>&rarr; 90</option>
	<option value="180"${this.rotation==180 ? " selected" : ""}>&nbsp;&darr; 180</option>
	<option value="270"${this.rotation==270 ? " selected" : ""}>&larr; 270</option>
</select></div>`,
			`<div>X: <input type="number" value="${this.x}" min="0" oninput="editing.x = this.valueAsNumber; editing.update();"></div>`,
			`<div>Y: <input type="number" value="${this.y}" min="0" oninput="editing.y = this.valueAsNumber; editing.update();"></div>`
		]
	}
	getRect() {
		return new Rect(this.x, this.y, 1, 1)
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		if (this.view.player && Math.abs(this.x - this.view.player.x) < 40) {
			if (viewType == "game") {
				this.collide(this.view.player)
			}
			super.tick(amount)
		}
	}
	/**
	 * @param {Player} player
	 */
	collide(player) {}
}
class TileBlock extends Tile {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, 1, 1, rotation, groups)
	}
	/**
	 * @param {Player} player
	 */
	collide(player) {
		var playerRects = player.getBlockRects()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRects.collide.colliderect(thisRect)) {
			// The player has collided with either the top or side of this block.
			if (playerRects.sides.colliderect(thisRect)) {
				// The player hit the side of this block
				// If we are not in platformer mode, then the player has died.
				if (! levelMeta.settings.platformer) {
					player.destroy() // :(
				} else {
					// Otherwise, we need to move the player so they are not colliding with this block.
					if (playerRects.collide.centerX() < thisRect.centerX()) {
						// Player is to the left of this block
						player.x = thisRect.x - playerRects.collide.w
					} else {
						// Player is to the right of this block
						player.x = thisRect.x + thisRect.w
					}
				}
			} else {
				// The player has collided with the top of this block.
				player.mode.hitCeiling(thisRect.y)
			}
		} else if (playerRects.bottom.colliderect(thisRect)) {
			// If the player is almost on top of this block, push them.
			if (player.gravity > 0) {
				player.groundHeight = thisRect.y + thisRect.h
			} else {
				player.groundHeight = thisRect.y
			}
		}
	}
}
class TileDeath extends Tile {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, 1, 1, rotation, groups)
	}
	/**
	 * @param {Player} player
	 */
	collide(player) {
		var playerRect = player.getDeathRect().relative(0.1, 0.1, 0.8, 0.8)
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Player dies!
			player.destroy()
			if (debugMode) {
				setTimeout(() => {
					if (this.view instanceof GameView) this.view.particles.push(new RectDisplay(this.view, player.getDeathRect(), "orange"))
				}, 100)
			}
			this.enabled = true
		}
	}
}
class BasicBlock extends TileBlock {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	<defs>
		<linearGradient id="mainGradient" gradientTransform="rotate(90)">
			<stop offset="0%" stop-color="#000F" />
			<stop offset="100%" stop-color="#0000" />
		</linearGradient>
	</defs>
	<path d="M 0 0 L 20 0 L 20 20 L 0 20 Z M 1 1 L 1 19 L 19 19 L 19 1 Z" fill="white" />
	<rect x="1" y="1" width="18" height="18" fill="url(#mainGradient)" />
</svg>`
	}
}
class HalfBlock extends TileBlock {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	<defs>
		<linearGradient id="mainGradient" gradientTransform="rotate(90)">
			<stop offset="0%" stop-color="#000F" />
			<stop offset="100%" stop-color="#0000" />
		</linearGradient>
	</defs>
	<path d="M 0 0 L 20 0 L 20 10 L 0 10 Z M 1 1 L 1 9 L 19 9 L 19 1 Z" fill="white" />
	<rect x="1" y="1" width="18" height="8" fill="url(#mainGradient)" />
</svg>`
	}
	getRect() {
		return super.getRect().relative(0, 0.5, 1, 0.5);
	}
}
class BasicSpike extends TileDeath {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
	<defs>
		<linearGradient id="mainGradient" gradientTransform="rotate(90)">
			<stop offset="0%" stop-color="#000F" />
			<stop offset="100%" stop-color="#0000" />
		</linearGradient>
	</defs>
	<path d="M 5 0 L 10 10 L 0 10 Z M 5 1.5 L 1 9.4 L 9 9.4 Z" fill="white" />
	<path d="M 5 1.5 L 1 9.4 L 9 9.4 Z" fill="url(#mainGradient)" />
</svg>`
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.8);
	}
}
class HalfSpike extends TileDeath {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
	<defs>
		<linearGradient id="mainGradient" gradientTransform="rotate(90)">
			<stop offset="0%" stop-color="#000F" />
			<stop offset="100%" stop-color="#0000" />
		</linearGradient>
	</defs>
	<path d="M 5 5 L 10 10 L 0 10 Z M 5 5.8 L 1 9.6 L 9 9.6 Z" fill="white" />
	<path d="M 5 5.8 L 1 9.6 L 9 9.6 Z" fill="url(#mainGradient)" />
</svg>`
	}
	getRect() {
		return super.getRect().relative(0.2, 0, 0.6, 0.4);
	}
}
class Orb extends Tile {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		var ds = 1
		var particles = false
		if (view instanceof GameView) {
			ds = 0.5
			particles = true
		}
		super(view, x, y, ds, ds, rotation, groups)
		this.timeout = 0
		this.hasParticles = particles
		this.particleColor = "yellow"
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		if (this.timeout > 0) this.timeout -= amount
		super.tick(amount)
		// Spawn particles
		if (this.hasParticles && this.view instanceof GameView && Math.random() < amount) {
			this.view.particles.push(new OrbParticle(this.view, this.x + 0.5, this.y + 0.5, this.particleColor))
		}
	}
	/**
	 * @param {Player} player
	 */
	collide(player) {
		if (this.timeout > 0) return
		var playerRect = player.getGeneralRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			this.enabled = true
			// Jumpy jumpy
			var target = this
			player.specialJump = () => {
				target.timeout = 10
				if (this.view instanceof GameView) this.view.particles.push(new OrbActivateParticle(this.view, target.x + 0.5, target.y + 0.5, target.particleColor))
				target.activate(player)
			}
		}
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {}
}
class JumpOrb extends Orb {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
	<path d="M 5 0 A 1 1 0 0 0 5 10 A 1 1 0 0 0 5 0 Z M 5 1 A 1 1 0 0 1 5 9 A 1 1 0 0 1 5 1 Z" fill="#FF8" />
	<path d="M 5 2 A 1 1 0 0 0 5 8 A 1 1 0 0 0 5 2 Z" fill="#FF0" />
</svg>`
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {
		player.vy = 0.34 * player.gravity
	}
}
class GravityOrb extends Orb {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
		this.particleColor = "cyan"
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
	<path d="M 5 0 A 1 1 0 0 0 5 10 A 1 1 0 0 0 5 0 Z M 5 1 A 1 1 0 0 1 5 9 A 1 1 0 0 1 5 1 Z" fill="#DFF" />
	<path d="M 5 2 A 1 1 0 0 0 5 8 A 1 1 0 0 0 5 2 Z" fill="#0FF" />
</svg>`
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {
		player.gravity *= -1
		player.vy = player.gravity * -0.5
	}
}
class BlackOrb extends Orb {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
		this.particleColor = "black"
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
	<path d="M 5 0 A 1 1 0 0 0 5 10 A 1 1 0 0 0 5 0 Z M 5 1 A 1 1 0 0 1 5 9 A 1 1 0 0 1 5 1 Z" fill="#DDD" />
	<path d="M 5 2 A 1 1 0 0 0 5 8 A 1 1 0 0 0 5 2 Z" fill="#000" />
</svg>`
		// TODO: Should have dashed outline + spinny
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {
		player.vy += player.gravity * -0.7
	}
}
class StartPosBlock extends Tile {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(view, x, y) {
		super(view, x, y, 1, 1, 0, [])
		if (viewType == "game") this.elm.remove()
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	<path d="M 1 1 L 19 1 L 19 19 L 1 19 Z M 4 4 L 4 17 L 16 17 L 16 4 Z" fill="white" />
	<path d="M 5 5 L 10 10 L 5 15 Z M 10 5 L 15 10 L 10 15 Z" fill="green" />
</svg>`
	}
	/**
	 * @param {View} view
	 * @param {typeof StartPosBlock} type
	 * @param {object} info
	 */
	static load(view, type, info) {
		// @ts-ignore
		return new type(view, info.x, info.y)
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
			`<div>X: <input type="number" value="${this.x}" min="0" oninput="editing.x = Math.round(this.valueAsNumber); editing.update();"></div>`,
			`<div>Y: <input type="number" value="${this.y}" min="0" oninput="editing.y = Math.round(this.valueAsNumber); editing.update();"></div>`
		]
	}
}
class Coin extends Tile {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, 1, 1, rotation, groups)
		/** @type {number} */
		this.activated = 0
		/** @type {boolean} */
		this.alreadygot = false
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	<defs>
		<linearGradient id="ringGradient">
			<stop offset="0%" stop-color="#ffb14a" />
			<stop offset="100%" stop-color="#9a6929" />
		</linearGradient>
		<linearGradient id="innerGradient">
			<stop offset="0%" stop-color="#9a6929" />
			<stop offset="100%" stop-color="#ffb14a" />
		</linearGradient>
	</defs>
	<path d="M 0 10 A 1 1 0 0 0 20 10 A 1 1 0 0 0 0 10 Z M 1 10 A 1 1 0 0 1 19 10 A 1 1 0 0 1 1 10 Z" fill="black" />
	<path d="M 1 10 A 1 1 0 0 0 19 10 A 1 1 0 0 0 1 10 Z M 3 10 A 1 1 0 0 1 17 10 A 1 1 0 0 1 3 10 Z" fill="url(#ringGradient)" />
	<circle cx="10" cy="10" r="7" fill="url(#innerGradient)" />
	<path d="M 12 8 L 14 7 A 5 5 0 1 0 14 13 L 12 12 A 3 3 0 1 1 12 8 Z" fill="url(#ringGradient)" stroke="#422b0c" stroke-width="0.3" />
</svg>`
	}
	/**
	 * @param {Player} player
	 */
	collide(player) {
		if (this.activated > 0) {
			return
		}
		var playerRect = player.getGeneralRect()
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
		if (this.alreadygot) this.extraStyles[0] = `background: url(data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	<path d="M 0.5 10 A 1 1 0 0 0 19.5 10 A 1 1 0 0 0 0.5 10 Z" fill="none" stroke="black" stroke-width="1" stroke-dasharray="1" />
	<path d="M 12 8 L 14 7 A 5 5 0 1 0 14 13 L 12 12 A 3 3 0 1 1 12 8 Z" fill="white" stroke="black" stroke-width="0.3" />
</svg>`) /* I hate Python for the fact that you can't do this with f-strings */}) no-repeat;`
		this.extraStyles[1] = `--dw: var(--tsize); --dh: var(--tsize);`
		this.extraStyles[2] = `--tsize: ${Math.sqrt(Math.sqrt(this.activated + 1))};`
		this.extraStyles[3] = `opacity: ${map(this.activated, 0, 100, 1, 0)};`
		this.needsRedraw = true
		if (this.activated > 0) {
			if (this.activated < 100) {
				this.activated += amount
			}
		}
		super.tick(amount)
	}
	trigger() {}
}
class Trigger extends Tile {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {boolean} needsTouch
	 * @param {string[]} groups
	 */
	constructor(view, x, y, needsTouch, groups) {
		super(view, x, y, 1, 1, 0, groups)
		/** @type {boolean} */
		this.needsTouch = needsTouch == true
		/** @type {boolean} */
		this.activated = false
		if (view instanceof GameView) this.elm.remove()
	}
	getEdit() {
		return [
			...super.getEdit(),
			`<div>Needs touch: <input type="checkbox"${this.needsTouch ? " checked" : ""} oninput="editing.needsTouch = this.checked"></div>`
		]
	}
	/**
	 * @param {Player} player
	 */
	hasCollision(player) {
		var playerRect = player.getGeneralRect()
		var thisRect = this.getRect()
		if (this.needsTouch) {
			return playerRect.colliderect(thisRect)
		} else {
			return playerRect.centerX() > thisRect.centerX()
		}
	}
	/**
	 * @param {Player} player
	 */
	collide(player) {
		if (this.activated) return
		if (this.hasCollision(player)) {
			this.activated = true
			this.trigger(player)
		}
	}
	/**
	 * @param {Player} player
	 */
	trigger(player) {}
}
class ColorTrigger extends Trigger {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {boolean} needsTouch
	 * @param {"stage" | "bg"} section
	 * @param {number[]} newColor
	 * @param {number} duration
	 * @param {string[]} groups
	 */
	constructor(view, x, y, needsTouch, section, newColor, duration, groups) {
		super(view, x, y, needsTouch, groups)
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
		if (this.extraStyles[0]) this.extraStyles[0] = this.extraStyles[0].substring(0, this.extraStyles[0].length - 1) + `, radial-gradient(circle, var(--trigger-color) 50%, transparent 50%);`
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
	<path d="M 5 0 A 1 1 0 0 0 5 10 A 1 1 0 0 0 5 0 Z M 5 1 A 1 1 0 0 1 5 9 A 1 1 0 0 1 5 1 Z" fill="yellow" />
	<path d="M 5 1 A 1 1 0 0 0 5 9 A 1 1 0 0 0 5 1 Z M 5 2 A 1 1 0 0 1 5 8 A 1 1 0 0 1 5 2 Z" fill="white" />
</svg>`
	}
	/**
	 * @param {any[]} pos
	 * @returns {object}
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
	 * @param {View} view
	 * @param {typeof Tile} type
	 * @param {object} info
	 */
	static load(view, type, info) {
		// @ts-ignore
		return new type(view, info.x, info.y, info.needsTouch, info.section, info.color, info.duration)
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
			"stage": this.view.stage.stageColor,
			"bg": this.view.stage.bgColor
		}[this.section]
		section.interpolate(this.color[0], this.color[1], this.color[2], this.duration)
	}
}
class Pad extends Tile {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, 1, 1, rotation, groups)
		this.timeout = 0
	}
	getRect() {
		return super.getRect().relative(0, 0, 1, 0.2)
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		if (this.timeout > 0) this.timeout -= amount
		super.tick(amount)
	}
	/**
	 * @param {Player} player
	 */
	collide(player) {
		if (this.timeout > 0) return
		var playerRect = player.getGeneralRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			this.enabled = true
			// Jumpy jumpy
			this.activate(player)
			this.timeout = 10
		}
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {}
}
class JumpPad extends Pad {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
		this.timeout = 0
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	<path d="M 0 20 Q 10 10 20 20 Z" fill="#FFC" />
	<path d="M 3 19 L 17 19 Q 10 14 3 19 Z" fill="#FF0" />
</svg>`
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {
		player.vy = 0.34 * player.gravity
	}
}
class SmallJumpPad extends Pad {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	<path d="M 0 20 Q 10 10 20 20 Z" fill="#FCF" />
	<path d="M 3 19 L 17 19 Q 10 14 3 19 Z" fill="#F0F" />
</svg>`
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {
		player.vy = 0.22 * player.gravity
	}
}
class GravityPad extends Pad {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, groups)
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	<path d="M 0 20 Q 10 10 20 20 Z" fill="#CFF" />
	<path d="M 3 19 L 17 19 Q 10 14 3 19 Z" fill="#0FF" />
</svg>`
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {
		if (this.rotation == 0) player.gravity = -1
		else if (this.rotation == 180) player.gravity = 1
		else player.gravity *= -1
		player.vy = player.gravity * -0.5
	}
}
class Portal extends Tile {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} realheight
	 * @param {number} rotation
	 * @param {number} dw
	 * @param {number} dh
	 * @param {string[]} groups
	 */
	constructor(view, x, y, dw, dh, realheight, rotation, groups) {
		super(view, x, y, dw, dh, rotation, groups)
		this.realheight = realheight
		if (debugMode) RectDisplay.create(this.view, this)
	}
	getRect() {
		return super.getRect().relative(0, (this.realheight * -0.5) + 0.5, 1, this.realheight);
	}
	/**
	 * @param {Player} player
	 */
	collide(player) {
		var playerRect = player.getGeneralRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// this.enabled = true
			this.activate(player)
		}
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {}
}
class GravityPortal extends Portal {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {number} gravity
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, gravity, groups) {
		super(view, x, y, 1, 2.57, 3, rotation, groups)
		this.gravity = gravity
	}
	/** @returns {string} */
	static getImage() {
		throw new Error("Aaaaa! There does not exist a color for this gravity portal!!!")
	}
	/**
	 * @param {string} colorLeft
	 * @param {string} colorRight
	 */
	static getImageTemplate(colorLeft, colorRight) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 18">
	<defs>
		<linearGradient id="mainGradient" gradientTransform="rotate(0)">
			<stop offset="0%" stop-color="${colorLeft}" />
			<stop offset="100%" stop-color="${colorRight}" />
		</linearGradient>
	</defs>
	<!-- Back ring -->
	<g>
		<path d="M 1 9 A 3 9 0 0 1 4 0 A 3 9 0 0 1 7 9 A 3 9 0 0 1 4 18 A 3 9 0 0 1 1 9 Z M 2 9 A 2 8 0 0 0 4 17 A 2 8 0 0 0 6 9 A 2 8 0 0 0 4 1 A 2 8 0 0 0 2 9 Z" fill="black" />
	</g>
	<!-- Front ring -->
	<g>
		<path d="M 0 9 A 3 9 0 0 1 3 0 A 3 9 0 0 1 6 9 A 3 9 0 0 1 3 18 A 3 9 0 0 1 0 9 Z M 1 9 A 2 8 0 0 0 3 17 A 2 8 0 0 0 5 9 A 2 8 0 0 0 3 1 A 2 8 0 0 0 1 9 Z" fill="url(#mainGradient)" />
	</g>
</svg>`
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {
		player.gravity = this.gravity;
	}
}
class GravityPortalDown extends GravityPortal {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, 1, groups)
	}
	static getImage() {
		return this.getImageTemplate("#94ffff", "#00b4ff")
	}
}
class GravityPortalUp extends GravityPortal {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, -1, groups)
	}
	static getImage() {
		return this.getImageTemplate("#fff9bd", "#ffe954")
	}
}
class GamemodePortal extends Portal {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {typeof GameMode} gamemode
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, gamemode, groups) {
		super(view, x, y, 1.4545, 3.2, 3, rotation, groups)
		/** @type {typeof GameMode} */
		this.mode = gamemode
	}
	/** @returns {string} */
	static getImage() {
		throw new Error("Aaaaa! There does not exist a color for this game mode portal!!!")
	}
	/**
	 * @param {string} colorLeft
	 * @param {string} colorRight
	 */
	static getImageTemplate(colorLeft, colorRight) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -2 10 22">
	<defs>
		<linearGradient id="mainGradient" gradientTransform="rotate(0)">
			<stop offset="0%" stop-color="${colorLeft}" />
			<stop offset="100%" stop-color="${colorRight}" />
		</linearGradient>
	</defs>
	<!-- Ring 2 -->
	<g>
		<path d="M 4 9 A 3 9 0 0 1 7 0 A 3 9 0 0 1 10 9 A 3 9 0 0 1 7 18 A 3 9 0 0 1 4 9 Z M 5 9 A 2 8 0 0 0 7 17 A 2 8 0 0 0 9 9 A 2 8 0 0 0 7 1 A 2 8 0 0 0 5 9 Z" fill="black" />
	</g>
	<!-- Ring 1 -->
	<g>
		<path d="M 2 9 A 3 9 0 0 1 5 0 A 3 9 0 0 1 8 9 A 3 9 0 0 1 5 18 A 3 9 0 0 1 2 9 Z M 3 9 A 2 8 0 0 0 5 17 A 2 8 0 0 0 7 9 A 2 8 0 0 0 5 1 A 2 8 0 0 0 3 9 Z" fill="black" />
	</g>
	<!-- Bars -->
	<g>
		<!-- Back bars -->
		<g>
			<rect x="1.5" y="2" width="4" height="1" fill="black" />
			<rect x="1" y="4" width="4" height="1" fill="black" />
			<rect x="1" y="6" width="4" height="1" fill="black" />
			<rect x="1" y="8" width="4" height="1" fill="black" />
			<rect x="1" y="10" width="4" height="1" fill="black" />
			<rect x="1" y="12" width="4" height="1" fill="black" />
			<rect x="1" y="14" width="4" height="1" fill="black" />
			<rect x="2" y="16" width="4" height="1" fill="black" />
		</g>
		<!-- Middle bars -->
		<g>
			<rect x="3" y="0" width="4" height="1" fill="black" />
			<rect x="3" y="17" width="4" height="1" fill="black" />
		</g>
		<!-- Front bars -->
		<g>
			<rect x="4.5" y="1.5" width="4" height="1.5" fill="black" />
			<rect x="5" y="4.1" width="4" height="1.5" fill="black" />
			<rect x="5" y="6.7" width="4" height="1.5" fill="black" />
			<rect x="5" y="9.3" width="4" height="1.5" fill="black" />
			<rect x="5" y="11.9" width="4" height="1.5" fill="black" />
			<rect x="4.5" y="14.5" width="4" height="1.5" fill="black" />
		</g>
	</g>
	<!-- Start ring -->
	<g>
		<path d="M 0 9 A 3 9 0 0 1 3 0 A 3 9 0 0 1 6 9 A 3 9 0 0 1 3 18 A 3 9 0 0 1 0 9 Z M 1 9 A 2 8 0 0 0 3 17 A 2 8 0 0 0 5 9 A 2 8 0 0 0 3 1 A 2 8 0 0 0 1 9 Z" fill="url(#mainGradient)" />
	</g>
	<!-- Bubbles -->
	<g>
		<circle cx="5.5" cy="-1" r="1" fill="url(#mainGradient)" />
		<circle cx="8" cy="5" r="1" fill="url(#mainGradient)" />
		<circle cx="8" cy="12" r="1" fill="url(#mainGradient)" />
		<circle cx="5.5" cy="19" r="1" fill="url(#mainGradient)" />
	</g>
</svg>`
	}
	/**
	 * @param {Player} player
	 */
	activate(player) {
		var newMode = new this.mode(player);
		player.mode = newMode;
	}
}
class CubePortal extends GamemodePortal {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, CubeMode, groups)
	}
	static getImage() {
		return this.getImageTemplate("#80ff9d", "#38ff63")
	}
}
class ShipPortal extends GamemodePortal {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, ShipMode, groups)
	}
	static getImage() {
		return this.getImageTemplate("#ff94bd", "#ff429d")
	}
}
class BallPortal extends GamemodePortal {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, BallMode, groups)
	}
	static getImage() {
		return this.getImageTemplate("#ff692b", "#ff4a00")
	}
}
class WavePortal extends GamemodePortal {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 * @param {string[]} groups
	 */
	constructor(view, x, y, rotation, groups) {
		super(view, x, y, rotation, WaveMode, groups)
	}
	static getImage() {
		return this.getImageTemplate("#00bcff", "#00aae8")
	}
}
class Key extends Tile {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {string[]} groups
	 */
	constructor(view, x, y, groups) {
		super(view, x, y, 1, 6/8, 0, groups)
		/** @type {number} */
		this.activation = 0
		/** @type {number} */
		this.vx = 0
		/** @type {number} */
		this.vy = 0
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 6">
	<path d="M 2 0 A 2 3 0 0 0 2 6 A 2 3 0 0 0 4 3.8 L 5.5 3.8 L 5.5 5.5 L 6.5 5.5 L 6.5 3.8 L 8 3.8 L 8 2.2 L 4 2.2 A 2 3 0 0 0 2 0 Z M 2 1.5 A 0.7 1 0 0 1 2 4.5 A 0.7 1 0 0 1 2 1.5 Z" fill="white" />
</svg>`
	}
	/**
	 * @param {View} view
	 * @param {typeof StartPosBlock} type
	 * @param {object} info
	 */
	static load(view, type, info) {
		// @ts-ignore
		return new type(view, info.x, info.y, info.groups)
	}
	/**
	 * @param {number[]} pos
	 */
	static default(pos) {
		return {
			x: pos[0],
			y: pos[1],
			groups: []
		}
	}
	save() {
		return {
			x: this.x,
			y: this.y,
			groups: []
		}
	}
	getEdit() {
		return [
			`<div><button onclick="editing.destroy(); view.tiles.splice(view.tiles.indexOf(editing), 1); deselect();">Remove Tile</button></div>`,
			`<div>X: <input type="number" value="${this.x}" min="0" oninput="editing.x = Math.round(this.valueAsNumber); editing.update();"></div>`,
			`<div>Y: <input type="number" value="${this.y}" min="0" oninput="editing.y = Math.round(this.valueAsNumber); editing.update();"></div>`
		]
	}
	/**
	 * @param {Player} player
	 */
	collide(player) {
		if (this.activation > 0) {
			return
		}
		var playerRect = player.getGeneralRect()
		var thisRect = this.getRect()
		if (playerRect.colliderect(thisRect)) {
			this.activation = 1
			this.vx = (Math.random() - 0.5) * 0.15
			this.vy = 0.2
			this.collect()
		}
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.extraStyles[3] = `opacity: ${map(this.activation, 0, 30, 1, 0)};`
		this.needsRedraw = true
		if (this.activation > 0) {
			if (this.activation < 30) {
				this.x += this.vx * amount
				this.y += this.vy * amount
				this.vy -= 0.02 * amount
				this.activation += amount
			}
		}
		super.tick(amount)
	}
	collect() {}
}
class ColorKey extends Key {
	/**
	 * @param {View} view
	 * @param {number} x
	 * @param {number} y
	 * @param {string[]} groups
	 */
	constructor(view, x, y, groups) {
		super(view, x, y, groups)
		/** @type {"red" | "green" | "blue"} */
		// @ts-ignore
		this.color = this.constructor.getColor()
		if (view instanceof GameView) view.stage.keys[this.color][1] += 1
		view.stage.updateMatrixValues()
	}
	static getImage() {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 6">
	<path d="M 2 0 A 2 3 0 0 0 2 6 A 2 3 0 0 0 4 3.8 L 5.5 3.8 L 5.5 5.5 L 6.5 5.5 L 6.5 3.8 L 8 3.8 L 8 2.2 L 4 2.2 A 2 3 0 0 0 2 0 Z M 2 1.5 A 0.7 1 0 0 1 2 4.5 A 0.7 1 0 0 1 2 1.5 Z" stroke="black" stroke-width="0.3" fill="${this.getColor()}" />
</svg>`
	}
	/** @returns {string} */
	static getColor() {
		throw new Error("You need to specify a color for the key")
	}
	collect() {
		view.stage.keys[this.color][0] += 1
		view.stage.updateMatrixValues()
	}
}
class RedKey extends ColorKey {
	/** @returns {string} */
	static getColor() {
		return "red"
	}
}
class GreenKey extends ColorKey {
	/** @returns {string} */
	static getColor() {
		return "green"
	}
}
class BlueKey extends ColorKey {
	/** @returns {string} */
	static getColor() {
		return "blue"
	}
}

class View {
	constructor() {
		this.stage = new Stage(this)
		/** @type {Tile[]} */
		this.tiles = []
		/** @type {Player | null} */
		this.player = null
	}
	/** @param {{ type: string, data: object }[]} o */
	importObjects(o) {
		var coin_no = 0
		for (var i = 0; i < o.length; i++) {
			var obj = o[i]
			var type = getObjectFromLocation("tile", obj.type.split("."))
			/** @type {Tile} */
			var c = type.load(this, type, obj.data)
			this.tiles.push(c)
			this.stageWidth = Math.max(this.stageWidth, c.x + 5)
			this.stageHeight = Math.max(this.stageHeight, c.y + 15)
			if (viewType == "editor") SceneItem.prototype.tick.call(c, 1)
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
		var t = this
		if (levelName == undefined) {
			levelName = "new_level.json"
			return
		}
		var x = new XMLHttpRequest()
		x.open("GET", "../levels/" + levelName)
		x.addEventListener("loadend", () => {
			var level = JSON.parse(x.responseText)
			levelMeta.completion = level.completion
			t.importObjects(level.objects)
			levelMeta.name = level.name
			levelMeta.description = level.description
			levelMeta.settings.colorbg = level.settings.colorbg
			levelMeta.settings.colorstage = level.settings.colorstage
			levelMeta.settings.gamemode = level.settings.gamemode
			levelMeta.settings.platformer = level.settings.platformer
			t.stage.reset()
			t.player = new Player(t)
		})
		x.send()
	}
	win() {}
}
class GameView extends View {
	constructor() {
		super()
		this.deathTime = 0
		/** @type {Particle[]} */
		this.particles = []
		this.isPressing = false
		this.isPressingLeft = false
		this.isPressingRight = false
		this.stageWidth = 0
		this.stageHeight = 0
		this.hasWon = false
		this.attempt = 0
		// Add event listeners
		var _v = this
		document.addEventListener("keydown", (e) => {
			if (e.key == " ") _v.isPressing = true
			if (e.key == "ArrowLeft") _v.isPressingLeft = true
			if (e.key == "ArrowRight") _v.isPressingRight = true
			if (e.key == "ArrowUp") _v.isPressing = true
		})
		document.addEventListener("keyup", (e) => {
			if (e.key == " ") _v.isPressing = false
			if (e.key == "ArrowLeft") _v.isPressingLeft = false
			if (e.key == "ArrowRight") _v.isPressingRight = false
			if (e.key == "ArrowUp") _v.isPressing = false
		})
		document.addEventListener("mousedown", (e) => {
			_v.isPressing = true
		})
		document.addEventListener("mouseup", (e) => {
			_v.isPressing = false
		})
		document.addEventListener("touchstart", (e) => {
			_v.handleTouches(e)
		})
		document.addEventListener("touchmove", (e) => {
			_v.handleTouches(e)
		})
		document.addEventListener("touchend", (e) => {
			_v.handleTouches(e)
		})
	}
	/**
	 * @param {TouchEvent} e
	 */
	handleTouches(e) {
		this.isPressingLeft = false
		this.isPressing = false
		this.isPressingRight = false
		for (var i = 0; i < e.touches.length; i++) {
			var t = e.touches[i]
			var a = Math.floor(t.clientX / (window.innerWidth / 4))
			if (a == 0) this.isPressingLeft = true
			else if (a == 1) this.isPressingRight = true
			else this.isPressing = true
		}
	}
	win() {
		this.hasWon = true
		this.player?.elm.remove()
		this.player = null
		this.particles.push(new LevelCompleteSign(this))
		this.sendVerification()
	}
	restart() {
		this.hasWon = false
		for (; this.particles.length > 0; ) {
			this.particles[0].destroy()
		}
		this.particles.push(new ProgressBar(this))
	}
	getCompletion() {
		if (this.player == null) return 0
		var pc = Math.floor((this.player.x / this.stageWidth) * 100)
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
	 * @type {any[] | null}
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
			"coin": Coin,
			"key": {
				"red": RedKey,
				"green": GreenKey,
				"blue": BlueKey
			}
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
		"gamemode": "cube",
		"platformer": false
	},
	"completion": {
		"percentage": 0,
		/** @type {boolean[]} */
		"coins": []
	}
}
// @ts-ignore
var debugMode = url_query.debug == "true"
