<script>
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from './supabase.js';
  import Auth from './Auth.svelte';
  import Icons from './lib/Icons.svelte';

  let user = null;
  let planet = null;
  let allPlanets = [];
  let loading = true;
  let displayIron = 0;
  let displayEnergy = 0;
  let interval;

  // Constants for balancing
  const IRON_BASE_PROD = 1;
  const ENERGY_BASE_PROD = 2;
  const IRON_BASE_STORAGE = 500;
  const UPGRADE_COST_MULTIPLIER = 100;

  // Compute stats based on levels
  $: ironProduction = (planet?.mine_level || 0) * IRON_BASE_PROD;
  $: energyProduction = (planet?.solar_plant_level || 0) * ENERGY_BASE_PROD;
  $: ironStorageLimit = (planet?.warehouse_level || 0) * IRON_BASE_STORAGE;

  onMount(async () => {
    // Emergency timeout: if still loading after 8s, force it false
    const timeout = setTimeout(() => {
      if (loading && user) {
        console.warn("Loading timeout reached.");
        loading = false;
      }
    }, 8000);

    // Initial session check
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user || null;
    if (user) {
      await fetchPlanetData();
    } else {
      loading = false;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      user = session?.user || null;
      if (user) {
        await fetchPlanetData();
      } else {
        planet = null;
        loading = false;
      }
    });

    await fetchLeaderboard();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planets' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      if (interval) clearInterval(interval);
    };
  });

  async function fetchPlanetData() {
    if (!user) {
      loading = false;
      return;
    }
    loading = true;
    
    try {
      const { data: planetData, error: planetError } = await supabase
        .from('planets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (planetError) throw planetError;
      
      if (planetData) {
        planet = planetData;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('player_name')
          .eq('id', user.id)
          .maybeSingle();
        
        planet.player_name = profileData?.player_name || 'Neznámý Velitel';
        
        const now = new Date();
        const lastUpdate = new Date(planet.last_updated);
        const secondsElapsed = (now - lastUpdate) / 1000;
        
        displayIron = Math.min(ironStorageLimit, planet.iron_amount + (secondsElapsed * (planet.mine_level * IRON_BASE_PROD)));
        displayEnergy = planet.energy_amount + (secondsElapsed * (planet.solar_plant_level * ENERGY_BASE_PROD));
        
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
          displayEnergy += (energyProduction / 10);
          const ironTick = (ironProduction / 10);
          const energyNeeded = ironTick * 0.5;

          if (displayIron < ironStorageLimit) {
            if (displayEnergy >= energyNeeded) {
              displayIron += ironTick;
              displayEnergy -= energyNeeded;
            } else {
              displayIron += (ironTick * 0.1);
            }
          }
        }, 100);
      } else {
        planet = null;
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      loading = false;
    }
  }
  
  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('planets')
      .select('mine_level, iron_amount, profiles (player_name)')
      .order('mine_level', { ascending: false })
      .limit(10);
      
    allPlanets = (data || []).map(p => ({
      ...p,
      player_name: p.profiles?.player_name || 'Neznámý'
    }));
  }

  async function upgradeBuilding(type) {
    let currentLevel = 0;
    let updateObj = { last_updated: new Date().toISOString() };
    
    if (type === 'mine') {
      currentLevel = planet.mine_level;
    } else if (type === 'solar') {
      currentLevel = planet.solar_plant_level;
    } else if (type === 'warehouse') {
      currentLevel = planet.warehouse_level;
    }

    const cost = UPGRADE_COST_MULTIPLIER * currentLevel;
    
    if (displayIron >= cost) {
      const newLevel = currentLevel + 1;
      const newIron = displayIron - cost;

      if (type === 'mine') updateObj.mine_level = newLevel;
      if (type === 'solar') updateObj.solar_plant_level = newLevel;
      if (type === 'warehouse') updateObj.warehouse_level = newLevel;
      
      updateObj.iron_amount = newIron;
      updateObj.energy_amount = displayEnergy;

      const { data, error } = await supabase
        .from('planets')
        .update(updateObj)
        .eq('id', planet.id)
        .select()
        .single();

      if (!error) {
        planet = { ...planet, ...data };
        displayIron = newIron;
      }
    } else {
      alert("Nedostatek železa!");
    }
  }

  async function createPlanet() {
    loading = true;
    const { error } = await supabase
      .from('planets')
      .insert({
        user_id: user.id,
        iron_amount: 100,
        mine_level: 1,
        solar_plant_level: 1,
        warehouse_level: 1,
        energy_amount: 50,
        last_updated: new Date().toISOString()
      });

    if (error && error.code !== '23505') {
      alert("Chyba při zakládání: " + error.message);
    } else {
      await fetchPlanetData();
    }
    loading = false;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<main>
  <header class="top-bar">
    <div class="logo">🚀 Vesmírná Kolonie</div>
    {#if user && planet}
      <div class="user-pill">
        <span>{planet.player_name}</span>
        <button class="logout-btn" on:click={signOut}>✕</button>
      </div>
    {/if}
  </header>

  {#if !user}
    <Auth />
  {:else if loading}
    <div class="loader-container">
      <div class="loader">Skenuji orbitu...</div>
      <button class="retry-btn" on:click={fetchPlanetData}>Zkusit znovu</button>
    </div>
  {:else if planet}
    <div class="dashboard">
      <!-- Resource Section -->
      <section class="resources">
        <div class="res-card iron">
          <div class="res-icon"><Icons name="iron" /></div>
          <div class="res-data">
            <span class="label">Železo</span>
            <span class="value">{Math.floor(displayIron)} <small>/ {ironStorageLimit}</small></span>
            <div class="progress-bg">
              <div class="progress-bar" style="width: {(displayIron / ironStorageLimit) * 100}%"></div>
            </div>
            <span class="prod">+{ironProduction.toFixed(1)}/s</span>
          </div>
        </div>

        <div class="res-card energy">
          <div class="res-icon"><Icons name="energy" /></div>
          <div class="res-data">
            <span class="label">Energie</span>
            <span class="value">{Math.floor(displayEnergy)}</span>
            <span class="prod">+{energyProduction.toFixed(1)}/s</span>
          </div>
        </div>
      </section>

      <!-- Building Section -->
      <section class="buildings">
        <div class="building-card">
          <Icons name="mine" size="40" />
          <h3>Důl na železo</h3>
          <p class="lvl">Úroveň {planet.mine_level}</p>
          <p class="desc">Produkuje železo (stojí energii).</p>
          <button on:click={() => upgradeBuilding('mine')} disabled={displayIron < 100 * planet.mine_level}>
            Vylepšit <Icons name="upgrade" size="14" /> <span>({100 * planet.mine_level} Fe)</span>
          </button>
        </div>

        <div class="building-card">
          <Icons name="solar" size="40" />
          <h3>Solární elektrárna</h3>
          <p class="lvl">Úroveň {planet.solar_plant_level}</p>
          <p class="desc">Vyrábí energii pro provoz budov.</p>
          <button on:click={() => upgradeBuilding('solar')} disabled={displayIron < 100 * planet.solar_plant_level}>
            Vylepšit <Icons name="upgrade" size="14" /> <span>({100 * planet.solar_plant_level} Fe)</span>
          </button>
        </div>

        <div class="building-card">
          <Icons name="warehouse" size="40" />
          <h3>Sklad surovin</h3>
          <p class="lvl">Úroveň {planet.warehouse_level}</p>
          <p class="desc">Zvyšuje maximální kapacitu železa.</p>
          <button on:click={() => upgradeBuilding('warehouse')} disabled={displayIron < 100 * planet.warehouse_level}>
            Vylepšit <Icons name="upgrade" size="14" /> <span>({100 * planet.warehouse_level} Fe)</span>
          </button>
        </div>
      </section>

      <!-- Leaderboard Section -->
      <section class="leaderboard card">
        <h3>🏆 Top Průzkumníci</h3>
        <table>
          <thead>
            <tr><th>Pozice</th><th>Velitel</th><th>Důl</th><th>Sklad Fe</th></tr>
          </thead>
          <tbody>
            {#each allPlanets as p, i}
              <tr class={p.player_name === planet.player_name ? 'highlight' : ''}>
                <td>{i + 1}.</td>
                <td>{p.player_name}</td>
                <td>Lvl {p.mine_level}</td>
                <td>{Math.floor(p.iron_amount)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    </div>
  {:else}
    <div class="card no-planet">
      <h3>⚠️ Žádná Kolonie Nenalezena</h3>
      <button class="create-btn" on:click={createPlanet}>Založit novou kolonii</button>
    </div>
  {/if}
</main>

<style>
  :global(body) { 
    background: #080a0f; 
    color: #e0e6ed; 
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
  }

  main { max-width: 900px; margin: 0 auto; padding: 20px; }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 0;
    margin-bottom: 20px;
    border-bottom: 1px solid #1a1f29;
  }

  .logo { font-size: 1.5rem; font-weight: bold; color: #4af2ff; }

  .user-pill {
    background: #1a1f29;
    padding: 5px 15px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #30363d;
  }

  .logout-btn { background: none; border: none; color: #ff4a4a; cursor: pointer; font-size: 1.2rem; padding: 0; }

  /* Resources */
  .resources {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
  }

  .res-card {
    background: #1a1f29;
    padding: 15px;
    border-radius: 12px;
    display: flex;
    gap: 15px;
    border: 1px solid #30363d;
    position: relative;
    overflow: hidden;
  }

  .res-icon { color: #4af2ff; display: flex; align-items: center; }
  .res-data { flex-grow: 1; }
  .res-data .label { font-size: 0.8rem; color: #888; display: block; }
  .res-data .value { font-size: 1.4rem; font-weight: bold; display: block; }
  .res-data .value small { font-size: 0.8rem; color: #555; font-weight: normal; }
  .res-data .prod { font-size: 0.8rem; color: #28a745; position: absolute; top: 10px; right: 10px; }

  .energy .res-icon { color: #ffcc00; }

  .progress-bg { background: #0b0e14; height: 4px; border-radius: 2px; margin-top: 5px; }
  .progress-bar { background: #4af2ff; height: 100%; border-radius: 2px; transition: width 0.1s; }

  /* Buildings */
  .buildings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }

  .building-card {
    background: #1a1f29;
    padding: 25px;
    border-radius: 15px;
    text-align: center;
    border: 1px solid #30363d;
    transition: transform 0.2s, border-color 0.2s;
  }

  .building-card:hover { transform: translateY(-5px); border-color: #4af2ff; }
  .building-card h3 { margin: 15px 0 5px; font-size: 1.1rem; }
  .building-card .lvl { color: #4af2ff; font-weight: bold; margin-bottom: 10px; }
  .building-card .desc { font-size: 0.85rem; color: #888; margin-bottom: 20px; height: 40px; }

  button { 
    background: #007bff; color: white; border: none; padding: 10px 15px; 
    border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%;
    display: flex; justify-content: center; align-items: center; gap: 8px;
  }

  button:disabled { background: #333; cursor: not-allowed; color: #666; }
  button:hover:not(:disabled) { background: #0056b3; }
  button span { font-size: 0.8rem; opacity: 0.8; }

  /* Leaderboard */
  .card { background: #1a1f29; padding: 25px; border-radius: 15px; border: 1px solid #30363d; }
  .leaderboard table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  .leaderboard th { text-align: left; padding: 12px; color: #888; font-size: 0.8rem; border-bottom: 1px solid #30363d; }
  .leaderboard td { padding: 12px; border-bottom: 1px solid #242c38; }
  .highlight { background: #4af2ff1a; color: #4af2ff; font-weight: bold; }

  .loader-container { 
    text-align: center; 
    margin-top: 100px; 
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .loader { font-size: 1.2rem; color: #888; }
  .retry-btn { 
    background: #333; 
    width: auto; 
    padding: 8px 16px; 
    font-size: 0.9rem;
    border: 1px solid #444;
  }
  .retry-btn:hover { background: #444; }

  .no-planet { text-align: center; padding: 50px; }
  .create-btn { background: #28a745; width: auto; margin: 20px auto; padding: 15px 30px; font-size: 1.1rem; }
</style>
