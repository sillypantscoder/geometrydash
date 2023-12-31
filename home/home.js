var x = new XMLHttpRequest()
x.open("GET", "/level_list")
x.addEventListener("loadend", () => {
	var levels = JSON.parse(x.responseText)
	for (var i = 0; i < levels.length; i++) {
		var cts = levels[i].contents
		var e = document.createElement("div")
		document.body.appendChild(e)
		e.classList.add("area")
		var v = cts.completion.percentage
		e.innerHTML = `<div class="level-title"></div><div>Verified: ${v==100 ? "Yes" : (v==0 ? "No" : `No (${v}%)`)}</div><div>Coins: ${cts.completion.coins.length > 0 ? cts.completion.coins.map((v) => ["[Unverified]", "[Verified]"][v * 1]) : "None"}</div><div></div><div><a><img src="../assets/ui/LevelStart.svg"></a><a><img src="../assets/ui/LevelEdit.svg"></a></div>`
		e.children[0].innerText = cts.name
		e.children[3].innerText = cts.description
		e.children[4].children[0].setAttribute("href", `../game/index.html?level=${levels[i].name}`)
		e.children[4].children[1].setAttribute("href", `../editor/index.html?level=${levels[i].name}`)
	}
	// New Level button
	var e = document.createElement("div")
	document.body.appendChild(e)
	e.classList.add("area")
	e.innerHTML = `<div>Create a new level: </div><div><a href="../editor/index.html"><img src="../assets/ui/LevelEdit.svg"></a></div>`
})
x.send()