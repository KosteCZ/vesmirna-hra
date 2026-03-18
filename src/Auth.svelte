<script>
  import { supabase } from './supabase.js';

  let email = '';
  let password = '';
  let playerName = '';
  let loading = false;
  let isSignUp = false;

  async function handleAuth() {
    loading = true;
    try {
      if (isSignUp) {
        // Sign Up with metadata
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              player_name: playerName || 'Nový Průzkumník'
            }
          }
        });

        if (authError) throw authError;
        alert('Účet vytvořen! Pokud máte zapnuté potvrzení e-mailem, zkontrolujte si schránku.');
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-container card">
  <h2>{isSignUp ? 'Registrace do Kolonie' : 'Přihlášení na Palubu'}</h2>
  
  <form on:submit|preventDefault={handleAuth}>
    <div class="input-group">
      <label for="email">E-mail</label>
      <input id="email" type="email" bind:value={email} required placeholder="velitel@vesmir.cz" />
    </div>

    <div class="input-group">
      <label for="password">Heslo</label>
      <input id="password" type="password" bind:value={password} required placeholder="********" />
    </div>

    {#if isSignUp}
      <div class="input-group">
        <label for="playerName">Jméno velitele</label>
        <input id="playerName" type="text" bind:value={playerName} required placeholder="Např. Captain Solo" />
      </div>
    {/if}

    <button type="submit" disabled={loading}>
      {loading ? 'Pracuji...' : (isSignUp ? 'Založit kolonii' : 'Vstoupit do hry')}
    </button>
  </form>

  <p>
    {isSignUp ? 'Už máš účet?' : 'Ještě nemáš kolonii?'}
    <button class="link-btn" on:click={() => isSignUp = !isSignUp}>
      {isSignUp ? 'Přihlásit se' : 'Zaregistrovat se'}
    </button>
  </p>
</div>

<style>
  .auth-container {
    max-width: 400px;
    margin: 50px auto;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 15px;
    text-align: left;
  }
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  input {
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #30363d;
    background: #0b0e14;
    color: white;
  }
  button {
    margin-top: 10px;
  }
  .link-btn {
    background: none;
    border: none;
    color: #4af2ff;
    text-decoration: underline;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0;
  }
  .link-btn:hover {
    color: #007bff;
  }
</style>
