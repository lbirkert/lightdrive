<script lang="ts">
  import { goto } from "$app/navigation";
  import { required, email, minLength, pipe } from "$lib/rewrite/validators";
  import type { Rule } from "$lib/rewrite/validators";

  let tab = $state("login");

  let errors = $state<Record<string, string>>({});
  let loading = $state(false);
  let serverError = $state("");

  let lEmail = $state("");
  let lPassword = $state("");
  let lShowPassword = $state(false);

  let sName = $state("");
  let sEmail = $state("");
  let sPassword = $state("");
  let sShowPassword = $state(false);

  function validateLogin() {
    const e: Record<string, string> = {};
    const chk = (id: string, val: string, rule: Rule) => {
      const msg = rule(val);
      if (msg) e[id] = msg;
    };
    chk("l-email", lEmail, pipe(required(), email()));
    chk("l-password", lPassword, pipe(required(), minLength(8)));
    return e;
  }

  function validateSignup() {
    const e: Record<string, string> = {};
    const chk = (id: string, val: string, rule: Rule) => {
      const msg = rule(val);
      if (msg) e[id] = msg;
    };
    chk("s-name", sName, required());
    chk("s-email", sEmail, pipe(required(), email()));
    chk("s-password", sPassword, pipe(required(), minLength(8)));
    return e;
  }

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    const v = validateLogin();
    errors = v;
    if (Object.keys(v).length) return;
    loading = true;
    serverError = "";
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lEmail, password: lPassword }),
    });
    loading = false;
    if (res.ok) goto("/ui-rewrite/drive");
    else { const r = await res.json(); serverError = r.error || "Something went wrong"; }
  }

  async function handleSignup(e: SubmitEvent) {
    e.preventDefault();
    const v = validateSignup();
    errors = v;
    if (Object.keys(v).length) return;
    loading = true;
    serverError = "";
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sName, email: sEmail, password: sPassword }),
    });
    loading = false;
    if (res.ok) goto("/ui-rewrite/drive");
    else { const r = await res.json(); serverError = r.error || "Something went wrong"; }
  }

  function focusField(key: string) {
    const next = { ...errors };
    delete next[key];
    errors = next;
  }
</script>

<div class="auth-page">
  <div class="auth-container">
    <div class="auth-header">
      <h1>Welcome</h1>
      <p>Sign in or create an account</p>
    </div>

    <div class="auth-card">
      <div class="tabs">
        <button class="tab" class:active={tab === "login"} onclick={() => { tab = "login"; errors = {}; serverError = ""; }}>Sign In</button>
        <button class="tab" class:active={tab === "signup"} onclick={() => { tab = "signup"; errors = {}; serverError = ""; }}>Sign Up</button>
      </div>

      {#if tab === "login"}
        <form class="auth-form" onsubmit={handleLogin} novalidate>
          <div class="field" class:field-error={errors["l-email"]}>
            <label for="l-email">Email</label>
            <input id="l-email" type="email" placeholder="you@example.com" bind:value={lEmail} oninput={() => focusField("l-email")} />
            {#if errors["l-email"]}<span class="field-msg">{errors["l-email"]}</span>{/if}
          </div>
          <div class="field" class:field-error={errors["l-password"]}>
            <label for="l-password">Password</label>
            <div class="password-wrap">
              <input id="l-password" type={lShowPassword ? "text" : "password"} placeholder="Enter password" bind:value={lPassword} oninput={() => focusField("l-password")} />
              <button type="button" class="password-toggle" onclick={() => lShowPassword = !lShowPassword} aria-label="Toggle password visibility">{lShowPassword ? "Hide" : "Show"}</button>
            </div>
            {#if errors["l-password"]}<span class="field-msg">{errors["l-password"]}</span>{/if}
          </div>
          {#if serverError}<p class="server-error">{serverError}</p>{/if}
          <button type="submit" class="btn-primary" disabled={loading}>{loading ? "Signing in\u2026" : "Sign In"}</button>
        </form>
      {:else}
        <form class="auth-form" onsubmit={handleSignup} novalidate>
          <div class="field" class:field-error={errors["s-name"]}>
            <label for="s-name">Full Name</label>
            <input id="s-name" placeholder="Jane Doe" bind:value={sName} oninput={() => focusField("s-name")} />
            {#if errors["s-name"]}<span class="field-msg">{errors["s-name"]}</span>{/if}
          </div>
          <div class="field" class:field-error={errors["s-email"]}>
            <label for="s-email">Email</label>
            <input id="s-email" type="email" placeholder="you@example.com" bind:value={sEmail} oninput={() => focusField("s-email")} />
            {#if errors["s-email"]}<span class="field-msg">{errors["s-email"]}</span>{/if}
          </div>
          <div class="field" class:field-error={errors["s-password"]}>
            <label for="s-password">Password</label>
            <div class="password-wrap">
              <input id="s-password" type={sShowPassword ? "text" : "password"} placeholder="Create a password" bind:value={sPassword} oninput={() => focusField("s-password")} />
              <button type="button" class="password-toggle" onclick={() => sShowPassword = !sShowPassword} aria-label="Toggle password visibility">{sShowPassword ? "Hide" : "Show"}</button>
            </div>
            {#if errors["s-password"]}<span class="field-msg">{errors["s-password"]}</span>{/if}
          </div>
          {#if serverError}<p class="server-error">{serverError}</p>{/if}
          <button type="submit" class="btn-primary" disabled={loading}>{loading ? "Creating account\u2026" : "Create Account"}</button>
        </form>
      {/if}
    </div>
  </div>
</div>
