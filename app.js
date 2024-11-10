import AnimationRender from './js/AnimationRenderer.js';

let assetDescriptor;
let skinId;

const start = async () => {
    let selectSkinId = document.getElementById("skinId");

    let assetDescriptorData = await fetch("./resources/asset-descriptor.json");
    assetDescriptor = await assetDescriptorData.json();

    assetDescriptor.skinIds.forEach(asset => {
        const optionElement = document.createElement('option');

        optionElement.value = asset.skinId;
        optionElement.textContent = asset.name + " (" + asset.skinId + ")";

        selectSkinId.appendChild(optionElement);
    });

    selectSkinId.addEventListener('change', function() {
        skinId = this.value;
        console.log("Selected Skin ID : " + skinId);
        loadAnimations(skinId);
    });

    
    let selectAnimation = document.getElementById("animation");
    selectAnimation.addEventListener('change', function() {
        const animation = this.value;
        console.log("Selected Animation : " + animation);
        AnimationRender.Start(skinId, animation)
    });

    skinId = selectSkinId.value;
    loadAnimations(selectSkinId.value);
};

function loadAnimations(skinId) {
    let selectAnimation = document.getElementById("animation");
    selectAnimation.innerHTML = '';
    assetDescriptor.skins[skinId].forEach(animation => {
        const optionElement = document.createElement('option');

        optionElement.value = animation;
        optionElement.textContent = animation;

        selectAnimation.appendChild(optionElement);
    });
    
    AnimationRender.Start(skinId, selectAnimation.value)
}

start();
