import json
import os

def format_level(t: dict):
	def format_o(o):
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
		"gamemode": {json.dumps(t["settings"]["gamemode"])}
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

def read_file(filename: str) -> bytes:
	f = open(filename, "rb")
	t = f.read()
	f.close()
	return t

def write_file(filename: str, content: str):
	f = open(filename, "w")
	f.write(content)
	f.close()

files = os.listdir("levels/published")
for name in files:
	t = json.loads(read_file("levels/published/" + name))
	t["completion"]["percentage"] = 0
	t["completion"]["coins"] = [False for f in t["completion"]["coins"]]
	write_file("levels/published/" + name, format_level(t))

files = os.listdir("levels/user")
for name in files:
	t = json.loads(read_file("levels/user/" + name))
	t["completion"]["percentage"] = 0
	t["completion"]["coins"] = [False for f in t["completion"]["coins"]]
	write_file("levels/user/" + name, format_level(t))
