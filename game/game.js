function frame() {
	for (var i = 0; i < view.particles.length; i++) {
		view.particles[i].tick()
	}
	view.stage.tick()
	view.player.tick()
	if (view.player.deathTime == 0) {
		for (var i = 0; i < view.tiles.length; i++) {
			view.tiles[i].tick()
		}
	}
	view.player.finishTick()
}
async function frameLoop() {
	while (true) {
		frame()
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}
frameLoop()