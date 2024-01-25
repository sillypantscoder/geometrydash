/**
 * @param {number} amount
 */
function frame(amount) {
	for (var i = 0; i < view.particles.length; i++) {
		view.particles[i].tick(amount)
	}
	view.stage.tick(amount)
	view.player.tick(amount)
	if (view.player.deathTime == 0) {
		for (var i = 0; i < view.tiles.length; i++) {
			view.tiles[i].tick(amount)
		}
	}
	view.player.finishTick(amount)
}
function winTick() {
	for (var i = 0; i < view.particles.length; i++) {
		view.particles[i].tick(1)
	}
	view.stage.tick(1)
}
function aFrames() {
	if (view.hasWon) return winTick()
	var n_frames = Math.ceil(Math.abs(view.player.vy * 4) + 1)
	// view.particles.push(new RectDisplay(new Rect(view.player.x - 1, 0, 0.1, n_frames), "pink"))
	for (var i = 0; i < n_frames; i++) {
		if (view.hasWon) return winTick()
		frame(1 / n_frames)
	}
}
async function frameLoop() {
	while (true) {
		aFrames()
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}
function setup() {
	frameLoop()
	view.particles.push(new ProgressBar())
}
setup()