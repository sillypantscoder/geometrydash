import typing
import os
import json

def read_file(filename: str) -> bytes:
	f = open(filename, "rb")
	t = f.read()
	f.close()
	return t

def write_file(filename: str, content: str):
	f = open(filename, "w")
	f.write(content)
	f.close()

def format_level(t: dict[str, typing.Any]):
	def format_o(o: dict[str, typing.Any]):
		keys: list[str] = [*o["data"].keys()]
		data = [f"""\"{k}\": {json.dumps(o["data"][k])}""" for k in keys]
		return f"""{{"type": "{o["type"]}", "data": {{{', '.join(data)}}}}}"""
	objects = ',\n'.join([
		format_o(o)
		for o in t["objects"]
	]).replace("\n", "\n\t\t")
	result = f"""{{
	"name": {json.dumps(t["name"])},
	"description": {json.dumps(t["description"])},
	"settings": {{
		"colorbg": {json.dumps(t["settings"]["colorbg"])},
		"colorstage": {json.dumps(t["settings"]["colorstage"])},
		"gamemode": {json.dumps(t["settings"]["gamemode"])},
		"platformer": {json.dumps(t["settings"]["platformer"])}
	}},
	"objects": [
		{objects}
	],
	"completion": {{
		"percentage": {json.dumps(t["completion"]["percentage"])},
		"coins": {json.dumps(t["completion"]["coins"])}
	}},
	"deleted": {json.dumps(t["deleted"])}
}}"""
	return result

def delete_file(name: str):
	data = json.loads(read_file("levels/" + name))
	data["deleted"] = True
	write_file("levels/" + name, format_level(data))

class HttpResponse(typing.TypedDict):
	status: int
	headers: dict[str, str]
	content: str | bytes

def get(path: str) -> HttpResponse:
	qpath = path.split("?")[0]
	if qpath == "/":
		return {
			"status": 200,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": read_file("index.html")
		}
	elif (qpath.startswith("/assets/") or qpath.startswith("/common/") or qpath.startswith("/editor/") or qpath.startswith("/game/") or qpath.startswith("/home/") or qpath.startswith("/levels/")) and os.path.exists("." + qpath):
		return {
			"status": 200,
			"headers": {
				"Content-Type": {
					"html": "text/html",
					"js": "text/javascript",
					"css": "text/css",
					"svg": "image/svg+xml",
					"png": "image/png",
					"json": "application/json"
				}[qpath.split(".")[-1]]
			},
			"content": read_file(qpath[1:])
		}
	elif path == "/level_list/published":
		data: list[dict[str, typing.Any]] = []
		for name in os.listdir("levels/published"):
			contents = json.loads(read_file("levels/published/" + name))
			if contents["deleted"] == True: continue
			data.append({
				"name": name,
				"contents": contents
			})
		return {
			"status": 200,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": json.dumps(data)
		}
	elif path == "/level_list/user":
		data = []
		for name in os.listdir("levels/user"):
			contents = json.loads(read_file("levels/user/" + name))
			if contents["deleted"] == True: continue
			data.append({
				"name": name,
				"contents": contents
			})
		return {
			"status": 200,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": json.dumps(data)
		}
	else: # 404 page
		return {
			"status": 404,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": f""
		}

def post(path: str, body: bytes) -> HttpResponse:
	if path == "/verify":
		data = json.loads(body)
		file = json.loads(read_file("levels/" + data["level"]).decode("UTF-8"))
		file["completion"]["percentage"] = max(file["completion"]["percentage"], data["completion"])
		if data["completion"] == 100:
			for i in range(len(file["completion"]["coins"])):
				file["completion"]["coins"][i] = file["completion"]["coins"][i] or data["coins"][i]
		write_file("levels/" + data["level"], format_level(file))
		return {
			"status": 200,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": f""
		}
	elif path == "/save_user":
		data = json.loads(body)
		formatted = format_level(data["level"])
		name: str = data["name"].replace("user/", "")
		write_file("levels/user/" + name, formatted)
		return {
			"status": 200,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": name
		}
	elif path == "/publish":
		data = json.loads(body)
		formatted = format_level(data["level"])
		name: str = data["name"].replace("user/", "")
		while os.path.exists("levels/published/" + name):
			delete_file(name)
			name = name.replace(".json", "_.json")
		write_file("levels/published/" + name, formatted)
		return {
			"status": 200,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": name
		}
	else:
		return {
			"status": 404,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": f""
		}
