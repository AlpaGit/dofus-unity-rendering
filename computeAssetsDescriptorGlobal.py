import os
import json

assetsDescriptor = {
    "skinIds": [],
    "skins": {

    }
}

directory = 'C:/Users/enzos/Documents/DofusUnity/Characters/Bones/exported/'

all_items = os.listdir(directory)

for item in all_items:
    sub_items = all_items = os.listdir(directory + item + "/")
    id = ""
    for sub_item in sub_items:
        id = sub_item.split(".")[0]
        if id.isnumeric():
            with open(directory + item + "/" + id + ".json" , 'r') as file:
                data = json.load(file)
                assetsDescriptor["skinIds"].append(id)
                assetsDescriptor["skins"][id] = []
                for anim in data["animations"]["Array"]:
                    assetsDescriptor["skins"][id].append(anim["name"])

with open("./resources/asset-descriptor.json", 'w') as file:
    json.dump(assetsDescriptor, file, separators=(',', ':'))

print(assetsDescriptor)