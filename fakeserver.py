import typing
import os
import json
import sys
import base64

class URLQuery:
	def __init__(self, q):
		self.orig = q
		self.fields = {}
		for f in q.split("&"):
			s = f.split("=")
			if len(s) >= 2:
				self.fields[s[0]] = s[1]
	def get(self, key):
		if key in self.fields:
			return self.fields[key]
		else:
			return ''

def read_file(filename: str) -> bytes:
	"""Read a file and return the contents."""
	f = open(filename, "rb")
	t = f.read()
	f.close()
	return t

def write_file(filename: str, content: bytes):
	"""Write data to a file."""
	f = open(filename, "wb")
	f.write(content)
	f.close()

class HttpResponse(typing.TypedDict):
	"""A dict containing an HTTP response."""
	status: int
	headers: dict[str, str]
	content: str | bytes

def get(path: str, query: URLQuery) -> HttpResponse:
	if path == "/":
		return {
			"status": 200,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": read_file("index.html")
		}
	elif os.path.isfile("."+path):
		return {
			"status": 200,
			"headers": {
				"Content-Type": {
					"html": "text/html",
					"js": "text/javascript",
					"css": "text/css",
					"svg": "image/svg+xml",
					"png": "image/png"
				}[path.split(".")[-1]]
			},
			"content": read_file(path[1:])
		}
	else: # 404 page
		print("404 GET " + path, file=sys.stderr)
		return {
			"status": 404,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": ""
		}

def post(path: str, body: str) -> HttpResponse:
	bodydata = body.split("\n")
	if path.startswith("/edit"):
		setname = path[6:]
		setdata = json.loads(body)
		if os.path.exists("sets/" + setname + ".json"): return {
			"status": 404,
			"headers": {},
			"content": f""
		}
		write_file("sets/" + setname + ".json", json.dumps(setdata, indent='\t').encode("UTF-8"))
		return {
			"status": 200,
			"headers": {},
			"content": f""
		}
	if path.startswith("/delete"):
		setname = path[8:]
		if not os.path.exists("sets/" + setname + ".json"): return {
			"status": 404,
			"headers": {},
			"content": f""
		}
		setdata = json.loads(read_file("sets/" + setname + ".json"))
		setdata["deleted"] = True
		write_file("sets/" + setname + ".json", json.dumps(setdata, indent='\t').encode("UTF-8"))
		return {
			"status": 200,
			"headers": {},
			"content": f""
		}
	else:
		print("404 POST " + path, file=sys.stderr)
		return {
			"status": 404,
			"headers": {
				"Content-Type": "text/html"
			},
			"content": ""
		}

class MyServer:
	def handle_request(self):
		r = json.loads(input())
		res: HttpResponse = {
			"status": 404,
			"headers": {},
			"content": b""
		}
		if r["method"] == "GET":
			res = self.do_GET(r["path"])
		if r["method"] == "POST":
			res = self.do_POST(r["path"], r["body"])
		s: list[bytes | str] = [
			str(res["status"]).encode("UTF-8"),
			",".join([f"{a}:{b}" for a, b in res["headers"].items()]).encode("UTF-8"),
			res["content"]
		]
		for data in s:
			self.send_packet(data)
			# time.sleep(0.3)
	def send_packet(self, info: bytes | str):
		try: info = info.decode("UTF-8") # type: ignore
		except: pass
		if isinstance(info, str):
			sys.stdout.buffer.write(str(len(info)).encode("UTF-8"))
			sys.stdout.buffer.write(b".")
			sys.stdout.buffer.write(info.encode("UTF-8"))
		elif isinstance(info, bytes):
			e = base64.b64encode(info)
			sys.stdout.buffer.write(str(len(e) + 1).encode("UTF-8"))
			sys.stdout.buffer.write(b".$")
			sys.stdout.buffer.write(e)
		sys.stdout.buffer.flush()
		# try: print("Printed[", str(len(info)), '.', info.decode("UTF-8"), "]", sep="", file=sys.stderr)
		# except UnicodeDecodeError: print("Printed[", str(len(info)), '.', info, "]", sep="", file=sys.stderr)
	def do_GET(self, path) -> HttpResponse:
		splitpath = path.split("?")
		res = get(splitpath[0], URLQuery(''.join(splitpath[1:])))
		c: str | bytes = res["content"]
		if isinstance(c, str): c = c.encode("utf-8")
		return {
			"status": res["status"],
			"headers": res["headers"],
			"content": c
		}
	def do_POST(self, path: str, body: str) -> HttpResponse:
		res = post(path, body)
		c: str | bytes = res["content"]
		if isinstance(c, str): c = c.encode("utf-8")
		return {
			"status": res["status"],
			"headers": res["headers"],
			"content": c
		}

if __name__ == "__main__":
	running = True
	webServer = MyServer()
	print(f"Fake server (geometry dash) started", file=sys.stderr)
	# sys.stdout.flush()
	while running:
		try:
			webServer.handle_request()
		except KeyboardInterrupt:
			running = False
	print("Server stopped", file=sys.stderr)
