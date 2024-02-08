function splitPlayers() {
	var np = []
	for (; view.players.length > 0; view.players[0].destroy()) {
		var n = view.players[0].split();
		np.push(...n)
	}
	view.players.push(...np)
}
function collapsePlayers() {
	for (var i = 0; i < view.players.length; i++) {
		var p = view.players[i]
		var canDelete = view.players.some((v) => (v != p && v.sameAs(p)))
		if (canDelete) {
			p.elm.remove()
			view.players.splice(i, 1)
			i -= 1;
		}
	}
}
/**
 * @param {number} amount
 */
function frame(amount) {
	for (var i = 0; i < view.particles.length; i++) {
		view.particles[i].tick(amount)
	}
	view.stage.tick(amount);
	[...view.players].forEach((v) => v.tick(amount))
	for (var i = 0; i < view.tiles.length; i++) {
		view.tiles[i].tick(amount)
	}
	[...view.players].forEach((v) => v.finishTick(amount))
}
function winTick() {
	for (var i = 0; i < view.particles.length; i++) {
		view.particles[i].tick(1)
	}
	view.stage.tick(1)
}
function aFrames() {
	if (view.hasWon) return winTick()
	splitPlayers()
	var maxvy = Math.max(0, ...view.players.map((v) => Math.abs(v.vy)))
	var n_frames = Math.ceil(Math.abs(maxvy * 4) + 1)
	// view.particles.push(new RectDisplay(new Rect(view.player.x - 1, 0, 0.1, n_frames), "pink"))
	for (var i = 0; i < n_frames; i++) {
		if (view.hasWon) return winTick()
		frame(1 / n_frames)
	}
	collapsePlayers()
}
function setPlayerLimit() {
	while (view.players.length > 1000) {
		var r = Math.floor(Math.random() * view.players.length)
		view.players[r].destroy(Math.random() < 0.1)
	}
	if (view.particles.length > 1000) {
		var n = 0;
		for (var i = 0; i < 500; i++) {
			if (view.particles[n] instanceof ProgressBar) {
				n += 1;
				continue
			}
			view.particles[n].elm.remove()
			view.particles.splice(n, 1)
		}
	}
}
async function frameLoop() {
	try {
	while (true) {
		aFrames()
		setPlayerLimit()
		if (document.querySelector("#log")) document.querySelector("#log").innerText = view.players.length + " players; " + view.particles.length + " particles"
		// throw new Error("asdf")
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
	} catch (e) { alert(e) }
}
function setup() {
	frameLoop()
	view.particles.push(new ProgressBar())
}
setup()
/* window.addEventListener("touchstart", async () => {
	try {
		var log = document.querySelector("#log")
		if (log) log.innerText = "STARTED"
		await new Promise((resolve) => setTimeout(resolve, 100))
		aFrames()
		if (log) log.innerText = "ENDED " + view.players.length + " PLAYERS"
		await new Promise((resolve) => setTimeout(resolve, 100))
	} catch (e) {
		alert(e)
	}
}) */