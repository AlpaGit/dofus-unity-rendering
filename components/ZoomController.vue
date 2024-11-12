<template>
    <div class="container">
        <div class="btn" @click="toggleMinus">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z"/></svg>
        </div>
        <span class="label">{{scaleLabel}}</span>
        <div class="btn" @click="togglePlus">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/></svg>
        </div>
    </div>
</template>
  
<script setup lang="ts">
    const props = defineProps<{
        scale: number
    }>()

    const scaleLabel = ref(evalScaleLabel());
    
    const emit = defineEmits<{
        (e: 'change', option: Option): void
    }>()

    function toggleMinus() {
        emit('change', -1); 
    }
    function togglePlus() {
        emit('change', +1); 
    }

    watch(
        () => [props.scale],
        async () => {
            scaleLabel.value = evalScaleLabel();
        },
        { immediate: true }
    );

    function evalScaleLabel() {
        return (parseInt(props.scale * 100)) + "%";
    }
</script>

<style scoped lang="scss">
    .container {
        background-color: white;
        color: black;
        border-color: solid 1px black;
        border-radius: 0.3rem;
        padding: 0.2rem 0.4rem;
        display: flex;
        height: 1.1rem;
    }

    .btn {
        width: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-weight: bold;
    }

    .label {
        text-align: center;
        width: 3rem;
        font-size: 0.8rem;
        line-height: 1.2rem;
        user-select: none;
    }

    .icon {
        width: 0.7rem;
    }

</style>