<template>
  <canvas ref="canvas" width="800" height="600"></canvas>
</template>

<script setup lang="ts">
  import AnimationRenderer from "~/src/AnimationRenderer";

  const props = defineProps<{
    skinId: number,
    animation: string,
  }>()

  import { onMounted } from 'vue'

  let canvas = ref<HTMLCanvasElement | null>(null)

  onMounted(async () => {
    if (!canvas.value) {
      return
    }

    let render = new AnimationRenderer(canvas.value, props.skinId, props.animation)
    await render.Initialize()

    render.Start()
  })
</script>


<style scoped lang="scss">

</style>