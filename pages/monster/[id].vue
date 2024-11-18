<template>
  <div>
    <h1 class="debug">Monster : {{ id }}</h1>
    <Panel icon="carac" title="Caractéristiques">
      <div class="column">
        <div v-for="(caracGroup, index) in [caracRow, caracRow2, caracRow3]" :key="index" class="row">
          <div v-for="(carac, caracIndex) in caracGroup" :key="caracIndex" class="carac">
            <img :src="`/assets/stats/${carac.icon}.png`" class="stat" />
            <span class="value">{{ carac.value }}</span>
          </div>
        </div>
      </div>
    </Panel>

    
    <Panel icon="bag_reward" title="Butins">
      <div class="drops">
        <div v-for="(drop, dropIndex) in drops" :key="dropIndex" class="drop">
          <div class="stat" ><img :src="`/assets/drop/${drop.icon}.png`" /></div>
          <span class="value">{{ drop.value }}</span>
      </div>
      </div>
    </Panel>
  </div>
</template>

  <script setup>
    const route = useRoute();
    const id = route.params.id;

    const data = await fetch("http://116.202.16.139:8080/Monsters/monsterId?monsterId=" + id)
    const dataJson = await data.json()
    console.log(dataJson)

    const caracRow = [
    { icon: 'tx_initiative', value: 2264 },
    { icon: 'tx_pushReduction', value: 56 },
    { icon: 'tx_escape', value: 56 },
    { icon: 'tx_criticalReduction', value: 0 },
    { icon: 'tx_pushReduction', value: 0 }
  ];
  
  const caracRow2 = [
    { icon: 'tx_attackAP', value: 45 },
    { icon: 'tx_attackMP', value: 45 },
    { icon: 'tx_dodgeAP', value: 25 },
    { icon: 'tx_dodgeMP', value: 65 },
    { icon: 'tx_return', value: 0 }
  ];

  const caracRow3 = [
    { icon: 'tx_neutralRes', value: 20 },
    { icon: 'tx_strengthRes', value: 20 },
    { icon: 'tx_intelligenceRes', value: 30 },
    { icon: 'tx_chanceRes', value: "-20%" },
    { icon: 'tx_agilityRes', value: "-20%" }
  ];

  
  const drops = [
    { icon: '63439', value: "15%" },
    { icon: '165058', value: "15%" },
    { icon: '165064', value: "2.44%" },
    { icon: '180010', value: "1%" }
  ];

  </script>

<style scoped lang="scss">

  .container {
      background-image: url("/assets/mapdj.PNG");
      width: 100%;
      height: 100%;
  }

  .carac {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat {
    height: 2rem;
    margin-bottom: 0.2rem;
  }

  .row {
    display: flex;
    justify-content: space-evenly;
  }

  .column {
    display: flex;
    gap: 1.4rem;
    flex-direction: column;
  }

  .value {
    font-family: "Lexend Deca", sans-serif;
    font-weight: 600;
    text-shadow: 0px 2px 4px rgba(0, 0, 0, 0.75);
  }

  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;

    .stat {
      height: 3rem;
      width: 3rem;
      position: relative;
      background-color: #3A3D5866;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        height: 2.6rem;
        z-index: 2;
      }

      &::before {
        content: "";
        position: absolute;
        width: calc(100% - 4px);
        height: calc(100% - 4px);
        border-radius: 10px;
        background-color: #1B1D3266;
        border: solid 1px #00000066;
      }
    }
  }

  .drops {
    display: flex;
    gap: 0.6rem;
  }
</style>