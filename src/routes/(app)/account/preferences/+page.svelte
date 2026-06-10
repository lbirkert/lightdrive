<script lang="ts">
  import { mode, setMode } from "mode-watcher";
  import { Card, Flex, Heading, Text, Select } from "flewui";
</script>

<Flex direction="vertical" gap="var(--flew-spacing-6)" style="padding: var(--flew-spacing-6); max-width: 640px; margin: 0 auto;">
  <Heading depth={1}>Preferences</Heading>

  <Card variant="outlined" paddingSize="lg">
    <Flex direction="vertical" gap="var(--flew-spacing-4)">
      <Heading depth={3} margin="none">Theme</Heading>
      <Text size="sm" color="secondary">Choose how LightDrive looks. System follows your OS preference.</Text>

      <Select
        value={mode.current}
        onchange={(e) => setMode(e.currentTarget.value)}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]}
      />
    </Flex>
  </Card>
</Flex>
