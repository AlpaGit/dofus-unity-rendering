<template>
  <div class="dropdown-container" @click.stop>
    <div class="dropdown-selected" @click="toggleDropdown">
      <div class="selected-data">{{ selectedOption ? selectedOption.label : placeholder }}</div>
      <svg class="ic-arrow" :class="{ open: isOpen }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/></svg>
    </div>

    <div class="dropdown-options" v-if="isOpen">
      <div class="dropdown-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search"
          @input="filterOptions"
        />
      </div>
      <ul>
        <li
          v-for="option in filteredOptions"
          :key="option.key"
          :class="{ selected: option.value === selectedValue }"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </li>
      </ul>
      <p v-if="!filteredOptions.length" class="no-results">
        Opps can't find any result.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">  
  import { ref, computed, watch, defineProps, defineEmits, onMounted, onBeforeUnmount } from 'vue'

  interface Option {
    value: number | string
    label: string
  }

  const props = defineProps<{
    options: Option[],
    placeholder?: string
  }>()

  const emit = defineEmits<{
    (e: 'change', option: Option): void
  }>()

  const isOpen = ref(false)
  const selectedValue = ref<string | number | null>(null)
  const searchQuery = ref<string>("")
  const filteredOptions = ref<Option[]>(props.options)

  // Computed property to get the selected option based on the selected value
  const selectedOption = computed(() => {
    return props.options.find(option => option.value === selectedValue.value)
  })

  // Toggle the dropdown open or close
  function toggleDropdown() {
    isOpen.value = !isOpen.value
  }

  // Filter options based on the search query
  function filterOptions() {
    const query = searchQuery.value.toLowerCase()
    filteredOptions.value = props.options.filter(option =>
      option.label.toLowerCase().includes(query)
    )
  }

  // Select an option and emit the selection to the parent
  function selectOption(option: Option) {
    selectedValue.value = option.value
    emit('change', option); // Émet l'événement 'change' avec la nouvelle valeur

    isOpen.value = false // Close the dropdown
    searchQuery.value = "" // Clear search input
    filteredOptions.value = props.options // Reset filtered options
  }

  // Close the dropdown when clicking outside of it
  function closeDropdown(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest(".dropdown-container")) {
      isOpen.value = false
    }
  }

  onMounted(() => {
    document.addEventListener("click", closeDropdown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener("click", closeDropdown)
  })

  watch(() => props.options, (newOptions) => {
    filteredOptions.value = newOptions
  })
</script>


<style scoped lang="scss">
.dropdown-container {
    width: 20rem;
    display: flex;
    max-width: 20rem;
    align-items: stretch;
    flex-direction: column;
    justify-content: center;
    position: relative;
}

.dropdown-selected {
    cursor: pointer;
    user-select: none;
    font-size: 1.16rem;
    display: flex;
    justify-content: space-between;
    padding: 0.6rem 1rem 0.6rem 0.6rem;
    align-items: center;
    background: #fff;
    color: #9696FA;
    border-radius: 0.3rem;
}

.dropdown-selected i {
    transition: transform 0.3s ease-in-out;
}

.dropdown-options {
    font-size: 1.1rem;
    justify-content: flex-start;
    flex-direction: column;
    transition: background-color 0.1s ease-in-out;
    width: calc(100% - 1rem);
    color: #202020;
    background: white;
    border-radius: 0.3rem;
    position: absolute;
    top: 100%;
    overflow: hidden;
    border: solid 1px #c9c9c9;
    padding: 0.5rem;
    z-index: 999;
}

.dropdown-search {
    display: flex;
    align-items: center;
    border-radius: 0.4rem;
    color: rgb(0 0 0 / 50%);
    border: 2px solid rgb(0 0 0 / 30%);
}

.dropdown-search.focus {
    border: 2px solid rgb(52 211 153 / 70%);
}

.dropdown-search input[type="text"] {
    border: 0;
    width: 100%;
    outline: none;
    height: 2.5rem;
    font-size: 1rem;
    padding: 0 0.4rem;
    border-radius: 0.4rem;
}

.dropdown-search input[type="text"]::placeholder {
    font-size: 1rem;
    color: rgb(0 0 0 / 50%);
}

.dropdown-options ul {
    width: 100%;
    max-height: 15rem;
    overflow-y: scroll;
    margin: 0.5rem 0;
    padding: 0;
}

.dropdown-options ul::-webkit-scrollbar {
    width: 6px;
}

.dropdown-options ul::-webkit-scrollbar-track {
    width: 2px;
    border-radius: .2rem;
    background: rgba(0, 0, 0, 0.1);
}

.dropdown-options ul::-webkit-scrollbar-thumb {
    border-radius: .2rem;
    background: rgba(0, 0, 0, 0.3);
}

.dropdown-options ul li {
    cursor: pointer;
    list-style: none;
    padding: 0.4rem 0.4rem;
    border-bottom: 1px solid rgba(204, 204, 204, 0.5);
}

.dropdown-options ul li.selected {
    background: rgba(52, 211, 153, 0.5);
}

.dropdown-options ul li.selected:hover {
    background: rgba(52, 211, 153, 0.5);
}

.dropdown-options ul li:last-child {
    border: 0;
}

.dropdown-options ul li:hover {
    background: rgba(52, 211, 153, 0.2);
}

.ic-arrow {
  width: 0.7rem;
  transform: rotate(90deg);
}

.ic-arrow.open {
  transform: none;
}
</style>
