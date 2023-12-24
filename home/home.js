var x = new XMLHttpRequest()
x.open("GET", "/level_list")
x.addEventListener("loadend", () => {
	var levels = JSON.parse(x.responseText)
	for (var i = 0; i < levels.length; i++) {
		var e = document.createElement("div")
		document.body.appendChild(e)
		e.classList.add("area")
		e.innerHTML = `<div class="level-title"></div><div>Verified: ${levels[i].contents.verified[0] ? "Yes" : "No"}</div><div></div><div><a><img src="../assets/ui/LevelStart.svg"></a><a><img src="../assets/ui/LevelEdit.svg"></a></div>`
		e.children[0].innerText = levels[i].contents.name
		e.children[2].innerText = levels[i].contents.description
		e.children[3].children[0].setAttribute("href", `../game/index.html?level=${levels[i].name}`)
		e.children[3].children[1].setAttribute("href", `../editor/index.html?level=${levels[i].name}`)
	}
})
x.send()