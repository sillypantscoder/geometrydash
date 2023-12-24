import json

f = open("levels/test_level.json", "r")
t = json.loads(f.read())
f.close()

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
	"objects": [
		{objects}
	],
	"verified": {json.dumps(t["verified"])},
	"deleted": {json.dumps(t["deleted"])}
}}"""

f = open("levels/test_level.json", "w")
f.write(result)
f.close()