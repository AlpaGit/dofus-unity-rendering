<template>
  <div class="container">
    <canvas 
      @wheel="onWheel" 
      @mousemove="onMouseMove" 
      @mouseleave="onMouseLeave" 
      ref="canvas" 
      width="800" 
      height="600">
      </canvas>
      
    <ZoomController class="zoomControl" 
      @change="handleZoomControl"
      :scale="scale"/>
  </div>
</template>

<script setup lang="ts">
  import AnimationRenderer from "~/src/AnimationRenderer";

  const props = defineProps<{
    skinId: number,
    animation: string,
  }>()

  import { ref, onMounted } from 'vue'

  let canvas = ref<HTMLCanvasElement | null>(null)
  let render: AnimationRenderer | null = null;
  const scale = ref(1);
  const scaleStep = 0.1; // Scale increment/decrement step

  onMounted(async () => {
    if (!canvas.value) {
      return
    }

    render = new AnimationRenderer(canvas.value, props.skinId, props.animation)
    await render.Initialize()

    render.Start()
  })

  watch(
    () => [props.skinId, props.animation],
    async () => {
      if (render && canvas.value) {
        render.Stop()
        render = new AnimationRenderer(canvas.value, props.skinId, props.animation)
        render.setScale(scale.value); 
        await render.Initialize()

        render.Start()
      }
    },
    { immediate: true }
  );

  const onWheel = (event: WheelEvent): void => {
    if (!canvas.value || !render) return;

    event.preventDefault();

    if (event.deltaY < 0) {
        // Zoom in
        scale.value += scaleStep;
        if (scale.value > 5.0) scale.value = 5.0; // Set an upper limit to zoom in
    } else {
        // Zoom out
        scale.value -= scaleStep;
        if (scale.value < 0.1) scale.value = 0.1; // Set a lower limit to zoom out
    }

    render.setScale(scale.value); 
  };

  const onMouseMove = (event: WheelEvent): void => {
    if(!render) return;

    render.setIsHover(true, event); 
  };

  const onMouseLeave = (event: WheelEvent): void => {
    if(!render) return;

    render.setIsHover(false, event); 
  };

  const handleZoomControl = (modifier: number): void => {
    if (modifier > 0) {
        scale.value += scaleStep;
        if (scale.value > 5.0) scale.value = 5.0;
    } else {
        scale.value -= scaleStep;
        if (scale.value < 0.1) scale.value = 0.1;
    }

    render.setScale(scale.value); 
  };
</script>


<style scoped lang="scss">
  .container {
    position: relative;
  }
  .zoomControl {
    position: absolute;
    right: 1rem;
    top: 1rem;
    box-shadow: 0px 5px 5px rgba(0, 0, 0, 0.25);
  }
</style>