function onclick(evt) {
	var pos = [
		Math.floor(evt.clientX / 20),
		Math.floor(((window.innerHeight * 0.75) - evt.clientY) / 20)
	]
	if (pos[1] < 0) return
	var selectedBlock = document.querySelector(".option-element-selected").dataset.value
	if (selectedBlock == ".eraser") {
		// Remove
		for (var i = 0; i < view.tiles.length; i++) {
			var tile = view.tiles[i]
			if (tile.x == pos[0] && tile.y == pos[1]) {
				tile.destroy()
				view.tiles.splice(i, 1)
				i -= 1;
			}
		}
	} else if (selectedBlock == ".rotate") {
		// Rotate
		for (var i = 0; i < view.tiles.length; i++) {
			var tile = view.tiles[i]
			if (tile.x == pos[0] && tile.y == pos[1]) {
				tile.rotation = (tile.rotation + 90) % 360
				tile.tick()
			}
		}
	} else {
		// Remove old block
		for (var i = 0; i < view.tiles.length; i++) {
			var tile = view.tiles[i]
			if (tile.x == pos[0] && tile.y == pos[1]) {
				tile.destroy()
				view.tiles.splice(i, 1)
				i -= 1;
			}
		}
		// Add new block
		var type = blockTypes[selectedBlock]
		/** @type {Tile} */
		var newTile = new type(pos[0], pos[1], 0)
		view.tiles.push(newTile)
		newTile.tick()
	}
}
document.querySelector("#scene").addEventListener("click", onclick);

var debug = false
function getExport() {
	var r = []
	var map = Object.entries(blockTypes)
	var values = map.map((v) => v[1])
	var keys = map.map((v) => v[0])
	for (var i = 0; i < view.tiles.length; i++) {
		var tile = view.tiles[i]
		var type = keys[values.findIndex((v) => tile instanceof v)]
		r.push({
			type,
			x: tile.x,
			y: tile.y,
			rotation: tile.rotation
		})
	}
	return r
}
function exportLevel() {
	var r = getExport()
	var data = btoa(JSON.stringify(r))
	window.open("../game/index.html?objects=" + data)
}
function saveLevel() {
	var r = getExport()
	var data = btoa(JSON.stringify(r))
	location.search = "?objects=" + data
}

(() => {
	document.querySelector("#blocks").addEventListener("click", () => {
		document.querySelector('.option-element-selected').classList.remove('option-element-selected');
	}, true)
	var k = Object.keys(blockTypes)
	for (var i = 0; i < k.length; i++) {
		var e = document.createElement("span")
		e.classList.add("option-element")
		e.setAttribute("onclick", `this.classList.add("option-element-selected")`)
		e.innerHTML = `<div style="background: url(../assets/tile-${k[i]}.svg); width: 1em; height: 1em; display: inline-block;"></div>`
		e.dataset.value = k[i]
		document.querySelector("#blocks").appendChild(e)
	}
})();
