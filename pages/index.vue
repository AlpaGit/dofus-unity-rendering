<template>
  <div class="setting-panel">
    <Dropdown 
      class="dropdown"
      @change="handleBoneAssetChange"
      :options="boneAssets" 
      placeholder="Pick a bone asset"
    />

    <br/>
  
    <Dropdown 
      class="dropdown"
      :options="animations" 
      placeholder="Pick an animation"
      @change="handleAnimationChange" />
  </div>
  
  <br/>

  <BonesRenderer 
      class="bonesRenderer"
      :skinId="skinId"
      :animation="animationName"
  />
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  const dropdownOptions = [
    { label: "Option 1", value: 1 },
    { label: "Option 2", value: 2 },
    { label: "Option 3", value: 3 }
  ]
  let skinId = ref(431);
  let animationName = ref("AnimMarche_1");

  const boneAssets = ref<Array<{ label: string, value: number }>>([]);
  const animations = ref<Array<string>>([]);
  let assetDescriptor = null;

  onMounted(async () => {
    const assetDescriptorData = await fetch("https://unity.bubble-network.net/Bones/asset-descriptor.json");
    assetDescriptor = await assetDescriptorData.json();

    assetDescriptor.skinIds.forEach((asset: { name: string, skinId: number }, index: number) => {
      boneAssets.value.push({ 
        label: `${asset.name} (${asset.skinId})`, 
        value: asset.skinId,
        key: `${asset.skinId}-${index}`
      });
    });
  });

  const handleBoneAssetChange = (newValue) => {
    skinId.value = Number(newValue.value);
    loadAnimations(skinId.value)
  };

  const handleAnimationChange = (newValue) => {
    animationName.value = newValue.value;
  };

  function loadAnimations(skinId) {
    animations.value = [];
    assetDescriptor.skins[skinId].forEach((animation, index: number) => {
      animations.value.push({ 
        label: animation, 
        value: animation,
        key: `${animation}-${index}`
      });
    });
  }
</script>


<style scoped lang="scss">
  .setting-panel {
    display: flex;
    gap: 0.5rem;
  }

  .bonesRenderer {
    background-image: radial-gradient(circle, #9696fa, #8382db, #706fbe, #5e5da1, #4c4b85);
    border-radius: 0.3rem;
    box-shadow: 0px 10px 14px 1px rgba(00,00,00,0.25)
  }

  .dropdown {
    box-shadow: 0px 5px 5px rgba(00,00,00,0.25)
  }
</style>