<script lang="ts">
  import { Button, Card, Flex, Form, Heading, Input, Tabs, Text, Modal } from "flewui";
  import { pipe, required, email, minLength, matchesField } from "flewui";
  import { LogIn } from "@lucide/svelte";
  import { goto } from "$app/navigation";

  let tab = $state("login");
  let errorMessage = $state("");
  let showError = $state(false);

  async function handleLogin(_data: unknown, e: Event) {
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const email = fd.get("l-email");
    const password = fd.get("l-password");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) goto("/drive");
    else { const r = await res.json(); errorMessage = r.error; showError = true; }
  }

  async function handleSignup(_data: unknown, e: Event) {
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const name = fd.get("s-name");
    const email = fd.get("s-email");
    const password = fd.get("s-password");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) goto("/drive");
    else { const r = await res.json(); errorMessage = r.error; showError = true; }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    goto("/");
  }
</script>

<Flex direction="vertical" gap="var(--flew-spacing-6)" style="padding: var(--flew-spacing-6); max-width: 420px; margin: 0 auto;">
  <Flex direction="vertical" gap="var(--flew-spacing-1)" align="center">
    <LogIn size={28} />
    <Heading depth={1} margin="none">Welcome</Heading>
    <Text color="secondary">Sign in or create an account</Text>
  </Flex>

  <Card variant="outlined" paddingSize="lg">
    <Tabs bind:value={tab} tabs={[
      { value: "login", label: "Sign In" },
      { value: "signup", label: "Sign Up" },
    ]}>
      {#if tab === "login"}
        <Form onSubmit={handleLogin}>
          <Input id="l-email" type="email" label="Email" placeholder="you@example.com" required validate={pipe(required(), email())} />
          <Input id="l-password" type="password" label="Password" placeholder="Enter password" required validate={pipe(required(), minLength(8))} />
          {#snippet actions()}
            <Button variant="primary" type="submit" fullWidth>Sign In</Button>
          {/snippet}
        </Form>
      {:else}
        <Form onSubmit={handleSignup}>
          <Input id="s-name" label="Full Name" placeholder="Jane Doe" required validate={required()} />
          <Input id="s-email" type="email" label="Email" placeholder="you@example.com" required validate={pipe(required(), email())} />
          <Input id="s-password" type="password" label="Password" placeholder="Create a password" required validate={pipe(required(), minLength(8))} />
          <Input id="s-password-repeat" type="password" label="Repeat Password" placeholder="Repeat your password" required validate={pipe(required(), matchesField("s-password", "Passwords must match"))} />
          {#snippet actions()}
            <Button variant="primary" type="submit" fullWidth>Create Account</Button>
          {/snippet}
        </Form>
      {/if}
    </Tabs>
  </Card>
</Flex>

<Modal bind:open={showError} title="Error" onClose={() => showError = false}>
  <Text color="error">{errorMessage}</Text>
  {#snippet footer()}
    <Button variant="primary" onclick={() => showError = false}>OK</Button>
  {/snippet}
</Modal>