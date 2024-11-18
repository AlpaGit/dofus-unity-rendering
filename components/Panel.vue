<template>
    <div class="panel">
        <div class="header">
            <img class="icon" :src="`/assets/${icon}.png`" />
            <span class="title">{{ props.title }}</span>
        </div>
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
    const props = defineProps<{
        icon: string,
        title: string
    }>()
</script>


<style scoped lang="scss">

    .header {
        padding-bottom: 0.6rem;
        display: flex;
        align-items: center;
    }

    .panel {
        background-color: #292C4D;
        border-radius: 10px;
        box-shadow: 0px 5px 5px rgba(0, 0, 0, 0.25);
        padding: 0.6rem;
    }

    .icon {
        height: 3rem;
    }

    .title {
        font-size: 2rem;
        color: #FFD194;
        font-family: "Lexend Deca", sans-serif;
        font-weight: 600;
        margin-left: 0.3rem;
    }
</style>