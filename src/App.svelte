<script>
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from './supabase.js';

  let planet = null;
  let allPlanets = []; // Tady budou data pro žebříček
  let loading = true;
  let displayIron = 0; // Tohle číslo uvidí hráč "tikat"
  let interval;

  // TVOJE ID ZE SUPABASE (vlož sem to svoje z tabulky planets)
  const TEST_PLANET_ID = '59e06ed1-fbdb-45a0-9038-e8b78e59b026'; 

  // Konstanta: Kolik železa vyprodukuje 1. úroveň dolu za sekundu
  const BASE_PRODUCTION = 1; 

  onMount(async () => {
    // 1. Načtení dat ze Supabase
    const { data, error } = await supabase
      .from('planets')
      .select('*')
      .eq('id', TEST_PLANET_ID)
      .single();

    if (error) {
      console.error("Chyba:", error);
    } else {
      planet = data;
      
      // 2. Výpočet reálného stavu (pokud byl hráč dlouho pryč)
      const now = new Date();
      const lastUpdate = new Date(planet.last_updated);
      const secondsElapsed = (now - lastUpdate) / 1000;
      const productionPerSec = planet.mine_level * BASE_PRODUCTION;
      
      // Přičteme to, co se vytěžilo offline
      displayIron = planet.iron_amount + (secondsElapsed * productionPerSec);
      
      // 3. Spuštění vizuálního "tikání" (každých 100ms)
      interval = setInterval(() => {
        // Přičteme desetinu vteřinové produkce
        displayIron += (productionPerSec / 10);
      }, 100);
    }
	
	// 2. Načtení všech planet pro žebříček
    await fetchLeaderboard();

    // 3. REÁLNÝ ČAS: Sledujeme změny v tabulce planets
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planets' }, () => {
        fetchLeaderboard(); // Když se cokoliv změní, aktualizuj žebříček
      })
      .subscribe();

    loading = false;
  });
  
  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('planets')
      .select('player_name, mine_level, iron_amount')
      .order('mine_level', { ascending: false }) // Seřadit podle úrovně dolu
      .limit(10);
    allPlanets = data || [];
  }

  // Funkce pro vylepšení dolu
  async function upgradeMine() {
    const cost = 100 * planet.mine_level; // Cena roste s úrovní
    
    if (displayIron >= cost) {
      const newLevel = planet.mine_level + 1;
      const newIron = displayIron - cost;

      // Uložíme do Supabase
      const { data, error } = await supabase
        .from('planets')
        .update({ 
          mine_level: newLevel, 
          iron_amount: newIron,
          last_updated: new Date().toISOString() 
        })
        .eq('id', planet.id)
        .select()
        .single();

      if (!error) {
        planet = data;
        displayIron = newIron;
        alert("Důl vylepšen!");
      }
    } else {
      alert("Nemáš dost železa!");
    }
  }

  // Uklidíme interval při zavření stránky
  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<main>
  <h1>🚀 Vesmírná Kolonie</h1>

  {#if loading}
    <div class="loader">Přistávám na planetě...</div>
  {:else if planet}
    <div class="game-container">
      <section class="card">
		  <h2>Velitel: {planet.player_name}</h2>
			  
		  <div class="resource-box">
			<span class="label">Sklad železa:</span>
			<span class="value">{Math.floor(displayIron)}</span> 
			<small>({(planet.mine_level * BASE_PRODUCTION).toFixed(1)}/s)</small>
		  </div>

		  <div class="building-box">
			<p><strong>Důl na železo (Úroveň {planet.mine_level})</strong></p>
			<button on:click={upgradeMine} disabled={displayIron < 100 * planet.mine_level}>
			  Vylepšit za {100 * planet.mine_level} železa
			</button>
		  </div>
		</section>

		<section class="leaderboard">
			<h3>🏆 Top Průzkumníci</h3>
			<table>
			  <thead>
				<tr>
				  <th>Hráč</th>
				  <th>Důl</th>
				  <th>Sklad</th>
				</tr>
			  </thead>
			  <tbody>
				{#each allPlanets as p}
				  <tr class={p.player_name === planet.player_name ? 'highlight' : ''}>
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
    <p>Chyba při spojení s orbitální stanicí.</p>
  {/if}
</main>

<style>
  :global(body) { background: #0b0e14; color: #e0e0e0; font-family: 'Segoe UI', sans-serif; }
  main { max-width: 500px; margin: 40px auto; text-align: center; }
  .card { background: #1a1f29; padding: 2rem; border-radius: 15px; border: 1px solid #30363d; }
  .resource-box { font-size: 2rem; margin: 20px 0; color: #4af2ff; }
  .resource-box small { font-size: 0.9rem; color: #888; display: block; }
  .building-box { margin-top: 30px; padding: 15px; background: #242c38; border-radius: 10px; }
  button { 
    background: #007bff; color: white; border: none; padding: 10px 20px; 
    border-radius: 5px; cursor: pointer; font-weight: bold;
  }
  button:disabled { background: #444; cursor: not-allowed; }
  button:hover:not(:disabled) { background: #0056b3; }
  .leaderboard { background: #1a1f29; padding: 1rem; border-radius: 10px; border: 1px solid #30363d; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { text-align: left; color: #888; font-size: 0.8rem; text-transform: uppercase; }
  td { padding: 8px 0; border-bottom: 1px solid #242c38; }
  .highlight { color: #4af2ff; font-weight: bold; }
  .resource-box span { font-size: 1rem; color: #4af2ff; }
</style>