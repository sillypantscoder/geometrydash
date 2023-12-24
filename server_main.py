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
	elif path == "/level_list":
		data = []
		for name in os.listdir("levels"):
			contents = json.loads(read_file("levels/" + name))
			data.append(contents)
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
		file = read_file("levels/" + data["level"]).decode("UTF-8")
		file = file.replace('"verified": [false]', '"verified": [true]')
		write_file("levels/" + data["level"], file)
		return {
			"status": 200,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": f""
		}
	else:
		return {
			"status": 404,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": f""
		}
