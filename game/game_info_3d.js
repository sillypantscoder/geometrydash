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



class Object3D {
	constructor() {}
	add() {}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	setPos(x, y) {}
	/**
	 * @param {number} r
	 */
	setRotation(r) {}
	remove() {}
}
class Cuboid extends Object3D {
	/**
	 * @param {number[]} pos
	 * @param {number[]} size
	 * @param {number[]} color
	 */
	constructor(pos, size, color) {
		super()
		this.geometry = new THREE.BoxGeometry( ...size );
		this.geometry.translate(...pos);
		this.material = new THREE.MeshPhongMaterial( { color: (0x010000*color[0])+(0x000100*color[1])+(0x000001*color[2]) } );
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		this.previousRotation = 0
	}
	add() {
		if (view) view.scene.add( this.mesh );
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	setPos(x, y) {
		this.mesh.position.set(x, y, 0);
		// this.mesh.position.x = x
		// this.mesh.position.y = y
	}
	/**
	 * @param {number} r
	 */
	setRotation(r) {
		var newR = (r + (this.previousRotation * 1)) / 2
		this.previousRotation = newR
		this.mesh.rotation.z = (Math.PI / -180) * newR
	}
	remove() {
		view.scene.remove( this.mesh )
	}
}
class CuboidOutline extends Object3D {
	/**
	 * @param {number[]} pos
	 * @param {number[]} size
	 * @param {number[]} color
	 */
	constructor(pos, size, color) {
		super()
		this.geometry = new THREE.BoxGeometry( ...size );
		this.geometry.translate(...pos);
		this.material = new THREE.LineBasicMaterial( { color: (0x010000*color[0])+(0x000100*color[1])+(0x000001*color[2]), linewidth: 1 } );
		this.mesh = new THREE.LineSegments( new THREE.EdgesGeometry(this.geometry), this.material );
		this.previousRotation = 0
	}
	add() {
		if (view) view.scene.add( this.mesh );
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	setPos(x, y) {
		this.mesh.position.set(x, y, 0);
		// this.mesh.position.x = x
		// this.mesh.position.y = y
	}
	/**
	 * @param {number} r
	 */
	setRotation(r) {
		var newR = (r + (this.previousRotation * 1)) / 2
		this.previousRotation = newR
		this.mesh.rotation.z = (Math.PI / -180) * newR
	}
	remove() {
		view.scene.remove( this.mesh )
	}
}
class CuboidWithOutline extends Object3D {
	/**
	 * @param {number[]} pos
	 * @param {number[]} size
	 * @param {number[]} color
	 */
	constructor(pos, size, color) {
		super()
		this.size = size
		this.cuboid = new Cuboid(pos, size, color)
		this.cuboidOutline = new CuboidOutline(pos, size, [
			color[0] / 2,
			color[1] / 2,
			color[2] / 2
		])
	}
	add() {
		this.cuboid.add()
		this.cuboidOutline.add()
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	setPos(x, y) {
		this.cuboid.setPos(x, y)
		this.cuboidOutline.setPos(x, y)
	}
	/**
	 * @param {number} r
	 */
	setRotation(r) {
		this.cuboid.setRotation(r)
		this.cuboidOutline.setRotation(r)
	}
	remove() {
		this.cuboid.remove()
		this.cuboidOutline.remove()
	}
}
class Cone extends Object3D {
	/**
	 * @param {number[]} pos
	 * @param {number} rad
	 * @param {number} h
	 * @param {number[]} color
	 */
	constructor(pos, rad, h, color) {
		super()
		this.geometry = new THREE.ConeGeometry( rad, h, 7 );
		this.geometry.translate(...pos);
		this.geometry.translate(rad / -2, 0, rad / -2);
		this.material = new THREE.MeshPhongMaterial( { color: (0x010000*color[0])+(0x000100*color[1])+(0x000001*color[2]) } );
		this.mesh = new THREE.Mesh( this.geometry, this.material );
	}
	add() {
		if (view) view.scene.add( this.mesh );
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	setPos(x, y) {
		this.mesh.position.set(x, y, 0);
	}
	/**
	 * @param {number} r
	 */
	setRotation(r) {
		this.mesh.rotation.z = (Math.PI / -180) * r
	}
	remove() {
		view.scene.remove( this.mesh )
	}
}
class Sphere extends Object3D {
	/**
	 * @param {number[]} pos
	 * @param {number} rad
	 * @param {number[]} color
	 */
	constructor(pos, rad, color) {
		super()
		this.geometry = new THREE.SphereGeometry( rad, 32, 16 );
		this.geometry.translate(...pos);
		this.material = new THREE.MeshPhongMaterial( { color: (0x010000*color[0])+(0x000100*color[1])+(0x000001*color[2]) } );
		this.mesh = new THREE.Mesh( this.geometry, this.material );
	}
	add() {
		if (view) view.scene.add( this.mesh );
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	setPos(x, y) {
		this.mesh.position.set(x, y, 0);
	}
	/**
	 * @param {number} r
	 */
	setRotation(r) {
		this.mesh.rotation.z = (Math.PI / -180) * r
	}
	remove() {
		view.scene.remove( this.mesh )
	}
}

class SceneItem {
	/**
	 * @param {number} x The starting X position.
	 * @param {number} y The starting Y position.
	 * @param {Object3D[]} objects
	 */
	constructor(x, y, objects) {
		/** @type {number} */
		this.x = x
		/** @type {number} */
		this.y = y
		/** @type {number} */
		this.rotation = 0
		/** @type {Object3D[]} */
		this.objects = objects
		this.objects.forEach((e) => e.add())
		this.objects.forEach((e) => e.setPos(this.x, this.y), this)
	}
	add() {
		this.objects.forEach((e) => e.add())
		this.objects.forEach((e) => e.setPos(this.x, this.y), this)
	}
	/**
	 * @param {number} _amount
	 */
	tick(_amount) {
		this.objects.forEach((e) => e.setPos(this.x, this.y), this)
		this.objects.forEach((e) => e.setRotation(this.rotation), this)
	}
	destroy() {
		this.objects.forEach((e) => e.remove())
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
		var e = new CuboidWithOutline([(view.stageWidth / 2) - 1.8, -1.5, 0], [view.stageWidth + 5, 2, 1], [0, 125, 255])
		super(0, 0, [e])
		this.bgColor = InterpolatedColor.fromRGB(levelMeta.settings.colorbg)
		this.stageColor = InterpolatedColor.fromRGB(levelMeta.settings.colorstage)
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		this.bgColor.tick(amount)
		this.stageColor.tick(amount)
		if (view.controls) {
			view.controls.target.x = view.player.x
			view.controls.target.y = view.player.y + 3
			view.controls.target.z = 15
		} else {
			view.camera.position.x = view.player.x
			view.camera.position.y = view.player.y + 3
			view.camera.position.z = 15
			view.camera.lookAt(view.player.obj.cuboid.mesh.position)
		}
		view.cameraLight.position.copy(view.camera.position);
		view.cameraLight.target.position.copy(view.player.obj.cuboid.mesh.position);
		// TODO: Background color update
		// TODO: Stage color update
	}
	reset() {
		this.bgColor = InterpolatedColor.fromRGB(levelMeta.settings.colorbg)
		this.stageColor = InterpolatedColor.fromRGB(levelMeta.settings.colorstage)
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
		var obj = new CuboidWithOutline([0, 0, 0], [1, 1, 1], [0, 255, 33])
		super(-1000, 0, [obj])
		/** @type {number} */
		this.vy = 0
		/** @type {boolean} */
		this.onGround = false
		/** @type {null | (() => void)} */
		this.specialJump = null
		/** @type {number} */
		this.deathTime = 1
		/** @type {number} */
		this.gravity = 1
		/** @type {GameMode} */
		this.mode = new CubeMode(this);
		/** @type {CuboidWithOutline} */
		this.obj = obj
	}
	getRect() {
		return this.mode.getRect()
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		// console.log(1, this.x, this.y, this.vy)
		if (this.deathTime > 0) {
			if (this.x != -1000) this.deathTime -= 1
			if (this.deathTime == 0) {
				this.respawn()
			}
			return
		}
		// Move forwards
		// console.log(2, this.x, this.y, this.vy)
		this.x += levelMeta.settings.speed * 0.01 * amount
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
		this.obj.setRotation(this.rotation)
		// TODO: Set extra styles `transform: scaleY(${this.gravity});`
		super.tick(amount)
	}
	/**
	 * @param {number} amount
	 */
	finishTick(amount) {
		if (this.deathTime > 0) return
		if (this.onGround) {
			if (this.gravity < 0) {
				if (this.vy > 0) this.vy = 0
			} else {
				if (this.vy < 0) this.vy = 0
			}
		}
		this.mode.checkJump(amount)
		if (this.x > view.stageWidth) view.win()
	}
	destroy() {
		this.deathTime = 40
		super.destroy()
		// view.particles.push(new DeathParticleMain(this.x + 0.5, this.y + 0.5))
		// for (var i = 0; i < 20; i++) {
		// 	view.particles.push(new DeathParticleExtra(this.x + 0.5, this.y + 0.5))
		// }
		view.sendVerification()
	}
	respawn() {
		this.add()
		this.setStartMode()
		this.x = -3
		this.y = 0
		this.vy = 0
		this.gravity = 1
		view.stage.reset()
		this.setStartPos()
		view.attempt += 1
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
		if (this.player.y > 40) {
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
		view.player.destroy()
	}
}
class CubeMode extends GameMode {
	/**
	 * @param {number} amount
	 */
	checkJump(amount) {
		if (this.player.onGround) {
			this.player.rotation = (Math.floor((this.player.rotation - 45) / 90) * 90) + 90
			// if (this.player.gravity < 0) {
			// 	view.particles.push(new SlideParticle(this.player.x, this.player.y + 1))
			// } else {
			// 	view.particles.push(new SlideParticle(this.player.x, this.player.y))
			// }
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
	/**
	 * @param {number} _amount
	 */
	gravity(_amount) {}
	/**
	 * @param {number} _amount
	 */
	checkJump(_amount) {
		this.player.rotation = this.player.vy * -100
		// view.particles.push(new SlideParticle(this.player.x + 0.05, this.player.y + 0.2))
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
	 * @param {number} amount
	 */
	checkJump(amount) {
		this.player.rotation += 10 * amount * this.player.gravity
		if (this.player.onGround || this.player.y == 14) {
			// if (this.player.gravity < 0) {
			// 	view.particles.push(new SlideParticle(this.player.x + 0.3, this.player.y + 1))
			// } else {
			// 	view.particles.push(new SlideParticle(this.player.x + 0.3, this.player.y))
			// }
		}
		if (view.isPressing) {
			if (this.player.specialJump != null) {
				this.player.specialJump()
			} else if (this.player.onGround) {
				this.player.gravity *= -1
				view.isPressing = false
			}
		}
	}
}
class WaveMode extends GameMode {
	/**
	 * @param {number} _amount
	 */
	gravity(_amount) {}
	/**
	 * @param {number} _amount
	 */
	checkJump(_amount) {
		this.player.rotation = this.player.vy * -450
		// view.particles.push(new WaveParticle(this.player.x, this.player.y + 0.5 + (-1 * this.player.vy)))
		if (view.isPressing) {
			this.player.vy = 0.1 * this.player.gravity
		} else {
			this.player.vy = -0.1 * this.player.gravity
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
class Particle extends SceneItem {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {Object3D[]} objects
	 */
	constructor(x, y, objects) {
		super(x, y, objects)
	}
	destroy() {
		super.destroy()
		view.particles.splice(view.particles.indexOf(this), 1)
	}
}
/*class DeathParticleMain extends Particle {
	/**
	 * @param {number} x
	 * @param {number} y
	 * /
	constructor(x, y) {
		super(x, y, [])
		// sphere color=0, 255, 85
		this.size = 1
	}
	/**
	 * @param {number} amount
	 * /
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
	 * /
	constructor(x, y) {
		super(x, y)
		this.vx = (Math.random() - 0.5) / 3
		this.vy = (Math.random() - 0.5) / 3
		this.size = 1
	}
	/**
	 * @param {number} amount
	 * /
	tick(amount) {
		this.size += 0.2 * amount
		this.x += this.vx * amount
		this.y += this.vy * amount
		this.extraStyles[1] = `opacity: ${map(this.size, 1, 5, 1, 0)};`
		super.tick(amount)
		if (this.size >= 5) this.destroy()
	}
}*/
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
		super(x, y, [])
		var _o = this.objects
		get3DFromObject(this).then((i) => {
			for (var n = 0; n < i.length; n++) {
				_o.push(i[n])
				i[n].add()
			}
		})
		this.display_size = [dw, dh]
		this.rotation = rotation
		this.groups = groups
		// this.enabled = false
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
		this.collide()
		super.tick(amount)
	}
	collide() {}
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
				// this.enabled = true
			} else if (thisRect.y + 0.5 > playerRect.y + playerRect.h) {
				view.player.mode.hitCeiling(thisRect.y - playerRect.h)
				// this.enabled = true
			} else {
				view.player.destroy()
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
	collide() {
		var playerRect = view.player.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			// Player dies!
			view.player.destroy()
			this.enabled = true
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
		this.timeout = 0
	}
	/**
	 * @param {number} amount
	 */
	tick(amount) {
		if (this.timeout > 0) this.timeout -= amount
		super.tick(amount)
	}
	collide() {
		if (this.timeout > 0) return
		var playerRect = view.player.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			this.enabled = true
			// Jumpy jumpy
			var target = this
			view.player.specialJump = () => {
				target.timeout = 10
				target.activate()
			}
		}
	}
	activate() {}
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
	activate() {
		view.player.vy = 0.34 * view.player.gravity
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
	activate() {
		view.player.gravity *= -1
		view.player.vy = view.player.gravity * -0.5
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
	activate() {
		view.player.vy += view.player.gravity * -0.7
	}
}
class StartPosBlock extends Tile {
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(x, y) {
		super(x, y, 1, 1, 0, [])
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
	collide() {
		if (this.timeout > 0) return
		var playerRect = view.player.getRect()
		var thisRect = this.getRect().rotate(this.rotation, this.x + 0.5, this.y + 0.5)
		if (playerRect.colliderect(thisRect)) {
			this.enabled = true
			// Jumpy jumpy
			this.activate()
			this.timeout = 10
		}
	}
	activate() {}
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
		this.timeout = 0
	}
	activate() {
		view.player.vy = 0.34 * view.player.gravity
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
	activate() {
		view.player.vy = 0.22 * view.player.gravity
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
	activate() {
		if (this.rotation == 0) view.player.gravity = -1
		else if (this.rotation == 180) view.player.gravity = 1
		else view.player.gravity *= -1
		view.player.vy = view.player.gravity * -0.5
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
	}
	getRect() {
		return super.getRect().relative(0, (this.realheight * -0.5) + 0.5, 1, this.realheight);
	}
	collide() {
		var playerRect = view.player.getRect()
		var thisRect = this.getRect()
		if (playerRect.colliderect(thisRect)) {
			this.enabled = true
			this.activate()
		}
	}
	activate() {}
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
	activate() {
		view.player.gravity = this.gravity;
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
	activate() {
		var newMode = new this.mode(view.player);
		view.player.mode = newMode;
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
		this.stage = null
		/** @type {Tile[]} */
		this.tiles = []
	}
	/** @param {{ type: string, data: object }[]} o */
	importObjects(o) {
		for (var i = 0; i < o.length; i++) {
			var obj = o[i]
			var type = getObjectFromLocation("tile", obj.type.split("."))
			if (type == undefined) continue
			/** @type {Tile} */
			var c = type.load(type, obj.data)
			this.tiles.push(c)
			this.stageWidth = Math.max(this.stageWidth, c.x + 5)
		}
		this.stage = new Stage()
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
			levelMeta.completion = level.completion
			view.importObjects(level.objects)
			levelMeta.name = level.name
			levelMeta.description = level.description
			levelMeta.settings.colorbg = level.settings.colorbg
			levelMeta.settings.colorstage = level.settings.colorstage
			levelMeta.settings.gamemode = level.settings.gamemode
			levelMeta.settings.speed = level.settings.speed
			if (view instanceof GameView) view.player.setStartMode()
			view.stage.reset()
			if (view.player) view.player.x = -999
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
		this.attempt = 0
		// 3D setup
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 500 );
		this.scene.add( this.camera );
		this.scene.background = new THREE.Color( 0xFFFFFF );
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.cameraLight = this.addLight()
		document.querySelector("#scene").appendChild( this.renderer.domElement );
		/** @type {undefined | { update: () => void, target: { x: number, y: number, z: number } }} */
		this.controls = undefined
		// this.addControls();
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
	addLight() {
		// Add light
		var color = 0xFFFFFF;
		var intensity = 1;
		var light = new THREE.DirectionalLight(color, intensity);
		light.position.set(-5, 5, 2.5);
		light.target.position.set(0, 0, 0);
		this.scene.add(light);
		this.scene.add(light.target);
		// Add more light
		var color = 0xFFFFFF;
		var intensity = 0.1;
		var light2 = new THREE.AmbientLight(color, intensity);
		this.scene.add(light2);
		return light
	}
	addControls() {
		this.camera.position.x = 10
		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
	}
	win() {
		this.hasWon = true
		this.sendVerification()
	}
	restart() {
		this.hasWon = false
		this.player.deathTime = 1
		for (; this.particles.length > 0; ) {
			this.particles[0].destroy()
		}
	}
	getCompletion() {
		var pc = Math.floor((this.player.x / this.stageWidth) * 100)
		if (pc < 0) return 0
		if (pc > 100) return 100
		return pc
	}
	sendVerification() {
		var amount = this.getCompletion()
		levelMeta.completion.percentage = Math.max(levelMeta.completion.percentage, amount)
		var x = new XMLHttpRequest()
		x.open("POST", "../verify")
		x.send(JSON.stringify({
			level: levelName,
			completion: amount,
			coins: []
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

/**
 * @param {Tile} obj
 * @returns {Promise<Object3D[]>}
 */
function get3DFromObject(obj) {
	var location = getLocationFromObject("tile", obj)
	return new Promise((resolve) => {
		var x = new XMLHttpRequest()
		x.open("GET", "../assets/tile3d/" + location.join("/") + ".json")
		x.addEventListener("loadend", () => {
			var res = JSON.parse(x.responseText)
			resolve(jsonToObjects(res))
		})
		x.send()
	})
}
/**
 * @param {any} data
 * @returns {Object3D[]}
 */
function jsonToObjects(data) {
	var o = []
	for (var i = 0; i < data.length; i++) {
		if (data[i]["type"] == "cuboid") {
			o.push(new Cuboid(data[i]["pos"], data[i]["size"], data[i]["color"]))
		} else if (data[i]["type"] == "cuboid-outline") {
			o.push(new CuboidOutline(data[i]["pos"], data[i]["size"], data[i]["color"]))
		} else if (data[i]["type"] == "cone") {
			o.push(new Cone(data[i]["pos"], data[i]["rad"], data[i]["height"], data[i]["color"]))
		} else if (data[i]["type"] == "sphere") {
			o.push(new Sphere(data[i]["pos"], data[i]["rad"], data[i]["color"]))
		}
	}
	return o
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
			"start-pos": StartPosBlock
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
		"speed": 15
	},
	"completion": {
		"percentage": 0,
		/** @type {boolean[]} */
		"coins": []
	}
}
var view = new GameView();
view.loadLevel()
