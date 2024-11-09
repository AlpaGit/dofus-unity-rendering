import os
import json

assetsDescriptor = {
    "skinIds": [],
    "skins": {

    }
}

directory = './resources'

all_items = os.listdir(directory)
assetsDescriptor["skinIds"] = [item for item in all_items if os.path.isdir(os.path.join(directory, item))]

for id in assetsDescriptor["skinIds"]:
    with open(directory + "/" + id + "/" + id + "-AnimatedObjectDefinition.json" , 'r') as file:
        data = json.load(file)
        assetsDescriptor["skins"][id] = []
        for anim in data["animations"]["Array"]:
            assetsDescriptor["skins"][id].append(anim["name"])

with open(directory + "/asset-descriptor.json", 'w') as file:
    json.dump(assetsDescriptor, file, indent=4)

print(assetsDescriptor)