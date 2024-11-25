<template>
  <div class="dungeon">
    <img class="icon" :src="`/assets/dungeon.png`" />
    <span>Bastion des Marteaux-Aigris</span>
  </div>

  <div class="main">
    <div class="grid-column">
      <span class="title">Blindur</span><br/>
      <span class="level">lv. 190</span>

      <div class="minia">
        <img class="base" :src="`/assets/base.png`" />
        <img class="monster" :src="`/assets/tmp/monsters/blindur.png`" />
        <div class="stats">
          <div class="heart">
            <img src="/assets/tmp/x4/gaugeHeartBackground.png"/>
            <img src="/assets/tmp/x4/gaugeHeartFilledRed.png"/>
            <img src="/assets/tmp/x4/gaugeHeartShadeEdge.png"/>
            <span>6100</span>
          </div>
          <div class="pa">
            <img src="/assets/tmp/x4/paCounter-X4.png"/>
            <span>14</span>
          </div>
          <div class="pm">
            <img src="/assets/tmp/x4/pmCounter-figs-x4.png"/>
            <span>6</span>
          </div>
        </div>
      </div>
      
      <Panel icon="bag_reward" title="Butins">
        <div class="drops">
          <div v-for="(drop, dropIndex) in drops" :key="dropIndex" class="drop">
            <div class="stat" ><img :src="`/assets/drop/${drop.icon}.png`" /></div>
            <span class="value">{{ drop.value }}</span>
        </div>
        </div>
      </Panel>
    </div>

    <div class="grid-column">
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

      <Panel icon="tips" title="Tips">
        <div class="column" style="width:20 rem">
          <span>Logoden biniou. Liv vloaz. Gentañ an. Treñ regiñ. Moulañ Plouganoù. Seul gouzañv. Truez nebeutoc’h. Hir brav. Enno ivez. Naer pleg.</span>
          <span>Bemnoz arnev. Ivin lizher. Vihanañ ruz. Briad dant. Merc’h goulenn. Glac’har triwec’h. Evel botez. Stank kroc’hen. Dreuz fest. Va jod.</span>
          <span>Kaozeadenn ti. Stal lammat. Galleg houlenn. Estreget  spont. Enor vatezh. Pakañ merc’h. Speredekañ c’hroaz. Mall war. Nemet  gwelloc’h. Klask doare.</span>
        </div>
      </Panel>
    </div>

    
    <div class="grid-column">
      <Panel icon="tips" title="Sorts">
        <div class="spells">
          <span v-for="(spell, spellIndex) in spells" :key="spellIndex">
              {{ spell }}
          </span>
        </div>
      </Panel>
    </div>

    
    <div class="grid-column">
      <Panel icon="preview" title="Preview">
        <img src="/assets/tmp/monsters/blindur_spell.png"/>
      </Panel>

    </div>
    
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
    { icon: 'tx_neutralRes', value: "20%" },
    { icon: 'tx_strengthRes', value: "20%" },
    { icon: 'tx_intelligenceRes', value: "30%" },
    { icon: 'tx_chanceRes', value: "-20%" },
    { icon: 'tx_agilityRes', value: "-20%" }
  ];

  
  const drops = [
    { icon: '63439', value: "15%" },
    { icon: '165058', value: "15%" },
    { icon: '165064', value: "2.44%" },
    { icon: '180010', value: "1%" }
  ];

  const spells = [
    "Nimpatience",
    "Ninculpation",
    "Nindestructible"
  ]

  </script>

<style scoped lang="scss">

  .main {
    font-family: "Lexend Deca", sans-serif;
    font-weight: 600;
    text-shadow: 0px 2px 4px rgba(0, 0, 0, 0.75);
    width: 100%;
    flex: 1;
    
    display: flex;
    align-items: flex-start;
  }

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


  .title {
    font-size: 96px;
  }

  .level {
    font-size: 40px;
  }

  .dungeon {
    img {
      height: 4rem;
      margin-right: 0.8rem;
    }

    font-family: "Rowdies";
    font-size: 44px;
    display: flex;
    align-items: center;
    background-color: #292C4D;

    padding: 0.8rem;
    span {
      margin-right: 0.8rem
    }
    box-shadow: 0px 5px 5px rgba(0, 0, 0, 0.25);
    border-radius: 0 10px 10px 0;
  }

  .minia {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    position: relative;

    .base {
      width: 38rem;
    }

    .monster {
      position: absolute;
      margin-top: -20px;
      margin-right: 20px;
    }

    .stats {
      position: absolute;
      right: -10px;
      top: -30px;

      .heart {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 192px;
        height: 192px;
        margin-right: 4rem;
        font-size: 34px;
        
        img {
          position: absolute;
          width: 192px;
        }
        span {          
          position: absolute;
        }
      }

      .pa, .pm {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;

        span {          
          position: absolute;
        }
        img {        
          width: 96px;
        }
      }

      .pm {
        margin-right: 8rem;
      }
    }

    .grid-column {
      display: flex;
      flex-direction: column;
      padding: 2rem 5rem;
    }
  }

  .spells {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    font-weight: normal;
    text-shadow: none;
    font-size: 24px;
    text-align: right;

    > *:nth-child(2n +1 ) {
      background-color: #3A3D58;
      border-radius: 10px;
    }

    span {
      padding: 0.4rem 0.8rem;
      cursor: pointer;
    }
  }
</style>