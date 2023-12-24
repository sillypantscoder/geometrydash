/** @type {Tile | null} */
var editing = null

function onclick(evt) {
	var pos = [
		Math.floor(evt.clientX / 20),
		Math.floor(((window.innerHeight * 0.60) - evt.clientY) / 20)
	]
	if (pos[1] < 0) return
	if (editing != null) deselect()
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
	} else if (selectedBlock == ".edit") {
		// Edit
		var tiles = []
		for (var i = 0; i < view.tiles.length; i++) {
			var tile = view.tiles[i]
			if (tile.x == pos[0] && tile.y == pos[1]) {
				tiles.push(tile)
			}
		}
		editTileList(tiles)
	} else {
		// Add new block
		var type = blockTypes[selectedBlock]
		var args = type.default(pos)
		/** @type {Tile} */
		var newTile = type.load(type, args)
		view.tiles.push(newTile)
		newTile.tick()
	}
}
document.querySelector("#scene").addEventListener("click", onclick);
/** @param {Tile} tile */
function editTile(tile) {
	if (editing != null) deselect()
	editing = tile
	// UI
	var parent = document.querySelector(".editing")
	parent.removeAttribute("style")
	parent.innerHTML = tile.getEdit().join("")
	tile.tick()
}
/** @param {Tile[]} tiles */
function editTileList(tiles) {
	if (editing != null) deselect()
	if (tiles.length == 0) return
	if (tiles.length == 1) return editTile(tiles[0])
	// UI
	var parent = document.querySelector(".editing")
	parent.removeAttribute("style")
	parent.innerHTML = `<div style="display: inline-block;">Select tile to edit:</div>`
	for (var i = 0; i < tiles.length; i++) {
		var e = document.createElement("div")
		e.setAttribute("style", `display: inline-block;`)
		e.innerHTML = `<div style="background: url(../assets/tile-${tiles[i].type_file}.svg); width: 1em; height: 1em; display: inline-block;"></div>`
		parent.appendChild(e)
		e._TileSource = tiles[i]
		e.setAttribute("onclick", "deselect(); editTile(this._TileSource)")
	}
}
function deselect() {
	if (editing != null) {
		var tile = editing
		editing = null
		tile.tick()
	}
	var parent = document.querySelector(".editing")
	parent.setAttribute("style", "display: none;")
}

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
			data: tile.save()
		})
	}
	return r
}
function exportLevel() {
	saveLevel().then((e) => {
		var r = getExport()
		var data = btoa(JSON.stringify(r))
		window.open("../game/index.html?level=" + e)
	})
}
function saveLevel() {
	return new Promise((resolve) => {
		var x = new XMLHttpRequest()
		x.open("POST", "/save")
		x.addEventListener("loadend", () => resolve(x.responseText))
		x.send(JSON.stringify({
			"name": levelName,
			"level": {
				"name": "",
				"description": "",
				"objects": getExport(),
				"verified": [false],
				"deleted": false
			}
		}))
	})
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
