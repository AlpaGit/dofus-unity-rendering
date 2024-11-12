import os
import json

directory = 'C:/Users/enzos/Documents/DofusUnity/Characters/Bones/exported/'

all_items = os.listdir(directory)

descriptor = None
with open("./resources/asset-descriptor.json", 'r') as file:
    descriptor = json.load(file)
descriptor["skinIds"] = []

i18n = None
with open("./resources/fr.i18n.json", encoding='utf-8')  as file:
    i18n = json.load(file)

monstersRoot = None
with open("./resources/MonstersRoot.json", 'r') as file:
    monstersRoot = json.load(file)

for mob in monstersRoot["references"]["RefIds"]:
    descriptor["skinIds"].append({
        "name": i18n["entries"][str(mob["data"]["nameId"])],
        "skinId": mob["data"]["look"][1:].split("|")[0]
    })

with open("./resources/asset-descriptor.json", 'w') as file:
    json.dump(descriptor, file, separators=(',', ':'))

print(descriptor)