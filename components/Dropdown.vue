<template>

</template>
  
  <script setup lang="ts">  
    class Option {
        constructor(value, label) {
            this.value = value;
            this.label = label;
        }
    }
    
    const props = defineProps<{
      options: Array<Option>,
      placeholder: string,
    }>()
  

  </script>
  
  
  <style scoped lang="scss">
  
  </style>